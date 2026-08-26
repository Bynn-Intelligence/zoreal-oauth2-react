/**
 * The public types of @zoreal/oauth2-react.
 *
 * The authority for every shape here is zoreal/products/oauth2/05-react-sdk.md,
 * and the mapping to @react-oauth/google is one to one so a team already
 * integrated with Google ports by renaming. Where this file and that document
 * disagree, the document wins and this file has a bug.
 */

export type ErrorCode =
  | 'invalid_request'
  | 'access_denied'
  | 'unauthorized_client'
  | 'unsupported_response_type'
  | 'invalid_scope'
  | 'server_error'
  | 'temporarily_unavailable';

/** Failures that are not OAuth errors, because the flow never reached the provider. */
export type NonOAuthError = {
  type:
    | 'popup_failed_to_open'
    | 'popup_closed'
    | 'request_expired' // the pairing TTL elapsed, 02 section 1
    | 'request_denied' // the holder declined in the app
    | 'enrolment_abandoned' // 02 section 4
    | 'platform_unsupported' // iOS, until ZOREAL ID ships there
    | 'unknown';
  /** The provider's own reason string. Render it. Never substitute a friendlier guess. */
  description?: string;
};

/** How the holder reached this login. Analogous to Google's select_by. */
export type SelectBy = 'qr' | 'app_link' | 'device' | 'session';

/** 02 section 5. Describes what happened, never what was requested. */
export type AcrValue = 'zoreal.live' | 'zoreal.device' | 'zoreal.session';

export interface PairingState {
  status: 'pending' | 'claimed' | 'approved' | 'denied' | 'expired' | 'enrolling';
  /** Present while status is 'pending'. Seconds. */
  expiresIn?: number;
  /** Present while status is 'enrolling'. 02 section 4 extends the window to 30 minutes. */
  enrolmentDeadline?: number;
}

export interface ZorealLoginRequestOptions {
  /** Defaults to 'openid'. 03 section 2. Tier B scopes require flow: 'auth-code'. */
  scope?: string;
  /** Ask for a specific assurance. Omit to accept the default, zoreal.device. */
  acr_values?: AcrValue | AcrValue[];
  /** Seconds. Forces re-authentication when auth_time is older. */
  max_age?: number;
  prompt?: 'none' | 'login' | 'consent';
  /** Echoed back. Not a CSRF token: the SDK generates its own state and PKCE verifier. */
  app_state?: string;
  /**
   * 'auto' renders a QR on desktop and an app link on mobile, which is what you want.
   * 02 sections 2 and 3.
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
   * All four are neutral, by decision. 01 section 5: the button asserts nothing about a
   * person who has not yet authenticated. There is no 'verified_human' variant and there
   * will not be one.
   */
  text?: 'continue_with' | 'signin_with' | 'signup_with' | 'signin';
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
   * Added 2026-08-26: PKCE is mandatory for every client (docs/14 section 3),
   * and the verifier is generated here, so your server can only present it if
   * this hands it over. It travels to YOUR backend over TLS and nowhere else.
   */
  code_verifier: string;
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
  /** Must be registered. 04 section 1. */
  redirect_uri?: string;
  ux_mode?: 'popup' | 'redirect';
}

export type ZorealLoginProps = {
  onSuccess: (response: ZorealCredentialResponse) => void;
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
