import { useEffect, useRef } from 'react';
import { useZorealFlow } from './useZorealLogin';
import type { UseZorealAutoLoginOptions } from './types';

/**
 * Silent re-auth with prompt=none. NOT One Tap and never could be: there is no
 * ZOREAL session cookie in the browser to read, the credential is on a phone.
 * This succeeds only for a returning user at a consented sector with a live
 * session, the resulting acr is zoreal.session with an empty amr, and a
 * relying party that needs a live human must not build on this hook.
 *
 * PRIVACY NOTE: mounting this on a page sends a request to ZOREAL on page
 * load, before the user does anything. The hook is therefore conservative: it
 * fires once per mount, never retries, and does nothing when `disabled`.
 */
export function useZorealAutoLogin(options: UseZorealAutoLoginOptions): void {
  const { login } = useZorealFlow({
    flow: 'browser-direct',
    scope: options.scope,
    prompt: 'none',
    onCredential: options.onSuccess,
    onError: (e) => {
      // The provider's honest answer when no silent session exists (the
      // common case): unavailable, not an error, and never surfaced.
      const quiet = ['login_required', 'consent_required', 'interaction_required'];
      if (quiet.includes(e.error)) {
        options.onUnavailable?.();
      } else {
        options.onError?.({ type: 'unknown', description: e.description ?? e.error });
      }
    },
    onNonOAuthError: (e) => options.onError?.(e),
  });

  const fired = useRef(false);
  useEffect(() => {
    if (options.disabled || fired.current) return;
    fired.current = true;
    login();
  }, [options.disabled, login]);
}
