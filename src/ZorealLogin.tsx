import { useMemo, type CSSProperties } from 'react';
import { useZorealFlow, type ActivePairing } from './useZorealLogin';
import type { NonOAuthError, ZorealLoginProps } from './types';

/**
 * The drop-in button. It receives no access token, so it returns the
 * pseudonymous identity only; personal data needs the auth-code flow.
 *
 * The copy is neutral: the button asserts nothing about a person who has not
 * yet authenticated. Styling is inline and self-contained; no stylesheet, no
 * font, no external asset, because this renders on a sign-in page.
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

/** The ZOREAL mark, in currentColor so every theme carries it correctly. */
const Mark = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="8.4 7.4 62.2 62.2"
    fill="currentColor"
    fillRule="evenodd"
    aria-hidden
    focusable="false"
  >
    <path d="M56.1,32.9c.6-3.1-.8-6.4-3.7-8.1l-18-10.4,5.2-3,15.4,8.9c5.4,3.1,7.7,9.6,5.8,15.3-.3.8-.6,1.6-1.1,2.4-.4.7-.9,1.4-1.5,2.1-1.3,1.4-2.9,2.6-4.6,3.3-3.6,1.5-7.9,1.4-11.6-.7l-8.9-5.1c-2.9-1.7-6.5-1.3-8.9.8-.6.6-1.2,1.2-1.7,2-.5.8-.8,1.7-.9,2.5-.6,3.1.9,6.4,3.7,8.1l18,10.4-5.2,3-15.4-8.9c-5.4-3.1-7.7-9.6-5.8-15.3.2-.8.6-1.6,1-2.4.5-.7,1-1.4,1.5-2.1,1.3-1.4,2.9-2.6,4.7-3.3,3.6-1.6,7.8-1.4,11.5.6l8.9,5.2c3,1.7,6.6,1.3,8.9-.8.6-.6,1.2-1.2,1.7-2,.4-.8.7-1.7.9-2.5Z" />
    <path d="M68.7,44.2c-.7,1.2-2.3,1.7-3.5.9-1.3-.7-1.7-2.3-1-3.5.7-1.3,2.3-1.7,3.5-1,1.3.7,1.7,2.3,1,3.6Z" />
    <path d="M25.6,21.3c5.1-.8,10.4,0,15.3,2.9l1.2.7h0c1.2.7,1.6,2.3.9,3.5s-2.3,1.7-3.5.9l-1.2-.7c-4.2-2.4-9.1-3-13.5-1.9-1.6.4-3.1,1.1-4.5,1.9h0c-1.2.7-2.8.3-3.5-1-.7-1.2-.3-2.8.9-3.5,0,0,.1,0,.3-.1.3-.1.6-.4,1-.5,2.1-1.1,4.4-1.7,6.7-2.2Z" />
    <path d="M9.6,31.8c.7-1.2,2.4-1.6,3.5-.8,1.2.7,1.6,2.4.8,3.5-.8,1.2-2.4,1.6-3.6.8-1.2-.8-1.5-2.4-.7-3.5Z" />
    <path d="M46.2,30.3c.7-1.3,2.3-1.7,3.5-1,1.2.7,1.7,2.3.9,3.6-.7,1.2-2.3,1.7-3.5.9s-1.7-2.3-.9-3.5Z" />
    <path d="M52.1,54.5c-5,.9-10.4,0-15.3-2.8l-1.2-.7h0c-1.2-.7-1.7-2.3-.9-3.5s2.3-1.7,3.5-.9l1.2.7c4.3,2.4,9.1,3,13.6,1.9,1.6-.4,3.1-1.1,4.5-1.9h0c1.2-.7,2.8-.3,3.5.9.7,1.3.3,2.9-.9,3.6-.1,0-.2,0-.3,0-.4.2-.7.4-1.1.6-2.1,1-4.3,1.7-6.7,2.1Z" />
    <path d="M31.4,45.6c-.7,1.2-2.3,1.7-3.5.9s-1.7-2.3-.9-3.5,2.3-1.7,3.5-.9,1.7,2.3.9,3.5Z" />
  </svg>
);

const PairingPanel = ({ pairing }: { pairing: ActivePairing }) => {
  const { status } = pairing.state;
  const line =
    status === 'claimed'
      ? 'Approve the login in your ZOREAL ID app.'
      : status === 'enrolling'
        ? 'Finishing enrolment. This screen will continue by itself.'
        : pairing.appLink
          ? 'Continue in the ZOREAL ID app, then return to this tab.'
          : 'Scan with your phone camera or the ZOREAL ID app.';

  return (
    <div
      role="dialog"
      aria-label="Log in with ZOREAL"
      style={{
        marginTop: 8,
        padding: 16,
        width: 232,
        borderRadius: 12,
        border: '1px solid rgba(128,128,128,0.35)',
        background: 'Canvas',
        color: 'CanvasText',
        textAlign: 'center',
        fontFamily: 'inherit',
      }}
    >
      {!pairing.appLink && (
        <img
          src={pairing.qrUrl}
          alt={`QR code for ${pairing.pairUrl}`}
          width={200}
          height={200}
          style={{ display: 'block', margin: '0 auto', borderRadius: 8 }}
        />
      )}
      <p style={{ margin: '10px 0 0', fontSize: 12, lineHeight: 1.5 }}>{line}</p>
      <button
        type="button"
        onClick={pairing.cancel}
        style={{
          marginTop: 10,
          border: 'none',
          background: 'none',
          color: 'inherit',
          opacity: 0.6,
          fontSize: 12,
          cursor: 'pointer',
          textDecoration: 'underline',
        }}
      >
        Cancel
      </button>
    </div>
  );
};

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

  const { login, internals } = useZorealFlow({
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
        <Mark size={Math.round(s.font * 1.25)} />
        {type === 'standard' && TEXTS[text]}
      </button>
      {internals.pairing && !internals.pairing.appLink && (
        <PairingPanel pairing={internals.pairing} />
      )}
    </div>
  );
}
