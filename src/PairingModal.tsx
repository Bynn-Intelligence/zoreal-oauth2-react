import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ZorealLockup } from './lockup';
import { interpolate, isRtl, strings } from './i18n';
import { cx, ensureStyles } from './styles';
import type { PairingState, ZorealTheme } from './types';

/**
 * The pairing modal, rendered by the SDK rather than by every integrator.
 *
 * It is a modal and not an inline card because the handshake is blocking,
 * time-boxed and happens on a second device: there is nothing useful to do on
 * the page until it resolves, and an inline panel below a button competes with
 * the rest of a sign-in form for the person's attention at the one moment they
 * need to look at their phone.
 */

/** Our own cap on how long a pairing sits on screen. See `pairingTimeoutMs`. */
export const DEFAULT_PAIRING_TIMEOUT_MS = 120_000;

/** Below this the countdown changes colour: it stops being background
 *  information and starts being a prompt to hurry. */
const URGENT_SECONDS = 20;

function mmss(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/* Icons are inlined rather than pulled from an icon package: this renders on
   someone else's sign-in page, and a UI dependency here would be inherited by
   every host app that installs the SDK. */
const IconClose = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden focusable="false">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

const IconPhone = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">
    <rect x="6" y="2" width="12" height="20" rx="2.5" />
    <path d="M11 18.5h2" />
  </svg>
);

const IconShield = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export interface PairingModalProps {
  state: PairingState;
  qrUrl: string;
  onCancel: () => void;
  locale?: string;
  theme?: ZorealTheme;
  timeoutMs?: number;
}

export function PairingModal({
  state,
  qrUrl,
  onCancel,
  locale,
  theme = 'auto',
  timeoutMs = DEFAULT_PAIRING_TIMEOUT_MS,
}: PairingModalProps) {
  const t = strings(locale);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  // A deadline, not a decremented counter. Background tabs throttle timers, so
  // a counter that subtracts one per tick drifts and comes back lying about how
  // much time is left; reading the clock each tick self-corrects.
  const deadlineRef = useRef(0);
  const [remaining, setRemaining] = useState(Math.round(timeoutMs / 1000));

  // `claimed` = the request is now waiting in the holder's app; `enrolling` =
  // a first-time holder finishing ZOREAL ID setup. In both the QR has done its
  // job and the action has moved to the phone.
  const settled = state.status === 'claimed' || state.status === 'enrolling';

  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    ensureStyles();
  }, []);

  useEffect(() => {
    // Never claim more time than the provider will actually honour: if the
    // server's own window is shorter than our cap, the server wins.
    const serverMs = typeof state.expiresIn === 'number' ? state.expiresIn * 1000 : Infinity;
    deadlineRef.current = Date.now() + Math.min(timeoutMs, serverMs);
    setRemaining(Math.round(Math.min(timeoutMs, serverMs) / 1000));

    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        // Stop the tick before cancelling. Unmount clears it anyway, but only
        // after this render commits, and a timer that keeps firing `cancel`
        // once a second in between is a race waiting to be inherited.
        clearInterval(id);
        onCancelRef.current();
      }
    }, 1000);
    return () => clearInterval(id);
    // Deliberately keyed on the FIRST expiresIn only: re-running on every poll
    // would restart the countdown each tick and it would never reach zero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeoutMs]);

  // Escape closes, page scroll locks, and focus moves into the dialog, so the
  // panel is reachable and dismissable without a mouse.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancelRef.current();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, []);

  if (typeof document === 'undefined') return null;

  const body =
    state.status === 'enrolling'
      ? t.bodyEnrolling
      : settled
        ? t.bodyApprove
        : t.bodyScan;

  return createPortal(
    <div className={`${cx('root')} ${cx('scrim')}`} data-theme={theme} onClick={onCancel}>
      <div
        className={cx('card')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        dir={isRtl(locale) ? 'rtl' : 'ltr'}
        onClick={(e) => e.stopPropagation()}
      >
        <button ref={closeRef} type="button" className={cx('close')} aria-label={t.close} onClick={onCancel}>
          <IconClose />
        </button>

        <div className={cx('body')}>
          <ZorealLockup height={44} className={cx('lockup')} />

          <h2 id={titleId} className={cx('title')}>
            {settled ? t.titleApprove : t.title}
          </h2>
          <p className={cx('body-text')}>{body}</p>

          <div className={cx('qr-well')}>
            <img className={cx('qr')} data-spent={settled} src={qrUrl} alt={t.qrAlt} width={180} height={180} />
            {settled && (
              <span className={cx('qr-overlay')}>
                <span className={cx('qr-badge')}>
                  <IconPhone />
                </span>
              </span>
            )}
          </div>

          <div className={cx('status')}>
            <span className={cx('dot')}>
              <i />
              <i />
            </span>
            {settled ? t.waitingApproval : t.waiting}
          </div>
          <p className={cx('timer')} data-urgent={remaining <= URGENT_SECONDS}>
            {interpolate(t.expiresIn, mmss(remaining))}
          </p>
        </div>

        {/* The QR is on screen because this person is being asked to use a
            phone app, and some of them do not have it yet. Without this the
            panel reads as "scan this with something I do not have", and the
            flow dead-ends at the one moment it can still be recovered: the
            same code is also the app's download link. */}
        <div className={cx('help')}>
          <p className={cx('help-title')}>{t.noIdTitle}</p>
          <p className={cx('help-body')}>{t.noIdBody}</p>
        </div>

        <div className={cx('footer')}>
          <button type="button" className={cx('cancel')} onClick={onCancel}>
            {t.cancel}
          </button>
          <p className={cx('secured')}>
            <IconShield />
            {t.secured}
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
