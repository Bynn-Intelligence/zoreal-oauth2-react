import { useMemo, type CSSProperties } from 'react';
import { useZorealFlow } from './useZorealLogin';
import { ZorealMark } from './mark';
import type { NonOAuthError, ZorealLoginProps } from './types';

/**
 * The drop-in button. It receives no access token, so it returns the
 * pseudonymous identity only; personal data needs the auth-code flow.
 *
 * The copy is neutral: the button asserts nothing about a person who has not
 * yet authenticated. Styling is inline and self-contained; no stylesheet, no
 * font, no external asset, because this renders on a sign-in page.
 *
 * The QR itself is no longer drawn here. `ZorealOAuthProvider` renders the
 * pairing modal for every flow, so the button and `useZorealLogin` get the
 * same dialog and it only had to be designed, translated and made accessible
 * once. Opt out with `pairingUI="none"` on the provider.
 */

const TEXTS: Record<NonNullable<ZorealLoginProps['text']>, string> = {
  continue_with: 'Continue with ZOREAL',
  signin_with: 'Sign in with ZOREAL',
  signup_with: 'Sign up with ZOREAL',
  signin: 'Sign in',
};

const SIZES = {
  large: { height: 44, font: 15, pad: 20 },
  medium: { height: 38, font: 14, pad: 16 },
  small: { height: 32, font: 12, pad: 12 },
} as const;

export function ZorealLogin(props: ZorealLoginProps) {
  const {
    onSuccess,
    onError,
    containerProps,
    type = 'standard',
    theme = 'filled',
    size = 'large',
    text = 'continue_with',
    shape = 'rectangular',
    logo_alignment = 'left',
    width,
    click_listener,
    ...request
  } = props;

  const { login } = useZorealFlow({
    ...request,
    flow: 'browser-direct',
    onCredential: onSuccess,
    onError: (e) => onError?.({ type: 'unknown', description: e.description ?? e.error }),
    onNonOAuthError: (e: NonOAuthError) => onError?.(e),
  });

  const s = SIZES[size];
  const style: CSSProperties = useMemo(
    () => ({
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: logo_alignment === 'center' ? 'center' : 'flex-start',
      gap: 10,
      height: s.height,
      padding: `0 ${s.pad}px`,
      width,
      fontSize: s.font,
      fontFamily: 'inherit',
      fontWeight: 500,
      cursor: 'pointer',
      borderRadius: shape === 'pill' ? s.height / 2 : shape === 'square' ? 4 : 8,
      ...(theme === 'outline'
        ? { background: 'transparent', color: 'inherit', border: '1px solid rgba(128,128,128,0.5)' }
        : theme === 'filled_black'
          ? { background: '#111', color: '#fff', border: '1px solid #111' }
          : { background: '#00b4d9', color: '#fff', border: '1px solid #00b4d9' }),
    }),
    [logo_alignment, s, shape, theme, width]
  );

  return (
    <div {...containerProps}>
      <button
        type="button"
        style={style}
        onClick={() => {
          click_listener?.();
          login();
        }}
      >
        <ZorealMark size={Math.round(s.font * 1.25)} />
        {type === 'standard' && TEXTS[text]}
      </button>
    </div>
  );
}
