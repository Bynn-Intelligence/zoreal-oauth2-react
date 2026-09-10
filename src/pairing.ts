/**
 * The pairing channel, client side. wire.ts pins the endpoints.
 *
 * The browser polls; the phone never talks to the browser. Everything here is
 * therefore plain fetch against the issuer, CORS-gated on the client's
 * authorized origins, with the poll cadence fixed: the provider cancels an
 * over-polling request rather than throttling it, so a "retry
 * faster on error" strategy here would kill the login it is trying to save.
 */

import {
  DEFAULT_QR_REFRESH_SECONDS,
  POLL_INTERVAL_ENROLLING_MS,
  POLL_INTERVAL_MS,
  SDK_VERSION,
  WIRE_VERSION,
  type PairCreated,
  type PairDisplay,
  type PairStartResponse,
  type PairStatusResponse,
  type TokenResponse,
} from './wire';
import type { ErrorCode, NonOAuthError, PairingState } from './types';

export class OAuthFlowError extends Error {
  constructor(
    public error: ErrorCode,
    public description?: string
  ) {
    super(description ?? error);
  }
}

export class FlowAbandonedError extends Error {
  constructor(public reason: NonOAuthError) {
    super(reason.description ?? reason.type);
  }
}

export interface StartPairingParams {
  client_id: string;
  scope: string;
  state: string;
  nonce: string;
  code_challenge: string;
  redirect_uri?: string;
  acr_values?: string;
  max_age?: number;
  prompt?: string;
  locale?: string;
  /**
   * The surface this package is about to show, decided BEFORE the request:
   * the provider binds the pairing to it. "qr" gets animated frames, "link"
   * gets a start token on pair_url and no QR at all.
   */
  display?: PairDisplay;
}

async function parseJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function startPairing(
  issuer: string,
  params: StartPairingParams
): Promise<PairStartResponse> {
  const response = await fetch(`${issuer}/pair`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...params,
      code_challenge_method: 'S256',
      wire_version: WIRE_VERSION,
      sdk: `@zoreal/oauth2-react/${SDK_VERSION}`,
    }),
  });

  const body = await parseJson(response);
  if (!response.ok) {
    // The provider's words, verbatim. A refused package version arrives here,
    // and rewriting its reason would hide the only signal telling an integrator
    // to upgrade.
    throw new OAuthFlowError(
      (body.error as ErrorCode) ?? 'server_error',
      (body.error_description as string) ?? `The provider refused the request (${response.status})`
    );
  }
  return body as unknown as PairStartResponse;
}

/**
 * The QR refresh cadence for a pairing: the provider's, or the default when
 * it sent none (a provider that predates animated frames, or a legacy
 * pairing). Anything that is not a positive number is treated as absent
 * rather than trusted, because a zero here would spin.
 */
export function qrRefreshSecondsOf(started: PairCreated): number {
  const seconds = started.qr_refresh_seconds;
  return typeof seconds === 'number' && seconds > 0 ? seconds : DEFAULT_QR_REFRESH_SECONDS;
}

/**
 * The URL of the provider's current QR frame. The query is a cache-buster
 * and nothing more: the frame itself is chosen on the provider, this package
 * only asks for it again. A new value every call, so an <img> whose src is
 * set to it fetches rather than reusing what it showed last time.
 */
export function qrFrameUrl(issuer: string, requestId: string): string {
  return `${issuer}/pair/${encodeURIComponent(requestId)}/qr.svg?t=${Date.now()}`;
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    // An already-aborted signal never fires its abort event, so check first
    // or the sleep runs to term and the poll takes one extra swing.
    if (signal?.aborted) {
      reject(new DOMException('aborted', 'AbortError'));
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('aborted', 'AbortError'));
    };
    // Each sleep takes its listener back off when it finishes. One signal
    // lives for the whole login and is slept on once per poll and once per QR
    // frame, so listeners left behind pile up on it for as long as the
    // pairing is open: dozens per login, all of them dead.
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });

export interface PollOptions {
  /**
   * QR surface only. While the request is pending, hand `onState` a fresh
   * `qrUrl` every this many seconds, merged into the last state seen, so the
   * code on screen keeps up with the provider's moving frame. Omit on the app
   * link: a link pairing has no QR and the provider answers 404 for it.
   */
  qrRefreshSeconds?: number;
}

/**
 * Polls until the request resolves. Returns the authorization code.
 * Throws FlowAbandonedError for the human outcomes (denied, expired,
 * enrolment abandoned) and OAuthFlowError for protocol ones.
 *
 * With `qrRefreshSeconds` set it also drives the QR animation: between polls
 * it re-issues `qrUrl` on that cadence, through the same `onState`, for as
 * long as the request is pending. The frames stop the moment the status
 * leaves pending (the QR is spent once the phone has claimed it) and when the
 * poll is aborted, so a cancelled login never keeps fetching an image.
 */
