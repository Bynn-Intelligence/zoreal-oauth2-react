/**
 * The public types of @zoreal/oauth2-react.
 *
 * The API mirrors @react-oauth/google one to one, renamed, so a team already
 * integrated with Google ports by renaming their imports.
 */

export type ErrorCode =
  | 'invalid_request'
  | 'access_denied'
  | 'unauthorized_client'
  | 'unsupported_response_type'
  | 'invalid_scope'
  | 'server_error'
  | 'temporarily_unavailable'
  // The OIDC interaction errors. prompt=none answers with these when no
  // silent session exists, which is the expected quiet outcome for
  // useZorealAutoLogin, not a failure.
  | 'login_required'
  | 'consent_required'
  | 'interaction_required';

/** Failures that are not OAuth errors, because the flow never reached the provider. */
export type NonOAuthError = {
  type:
    | 'popup_failed_to_open'
    | 'popup_closed'
    | 'request_expired' // the pairing request timed out before approval
    | 'request_denied' // the holder declined in the app
    | 'enrolment_abandoned' // the user started enrolling and did not finish
    | 'platform_unsupported' // iOS, until ZOREAL ID ships there
    | 'unknown';
  /** The provider's own reason string. Render it. Never substitute a friendlier guess. */
  description?: string;
};

/** How the holder reached this login. Analogous to Google's select_by. */
export type SelectBy = 'qr' | 'app_link' | 'device' | 'session';

/**
 * How the login was actually authenticated. Describes what happened, never
 * what was requested: 'zoreal.live' means a fresh liveness capture was passed
 * for this login. As acr_values it is a request; only the signed acr claim in
 * the ID token confirms it, so verify that claim on your backend.
 */
export type AcrValue = 'zoreal.live' | 'zoreal.device' | 'zoreal.session';

export interface PairingState {
  status: 'pending' | 'claimed' | 'approved' | 'denied' | 'expired' | 'cancelled' | 'enrolling';
  /** Present while status is 'pending'. Seconds. */
  expiresIn?: number;
  /** Present while status is 'enrolling'. Enrolment extends the window well beyond a normal login. */
  enrolmentDeadline?: number;
  /**
   * The pairing link and its provider-served QR image. Added in 0.1.4, from the
   * first real integration: `ZorealLogin` renders the QR itself, but it is
   * browser-direct only, so an auth-code integration has to render its own
   * pairing UI — and this callback was the documented place to do that while
   * carrying nothing to render. Present on every callback of a QR/link flow.
   */
  pairUrl?: string;
  /** The provider-served SVG of pairUrl. Put it in an <img>; do not draw your own. */
  qrUrl?: string;
  /** True when the flow resolved to the app link (mobile) rather than a QR. */
  appLink?: boolean;
  /** Abandons this pairing: stops the poll. Wire it to your UI's cancel control. */
  cancel?: () => void;
}

export interface ZorealLoginRequestOptions {
  /** Defaults to 'openid'. Scopes that return personal data require flow: 'auth-code'. */
  scope?: string;
  /**
   * Ask for a specific assurance. 'zoreal.live' requires a fresh liveness
   * capture in the ZOREAL ID app before the login can complete. Advisory:
   * your backend must verify the signed acr claim in the ID token. Omit to
   * accept the default, zoreal.device.
   */
  acr_values?: AcrValue | AcrValue[];
  /** Seconds. Forces re-authentication when auth_time is older. */
  max_age?: number;
  prompt?: 'none' | 'login' | 'consent';
  /** Echoed back. Not a CSRF token: the SDK generates its own state and PKCE verifier. */
  app_state?: string;
  /**
   * 'auto' renders a QR on desktop and an app link on mobile, which is what you want.
   */
  display?: 'auto' | 'qr' | 'link';
  /** Called on each pairing state change. Drive your own UI from this if you render one. */
  onPairingStateChange?: (state: PairingState) => void;
}

