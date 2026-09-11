import { useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
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
/** How far the tail reaches behind the head, as a fraction of the outline. */
const TAIL = 0.3;
/* Layer n is n/N of the tail long and 1/n opaque. A point k/N of the way
   back is covered by layers n >= k, and the product of their transparencies
   telescopes to (k - 1)/N: a straight fade. Longest first, so the head paints
   on top. The two shortest carry the head tint. */
const STACK = Array.from({ length: 12 }, (_, i) => 12 - i);
const HALO = [3, 2, 1];

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
  // The dash is sized as a fraction of the outline, so the outline's length
  // is measured once laid out and again whenever the control changes size.
  const wrapRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<SVGRectElement>(null);
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const rect = measureRef.current;
    if (!wrap || !rect) return;
    const measure = () => {
      const length = rect.getTotalLength();
      if (length > 0) wrap.style.setProperty('--zrl-ring-len', `${length}px`);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [radius]);
  // The outline runs 2px outside the control, so its corners are 2px larger.
  const rx = radius + 2;
  // One dash of the stack: `len` of the outline long, ending at the shared
  // head three tenths of the way round, `alpha` opaque.
  const layer = (key: string, name: string, len: number, alpha: string, ref?: typeof measureRef) => (
    <rect
      key={key}
      ref={ref}
      className={cx(name)}
      rx={rx}
      ry={rx}
      style={
        {
          strokeDasharray: `calc(var(--zrl-l) * ${len}) calc(var(--zrl-l) * ${1 - len})`,
          '--zrl-s': `calc(var(--zrl-l) * ${-(TAIL - len)})`,
          opacity: alpha,
        } as CSSProperties
      }
    />
  );
  return (
    <span
      ref={wrapRef}
      className={className ? `${cx('root')} ${cx('ring')} ${className}` : `${cx('root')} ${cx('ring')}`}
      data-theme={theme}
      data-busy={busy}
      style={block ? { display: 'flex', ...style } : style}
    >
      {children}
      <svg className={cx('ring-svg')} aria-hidden="true">
        {HALO.map((n, i) =>
          layer(`h${n}`, 'ring-halo', (TAIL * n) / HALO.length, `calc(var(--zrl-glow-opacity) * 0.6 / ${n})`, i === 0 ? measureRef : undefined)
        )}
        {STACK.map((n) => layer(`t${n}`, n <= 2 ? 'ring-head' : 'ring-tail', (TAIL * n) / STACK.length, String(1 / n)))}
      </svg>
    </span>
  );
}
