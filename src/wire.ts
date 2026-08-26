/**
 * The wire protocol between this package and the ZOREAL OpenID Provider.
 *
 * VERSIONED, because the package is self-contained by decision (01 section 4):
 * a shipped version keeps working until the provider explicitly refuses it,
 * and the provider CAN refuse it, with a reason this package surfaces verbatim
 * (06 section 2: the compensating control for the npm supply chain). Both the
 * wire version and the package version travel on every pairing request so the
 * refusal can be precise.
 *
 * Endpoints, all relative to the issuer and all CORS-gated on the client's
 * authorized JavaScript origins (04 section 1.1):
 *
 *   POST /pair                     start a pairing request. Body carries the
 *                                  authorize parameters plus PKCE challenge.
 *                                  Returns { request_id, pair_url, expires_in }
 *                                  or, for prompt=none with a live consented
 *                                  session, { code } immediately.
 *   GET  /pair/:id/status          poll. 02 section 1: pending | claimed |
 *                                  approved (with code) | denied | expired |
 *                                  enrolling. Over-polling cancels the request
 *                                  rather than throttling it, so the cadence
 *                                  below is not a suggestion.
 *   GET  /pair/:id/qr.svg          the QR image for the pairing URL, served by
 *                                  the provider so the pairing surface stays
 *                                  changeable at runtime (01 section 4) and
 *                                  this package keeps zero dependencies.
 *   POST /token                    the code exchange. Browser-direct mode uses
 *                                  it directly with PKCE and no client secret;
 *                                  auth-code mode leaves it to the RP backend.
 */

export const WIRE_VERSION = 1;
export const SDK_VERSION = '0.1.0';
export const DEFAULT_ISSUER = 'https://id.zoreal.com';

/** 02 section 1: pending TTL 120s. Poll gently; over-polling cancels. */
export const POLL_INTERVAL_MS = 2000;
/** 02 section 4: enrolling extends the window to 30 minutes; poll slower. */
export const POLL_INTERVAL_ENROLLING_MS = 5000;

export interface PairCreated {
  request_id: string;
  /** https://zoreal.com/qr/<request_id>. The same URL in QR and app link. */
  pair_url: string;
  expires_in: number;
}

export interface PairImmediate {
  /** prompt=none resolved silently: consented sector, live session. */
  code: string;
}

export type PairStartResponse = PairCreated | PairImmediate;

export interface PairStatusResponse {
  status: 'pending' | 'claimed' | 'approved' | 'denied' | 'expired' | 'enrolling';
  code?: string;
  expires_in?: number;
  enrolment_deadline?: number;
  /** The provider's reason on denial or refusal. Surfaced verbatim, never rewritten. */
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