export async function pollUntilApproved(
  issuer: string,
  requestId: string,
  onState?: (state: PairingState) => void,
  signal?: AbortSignal,
  options: PollOptions = {}
): Promise<string> {
  let last: PairingState = { status: 'pending' };
  const emit = (state: PairingState) => {
    last = state;
    onState?.(state);
  };

  // The frame loop is a setTimeout chain armed from the clock after each
  // frame, never a setInterval: a background tab throttles timers, and an
  // interval that wakes late fires its missed ticks in a burst, which here
  // would be a burst of image fetches for frames the provider has already
  // moved past. Waking late costs one frame's delay, then the cadence resumes
  // from now. The provider always renders the current frame regardless.
  let frames: AbortController | null = null;
  const stopFrames = () => {
    frames?.abort();
    frames = null;
  };
  const startFrames = () => {
    const seconds = options.qrRefreshSeconds;
    if (frames || signal?.aborted || typeof seconds !== 'number' || !(seconds > 0)) return;
    const period = seconds * 1000;
    const controller = new AbortController();
    frames = controller;
    // The caller's abort reaches the frames too, and the listener goes away
    // with them so a long-lived signal does not accumulate one per pairing.
    signal?.addEventListener('abort', stopFrames, { signal: controller.signal });
    void (async () => {
      let due = Date.now() + period;
      for (;;) {
        await sleep(Math.max(0, due - Date.now()), controller.signal);
        emit({ ...last, qrUrl: qrFrameUrl(issuer, requestId) });
        due = Date.now() + period;
      }
    })().catch(() => {
      // Aborted: the frames stopped with the pairing. Nothing to report.
    });
  };

  try {
    for (;;) {
      const response = await fetch(`${issuer}/pair/${encodeURIComponent(requestId)}/status`, {
        signal,
      });
      const body = (await parseJson(response)) as unknown as PairStatusResponse;

      if (!response.ok) {
        throw new OAuthFlowError(
          (body.error as ErrorCode) ?? 'server_error',
          body.error_description ?? `Pairing status failed (${response.status})`
        );
      }

      emit({
        status: body.status,
        expiresIn: body.expires_in,
        enrolmentDeadline: body.enrolment_deadline,
      });

      // Frames run only while the code is still the thing on screen. Once the
      // phone has claimed it the image is spent, and a frame issued after that
      // would only replace the spent code with a different spent code.
      if (body.status === 'pending') startFrames();
      else stopFrames();

      switch (body.status) {
        case 'approved':
          if (!body.code) {
            throw new OAuthFlowError('server_error', 'approved with no authorization code');
          }
          return body.code;
        case 'denied':
          throw new FlowAbandonedError({ type: 'request_denied', description: body.error_description });
        case 'expired':
          throw new FlowAbandonedError({ type: 'request_expired', description: body.error_description });
        case 'cancelled':
          // The provider cancels an over-polled or abandoned request outright
          // (its pairing rows have a real cancelled state). Before 0.1.4 this
          // fell through to the default branch and polled a dead request
          // forever.
          throw new FlowAbandonedError({
            type: 'request_expired',
            description: body.error_description ?? 'the provider cancelled the pairing request',
          });
        case 'enrolling':
          await sleep(POLL_INTERVAL_ENROLLING_MS, signal);
          break;
        default:
          await sleep(POLL_INTERVAL_MS, signal);
      }
    }
  } finally {
    stopFrames();
  }
}

/**
 * The code exchange, browser-direct mode only: a public client, PKCE and no
 * secret. What comes back can only ever be the pseudonymous tier, by
 * construction rather than by rule: personal data lives at /userinfo behind an
 * access token this mode is never issued, because personal-data scopes are
 * refused for public clients at the pairing step.
 */
export async function exchangeCode(
  issuer: string,
  input: { code: string; code_verifier: string; client_id: string }
): Promise<TokenResponse> {
  const response = await fetch(`${issuer}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: input.code,
      code_verifier: input.code_verifier,
      client_id: input.client_id,
    }),
  });

  const body = (await parseJson(response)) as unknown as TokenResponse;
  if (!response.ok || body.error) {
    throw new OAuthFlowError(
      (body.error as ErrorCode) ?? 'server_error',
      body.error_description ?? `Token exchange failed (${response.status})`
    );
  }
  return body;
}

/** A mobile user agent gets the app link, not a QR of its own screen. */
export function isMobileUserAgent(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Which surface this login will use, from the caller's preference and the
 * user agent. Decided before the pairing is created, never after: the
 * provider binds the pairing to the surface it is told about, and the two
 * surfaces are claimed differently, so asking for one and showing the other
 * produces a code the phone is right to refuse.
 */
export function resolveDisplay(display?: 'auto' | 'qr' | 'link'): PairDisplay {
  if (display === 'link') return 'link';
  if (display === 'qr') return 'qr';
  return isMobileUserAgent() ? 'link' : 'qr';
}
