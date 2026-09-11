import { useCallback, useEffect, useRef, useState } from 'react';
import { useZorealOAuth, useZorealPairingHost } from './context';
import { resolveIntent } from './intent';
import { unsafeClaims } from './jwt';
import {
  FlowAbandonedError,
  OAuthFlowError,
  exchangeCode,
  pollUntilApproved,
  qrRefreshSecondsOf,
  resolveDisplay,
  startPairing,
} from './pairing';
import { challengeS256, generateState, generateVerifier } from './pkce';
import type {
  AcrValue,
  AuthCodeFlowOptions,
  BrowserDirectFlowOptions,
  ErrorCode,
  NonOAuthError,
  PairingState,
  SelectBy,
  ZorealCodeResponse,
  ZorealCredentialResponse,
  ZorealLoginRequestOptions,
} from './types';

export interface ActivePairing {
  requestId: string;
  pairUrl: string;
  /**
   * The QR image to show right now. It MOVES: a QR pairing's code is a frame
   * the provider rotates every few seconds, so read this from the latest
   * state rather than holding the first value.
   */
  qrUrl: string;
  state: PairingState;
  /** True when display resolved to the app link rather than the QR. */
  appLink: boolean;
  cancel: () => void;
}

interface FlowInternals {
  /** Non-null while a pairing is on screen. ZorealLogin renders from this. */
  pairing: ActivePairing | null;
}

/**
 * The internal option shape: one flow discriminator, one success callback per
 * mode. The public API keeps Google's single overloaded onSuccess; this type
 * exists because an intersection of those two signatures is uninhabitable, and
 * the mapping from public to internal happens once, in useZorealLogin.
 */
export interface InternalFlowOptions extends ZorealLoginRequestOptions {
  flow: 'browser-direct' | 'auth-code';
  redirect_uri?: string;
  onCredential?: (response: ZorealCredentialResponse) => void;
  onCode?: (response: ZorealCodeResponse) => void;
  onError?: (error: Pick<NonOAuthError, 'description'> & { error: ErrorCode }) => void;
  onNonOAuthError?: (error: NonOAuthError) => void;
}

/**
 * The one flow, shared by the hook and the button. Starts a pairing, exposes
 * it for rendering, polls, and finishes per mode: browser-direct exchanges the
 * code here (public client, PKCE, no secret) and hands over an ID token;
 * auth-code hands the code and the PKCE verifier to the caller, whose backend
 * does the exchange with its client authentication.
 */
