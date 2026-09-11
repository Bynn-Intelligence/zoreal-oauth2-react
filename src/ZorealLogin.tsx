import { useMemo, useState, type CSSProperties } from 'react';
import { useZorealOAuth } from './context';
import { strings } from './i18n';
import { useZorealFlow } from './useZorealLogin';
import { ZorealMark } from './mark';
import { ZorealBusyRing } from './ring';
import type {
  NonOAuthError,
  ZorealCodeResponse,
  ZorealCredentialResponse,
  ZorealLoginProps,
} from './types';

/**
 * The drop-in button. In its default browser-direct flow it receives no
 * access token, so it returns the pseudonymous identity only; personal data
 * needs `flow: 'auth-code'`, which hands your backend the code instead
 * (supported here since 0.2.8, same discriminator as useZorealLogin).
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

// The default label is translated with the modal's own copy; the four
// alternatives are English, as they were.
const TEXTS: Record<NonNullable<ZorealLoginProps['text']>, string | null> = {
  continue_with: null,
  signin_with: 'Sign in with ZOREAL',
  signup_with: 'Sign up with ZOREAL',
  signin: 'Sign in',
  verify_with: 'Verify with ZOREAL ID',
};

/* The house button: 14px medium text, a 22px mark, 12px between them, 14px
   above and below, 20px at the sides, 12px corners. The smaller sizes scale
   that down; they do not change its proportions. */
const SIZES = {
  large: { height: 50, font: 14, pad: 20, mark: 22, gap: 12, radius: 12 },
  medium: { height: 42, font: 14, pad: 16, mark: 20, gap: 10, radius: 10 },
  small: { height: 34, font: 12, pad: 12, mark: 16, gap: 8, radius: 8 },
} as const;

export function ZorealLogin(props: ZorealLoginProps) {
  const {
    onSuccess,
    onError,
    containerProps,
    type = 'standard',
    theme = 'outline',
    size = 'large',
    text = 'continue_with',
    shape = 'rectangular',
    logo_alignment = 'center',
    width,
    click_listener,
    flow = 'browser-direct',
    ...request
  } = props;

  const { locale } = useZorealOAuth();
  const label = TEXTS[text] ?? strings(locale).buttonContinue;

  // Busy from the tap until the flow ends. On a phone the tap creates the
  // pairing and then sends the tab to the app, one round trip later; the
  // button is disabled and a light runs round it for that gap, so the tap is
  // seen to have worked and cannot start a second pairing. On a computer it
  // stays busy while the dialog is open. Never cleared by a navigation away:
  // the page is gone with it.
  const [busy, setBusy] = useState(false);

  const { login } = useZorealFlow({
    ...request,
    flow,
    onCredential:
      flow === 'browser-direct'
        ? (r: ZorealCredentialResponse) => {
            setBusy(false);
            (onSuccess as (r: ZorealCredentialResponse) => void)(r);
          }
        : undefined,
    onCode:
      flow === 'auth-code'
        ? (r: ZorealCodeResponse) => {
            setBusy(false);
            (onSuccess as unknown as (r: ZorealCodeResponse) => void)(r);
          }
        : undefined,
    onError: (e) => {
      setBusy(false);
      onError?.({ type: 'unknown', description: e.description ?? e.error });
    },
    onNonOAuthError: (e: NonOAuthError) => {
      setBusy(false);
      onError?.(e);
    },
  });

  const s = SIZES[size];
  const radius = shape === 'pill' ? s.height / 2 : shape === 'square' ? 4 : s.radius;
  // The mark keeps the brand blue wherever it can be seen. On the brand-blue
  // filled button it cannot, so there it takes the label's white.
  const brandMark = theme !== 'filled';
  const style: CSSProperties = useMemo(
    () => ({
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: logo_alignment === 'center' ? 'center' : 'flex-start',
      gap: s.gap,
      height: s.height,
      padding: `0 ${s.pad}px`,
      width,
      fontSize: s.font,
      fontFamily: 'inherit',
      fontWeight: 500,
      cursor: 'pointer',
      borderRadius: radius,
      ...(theme === 'outline'
        ? { background: '#ffffff', color: '#16181c', border: '1px solid #e2e4de' }
        : theme === 'filled_black'
          ? { background: '#111', color: '#fff', border: '1px solid #111' }
          : { background: '#00b4d9', color: '#fff', border: '1px solid #00b4d9' }),
    }),
    [logo_alignment, s, radius, theme, width]
  );

  return (
    <div {...containerProps}>
      <ZorealBusyRing busy={busy} radius={radius} theme={theme === 'outline' ? 'auto' : 'light'}>
        <button
          type="button"
          style={busy ? { ...style, cursor: 'progress' } : style}
          disabled={busy}
          aria-busy={busy}
          onClick={() => {
            if (busy) return;
            click_listener?.();
            setBusy(true);
            login();
          }}
        >
          <ZorealMark size={s.mark} brand={brandMark} />
          {type === 'standard' && label}
        </button>
      </ZorealBusyRing>
    </div>
  );
}
