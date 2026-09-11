import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { cx, ensureStyles } from './styles';
import type { ZorealTheme } from './types';

/**
 * The light of the pairing dialog's QR well, run around whatever this wraps
 * while `busy` is true: the well's colours, line, halo and lap, on a dash
 * that travels the outline at one speed whatever the shape.
 *
 * The SDK's own button uses it for the gap on a phone between the tap and the
 * hand-over to the app. A site with its own sign-in button MAY wrap that
 * button the same way: set your busy state on the tap, clear it when
 * `onSuccess` or `onError` fires. `radius` is the wrapped control's corner
 * radius in pixels, so the light follows its shape; `theme` picks the light
 * and dark strengths the dialog uses, following the OS by default.
 *
 * It is a wrapper, and a wrapper is a change to your markup, so know what it
 * does before you use it: it is inline by default and shrinks to the button,
 * so a full-width button needs `block`; the light sits outside the button,
 * so an ancestor with `overflow: hidden` clips it; and a selector that relies
 * on the button's parent (`.card > button`) no longer matches. A site that
 * would rather draw its own busy state needs nothing from here.
 */
export function ZorealBusyRing({
  busy,
  radius = 8,
  theme = 'auto',
  block = false,
  className,
  style,
  children,
}: {
  busy: boolean;
  radius?: number;
  theme?: ZorealTheme;
  /** Lay the wrapper out as a block, for a button that fills its row. */
  block?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  useEffect(() => {
    ensureStyles();
  }, []);
  // The outline runs 2px outside the control, so its corners are 2px larger.
  const rx = radius + 2;
  const layer = (name: string) => (
    <rect className={cx(name)} rx={rx} ry={rx} pathLength={100} />
  );
  return (
    <span
      className={className ? `${cx('root')} ${cx('ring')} ${className}` : `${cx('root')} ${cx('ring')}`}
      data-theme={theme}
      data-busy={busy}
      style={block ? { display: 'flex', ...style } : style}
    >
      {children}
      <svg className={cx('ring-svg')} aria-hidden="true">
        {layer('ring-halo')}
        {layer('ring-tail')}
        {layer('ring-body')}
        {layer('ring-head')}
      </svg>
    </span>
  );
}