export function useZorealFlow(options: InternalFlowOptions): {
  login: () => void;
  internals: FlowInternals;
} {
  const { clientId, issuer, locale } = useZorealOAuth();
  const [pairing, setPairing] = useState<ActivePairing | null>(null);
  // Null when the provider is set to pairingUI: 'none', which is the caller
  // saying they render the QR themselves. Held in a ref so `login` keeps its
  // identity across renders.
  const publish = useZorealPairingHost();
  const publishRef = useRef(publish);
  publishRef.current = publish;
  const abortRef = useRef<AbortController | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // A component unmounting mid-login must stop the poll: the provider cancels
  // over-polled requests, and an orphaned interval is exactly how one happens.
  useEffect(
    () => () => {
      abortRef.current?.abort();
      publishRef.current?.(null);
    },
    []
  );

  const login = useCallback(() => {
    const opts = optionsRef.current;
    const run = async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const flow = opts.flow;
      const verifier = generateVerifier();
      const state = generateState();
      const nonce = generateState();

      // Which surface this login will use is decided HERE, before the pairing
      // exists, because the provider binds the pairing to it: a QR pairing
      // gets a rotating code, a link pairing gets a start token on its URL and
      // no QR at all. Deciding afterwards would mean asking for one surface
      // and showing another.
      const display = resolveDisplay(opts.display);
      const useAppLink = display === 'link';
      const intent = resolveIntent(opts.intent, opts.scope, opts.acr_values);

      try {
        // Same device: the dialog opens on the tap, before the provider has
        // answered, so the light runs while the sign-in is created and the
        // person is never looking at nothing.
        if (useAppLink) {
          const cancel = () => {
            controller.abort();
            publishRef.current?.(null);
          };
          publishRef.current?.({
            state: { status: 'pending', appLink: true, intent, cancel },
            qrUrl: '',
            intent,
            cancel,
          });
        }

        const started = await startPairing(issuer, {
          client_id: clientId,
          scope: opts.scope ?? 'openid',
          state,
          nonce,
          code_challenge: await challengeS256(verifier),
          redirect_uri: flow === 'auth-code' ? opts.redirect_uri : undefined,
          acr_values: Array.isArray(opts.acr_values)
            ? opts.acr_values.join(' ')
            : opts.acr_values,
          max_age: opts.max_age,
          prompt: opts.prompt,
          locale,
          display,
        });

        let code: string;
        let selectBy: SelectBy = 'device';

        if ('code' in started) {
          // prompt=none resolved silently: consented sector, live session.
          code = started.code;
          selectBy = 'session';
        } else {
          selectBy = useAppLink ? 'app_link' : 'qr';
          const qrRefreshSeconds = qrRefreshSecondsOf(started);

          const cancel = () => {
            controller.abort();
            setPairing(null);
            publishRef.current?.(null);
          };
          // Everything a caller-rendered pairing UI needs, on every state it
          // sees: the QR flow cannot complete unless SOMETHING renders
          // pairUrl, and for the auth-code flow that something is the caller.
          // qrUrl is deliberately NOT in here: it is the one field that
          // changes during the pairing, and a fixed copy spread over every
          // state would paste the first frame back on top of the current one.
          const surface = {
            pairUrl: started.pair_url,
            appLink: useAppLink,
            intent,
            cancel,
            // The app link has no QR and therefore no cadence to report.
            ...(useAppLink ? null : { qrRefreshSeconds }),
          };
          // The frame on screen. The poll replaces it every qrRefreshSeconds;
          // everything published in between reuses whatever is current, so the
          // three channels below never disagree about which code is showing.
          let qrUrl = `${issuer}/pair/${encodeURIComponent(started.request_id)}/qr.svg`;
          const active: ActivePairing = {
            requestId: started.request_id,
            pairUrl: surface.pairUrl,
            qrUrl,
            state: { status: 'pending', expiresIn: started.expires_in, qrUrl, ...surface },
            appLink: useAppLink,
            cancel,
          };
          setPairing(active);
          publishRef.current?.({ state: active.state, qrUrl, intent, cancel });
          // The initial state, immediately: the first poll response is one
          // round-trip away, and a UI that waits for it opens visibly empty.
          opts.onPairingStateChange?.(active.state);

          // The same-device link is never navigated to from here. A browser
          // hands a link to an app only from a tap, not from a script running
          // after a network round trip, so a navigation here lands on the web
          // page instead and takes the polling tab with it. The dialog's
          // control is that tap; a caller rendering their own UI gets pairUrl
          // on every state for the same purpose.

          code = await pollUntilApproved(
            issuer,
            started.request_id,
            (s) => {
              // A refresh arrives as a state carrying a new qrUrl; a poll
              // arrives without one and keeps the frame already showing.
              if (s.qrUrl) qrUrl = s.qrUrl;
              const enriched = { ...s, ...surface, qrUrl };
              setPairing((p) =>
                p && p.requestId === started.request_id ? { ...p, qrUrl, state: enriched } : p
              );
              publishRef.current?.({ state: enriched, qrUrl, intent, cancel });
              opts.onPairingStateChange?.(enriched);
            },
            controller.signal,
            // The app link has no QR to animate, and the provider answers 404
            // for one, so the frames are asked for only on the QR surface.
            { qrRefreshSeconds: useAppLink ? undefined : qrRefreshSeconds }
          );
        }

        setPairing(null);
        publishRef.current?.(null);

        if (flow === 'auth-code') {
          opts.onCode?.({
            code,
            scope: opts.scope ?? 'openid',
            app_state: opts.app_state,
            code_verifier: verifier,
            nonce,
          });
          return;
        }

        const tokens = await exchangeCode(issuer, {
          code,
          code_verifier: verifier,
          client_id: clientId,
        });
        const claims = unsafeClaims(tokens.id_token);
        const response: ZorealCredentialResponse = {
          credential: tokens.id_token,
          clientId,
          select_by: selectBy,
          acr: (claims.acr as AcrValue) ?? 'zoreal.device',
        };
        opts.onCredential?.(response);
      } catch (e) {
        setPairing(null);
        publishRef.current?.(null);
        if (e instanceof DOMException && e.name === 'AbortError') return;
        if (e instanceof FlowAbandonedError) {
          opts.onNonOAuthError?.(e.reason);
          return;
        }
        if (e instanceof OAuthFlowError) {
          opts.onError?.({ error: e.error, description: e.description });
          return;
        }
        opts.onNonOAuthError?.({
          type: 'unknown',
          description: e instanceof Error ? e.message : String(e),
        });
      }
    };
    void run();
  }, [clientId, issuer, locale]);

  return { login, internals: { pairing } };
}

export function useZorealLogin(
  options: { flow?: 'browser-direct' } & BrowserDirectFlowOptions
): () => void;
export function useZorealLogin(options: { flow: 'auth-code' } & AuthCodeFlowOptions): () => void;
export function useZorealLogin(
  options: ({ flow?: 'browser-direct' | 'auth-code' } & ZorealLoginRequestOptions) &
    Partial<Pick<AuthCodeFlowOptions, 'redirect_uri' | 'ux_mode'>> & {
      onSuccess?: (response: never) => void;
      onError?: (error: Pick<NonOAuthError, 'description'> & { error: ErrorCode }) => void;
      onNonOAuthError?: (error: NonOAuthError) => void;
    }
): () => void {
  if (options.ux_mode === 'redirect') {
    // v1 supports the popup shape only: the code and PKCE verifier go to your
    // onSuccess and from there to your backend over TLS. A redirect would have
    // to carry the verifier in a URL, which is a credential in every access
    // log on the path. Refused loudly rather than implemented badly.
    throw new Error(
      "@zoreal/oauth2-react: ux_mode 'redirect' is not supported in v1. Use the default " +
        "'popup' shape and post the code and code_verifier from onSuccess to your backend."
    );
  }
  const flow = options.flow ?? 'browser-direct';
  return useZorealFlow({
    ...options,
    flow,
    onCredential:
      flow === 'browser-direct'
        ? (options.onSuccess as unknown as (r: ZorealCredentialResponse) => void)
        : undefined,
    onCode:
      flow === 'auth-code'
        ? (options.onSuccess as unknown as (r: ZorealCodeResponse) => void)
        : undefined,
  }).login;
}
