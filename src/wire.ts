/**
 * The wire protocol between this package and the ZOREAL OpenID Provider.
 *
 * VERSIONED: a shipped version keeps working until the provider explicitly
 * refuses it, and when it does, the reason is surfaced verbatim. Both the wire
 * version and the package version travel on every pairing request so a refusal
 * can be precise.
 *
 * Endpoints, all relative to the issuer and all CORS-gated on the client's
 * authorized JavaScript origins (the dashboard):
 *
 *   POST /pair                     start a pairing request. Body carries the
 *                                  authorize parameters, the PKCE challenge and
 *                                  `display`: "qr" or "link", the surface this
 *                                  package is about to show, decided before the
 *                                  request. Returns { request_id, pair_url,
 *                                  expires_in, display, qr_refresh_seconds } or,
 *                                  for prompt=none with a live consented
 *                                  session, { code } immediately. The provider
 *                                  binds the pairing to the display it echoes
 *                                  back. A "link" pairing's pair_url carries a
 *                                  start token (`?t=<start_token>`) that only
 *                                  the browser it was handed to can claim with,
 *                                  and the provider renders no QR for it, so
 *                                  nobody can turn a same-device link into a
 *                                  code that gets scanned elsewhere. A request
 *                                  with no `display` gets the older static
 *                                  behaviour ("legacy").
 *   GET  /pair/:id/status          poll: pending | claimed |
 *                                  approved (with code) | denied | expired |
 *                                  enrolling. Over-polling cancels the request
 *                                  rather than throttling it, so the cadence
 *                                  below is not a suggestion.
 *   GET  /pair/:id/qr.svg          the QR image, rendered by the provider so
 *                                  the pairing surface stays changeable at
 *                                  runtime and this package keeps zero
 *                                  dependencies: it generates nothing. For a
 *                                  "qr" pairing the image is the CURRENT FRAME,
 *                                  served `Cache-Control: no-store`: a QR of
 *                                  `<pair_url>?f=<time>.<hmac>`, where `time`
 *                                  is whole seconds since the pairing was
 *                                  created on the provider's clock and `hmac`
 *                                  is a truncated HMAC-SHA-256 of that time
 *                                  under a per-pairing secret that never leaves
 *                                  the provider. The frame moves every
 *                                  qr_refresh_seconds and the provider refuses a
 *                                  stale one at claim, so a screenshot of the
 *                                  code is dead on arrival and only a live view
 *                                  of the screen can be relayed. This package
 *                                  re-fetches the image on that cadence with a
 *                                  cache-busting `?t=<Date.now()>` and swaps it
 *                                  in once loaded. 404 once the pairing has left
 *                                  pending, and always for a "link" pairing.
 *   POST /token                    the code exchange. Browser-direct mode uses
 *                                  it directly with PKCE and no client secret;
 *                                  auth-code mode leaves it to the RP backend.
 */

export const WIRE_VERSION = 1;
export const SDK_VERSION = '0.2.16';
export const DEFAULT_ISSUER = 'https://id.zoreal.com';

/** Pending TTL is short. Poll gently; over-polling cancels the request. */
export const POLL_INTERVAL_MS = 2000;
/** Enrolling extends the window well beyond a normal login; poll slower. */
export const POLL_INTERVAL_ENROLLING_MS = 5000;
/**
 * How often the QR frame is re-fetched when the provider did not say. The
 * provider's `qr_refresh_seconds` wins whenever it is present; this is the
 * floor for an older provider that predates animated frames, where refreshing
 * a static code is merely redundant.
 */
export const DEFAULT_QR_REFRESH_SECONDS = 3;

export type PairDisplay = 'qr' | 'link';

export interface PairCreated {
  request_id: string;
  /**
   * The pairing page: https://zoreal.com/login/<request_id>. The same URL is
   * what the QR encodes and what the app link opens. For a "link" pairing it
   * also carries `?t=<start_token>`, and this package navigates to it verbatim.
   */
  pair_url: string;
  expires_in: number;
  /**
   * The surface the provider bound the pairing to, echoed from the request.
   * "legacy" is a provider that got no `display` and kept the static QR.
   * Absent from a provider that predates the field.
   */
  display?: PairDisplay | 'legacy';
  /**
   * QR pairings only: how often, in seconds, to re-fetch the QR image so the
   * code on screen is the provider's current frame. DEFAULT_QR_REFRESH_SECONDS
   * applies when absent.
   */
  qr_refresh_seconds?: number;
}

export interface PairImmediate {
  /** prompt=none resolved silently: consented sector, live session. */
  code: string;
}

export type PairStartResponse = PairCreated | PairImmediate;

export interface PairStatusResponse {
  status: 'pending' | 'claimed' | 'approved' | 'denied' | 'expired' | 'cancelled' | 'enrolling';
  code?: string;
  expires_in?: number;
  enrolment_deadline?: number;
  /**
   * The provider's reason on denial or refusal. Surfaced verbatim, never
   * rewritten. A pairing the provider denied because the approving phone was
   * in a different country from the browser arrives here as `access_denied`
   * with the provider's own sentence in error_description.
   */
  error?: string;
  error_description?: string;
}

export interface TokenResponse {
  id_token: string;
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}
