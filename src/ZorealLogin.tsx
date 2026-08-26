import { useMemo, type CSSProperties } from 'react';
import { useZorealFlow, type ActivePairing } from './useZorealLogin';
import type { NonOAuthError, ZorealLoginProps } from './types';

/**
 * The drop-in button, browser-direct and therefore Tier A only (03 section 1:
 * it receives no access token, so there is nothing for a personal-data claim
 * to arrive on).
 *
 * The copy is neutral by decision (01 section 5): the button asserts nothing
 * about a person who has not yet authenticated. Styling is inline and
 * self-contained; no stylesheet, no font, no external asset, because this
 * renders on the most attacked page the integrator owns (01 section 4).
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

/** The mark: a filled ring, the brand geometry reduced to currentColor. */
const Mark = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false">
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.6" />
    <circle cx="12" cy="12" r="3.4" fill="currentColor" />
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