export interface ZorealButtonConfiguration {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  /**
   * All five are neutral. The button asserts nothing about a person who has
   * not yet authenticated; there is no 'verified_human' variant. 'verify_with'
   * stays inside that rule: it names the act the button starts, not a state
   * the person already holds — built for surfaces where the login IS a check
   * (ZOREAL Meet's presence request), not a sign-in.
   */
  text?: 'continue_with' | 'signin_with' | 'signup_with' | 'signin' | 'verify_with';
  shape?: 'rectangular' | 'pill' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: string | number;
  click_listener?: () => void;
}

export interface ZorealCredentialResponse {
  /** The ID token. Verify it server-side against the JWKS before trusting it. */
  credential: string;
  clientId: string;
  select_by: SelectBy;
  /** Convenience, parsed from the token. The token stays the authority. */
  acr: AcrValue;
}

export interface ZorealCodeResponse {
  code: string;
  scope: string;
  app_state?: string;
  /**
   * The PKCE verifier for this code. Post it to your backend with the code;
   * the backend sends both to /token along with its client authentication.
   * PKCE is mandatory for every client, and the verifier is generated here, so
   * your server can only complete the exchange if this hands it over. It travels
   * to YOUR backend over TLS and nowhere else.
   */
  code_verifier: string;
  /**
   * The nonce the SDK generated for this flow. Added in 0.1.4: the ID token
   * carries it, the SDK generated it, and without handing it over the backend
   * doing the exchange has no way to check the token it receives was minted for
   * this login rather than substituted. Verify it against the ID token's nonce
   * claim, alongside iss, aud and exp. Same travel rule as code_verifier.
   */
  nonce: string;
}

export interface BrowserDirectFlowOptions extends ZorealLoginRequestOptions {
  onSuccess?: (response: ZorealCredentialResponse) => void;
  onError?: (error: Pick<NonOAuthError, 'description'> & { error: ErrorCode }) => void;
  onNonOAuthError?: (error: NonOAuthError) => void;
}

export interface AuthCodeFlowOptions extends ZorealLoginRequestOptions {
  onSuccess?: (response: ZorealCodeResponse) => void;
  onError?: (error: Pick<NonOAuthError, 'description'> & { error: ErrorCode }) => void;
  onNonOAuthError?: (error: NonOAuthError) => void;
  /** Must be registered for this client in the ZOREAL dashboard. */
  redirect_uri?: string;
  ux_mode?: 'popup' | 'redirect';
}

/**
 * The button runs either flow, discriminated on `flow` exactly as
 * useZorealLogin is: browser-direct (the default) hands onSuccess an ID
 * token; auth-code hands it the code, PKCE verifier and nonce for YOUR
 * backend to redeem. Added in 0.2.8 — before that the button was
 * browser-direct only and auth-code integrations had to rebuild the button
 * around the hook to get the same pixels.
 */
export type ZorealLoginProps = (
  | { flow?: 'browser-direct'; onSuccess: (response: ZorealCredentialResponse) => void }
  | { flow: 'auth-code'; onSuccess: (response: ZorealCodeResponse) => void }
) & {
  onError?: (error: NonOAuthError) => void;
  containerProps?: React.ComponentPropsWithoutRef<'div'>;
} & ZorealLoginRequestOptions &
  ZorealButtonConfiguration;

export interface UseZorealAutoLoginOptions {
  onSuccess: (response: ZorealCredentialResponse) => void;
  /**
   * Called when no silent session was available, which is the common case for a
   * first-time or non-returning visitor. This is not an error condition and
   * should not be surfaced.
   */
  onUnavailable?: () => void;
  onError?: (error: NonOAuthError) => void;
  disabled?: boolean;
  scope?: string;
}

/**
 * Colour scheme for the SDK-rendered pairing modal. 'auto' follows the
 * viewer's OS setting; the explicit values are for hosts that theme
 * independently of it.
 */
export type ZorealTheme = 'auto' | 'light' | 'dark';

/**
 * Who draws the QR while a pairing is open.
 *
 * 'modal' (the default) means the SDK does, in its own dialog: the flow cannot
 * complete unless something renders the pair URL, and leaving that to every
 * integrator is how a QR sign-in ships with no QR on screen.
 *
 * 'none' opts out entirely and hands the job back to you via
 * `onPairingStateChange`, which carries `qrUrl`, `pairUrl` and `cancel`.
 */
export type PairingUI = 'modal' | 'none';
