/**
 * The ZOREAL mark. Geometry is the tight crop made for small sizes.
 *
 * Two colour modes, because the mark has two jobs. On the button it is
 * `currentColor`, so it inherits whatever the host theme puts on the label. In
 * the pairing modal it is the brand blue, because there it identifies WHOSE
 * request the person is being asked to approve, and an identity check is
 * exactly the wrong place for a mark that changes colour with the page.
 */
export const ZOREAL_BLUE = '#00b4d9';

export function ZorealMark({
  size = 18,
  brand = false,
  className,
}: {
  size?: number;
  /** Paint the brand blue instead of inheriting currentColor. */
  brand?: boolean;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="8.4 7.4 62.2 62.2"
      fill={brand ? ZOREAL_BLUE : 'currentColor'}
      fillRule="evenodd"
      aria-hidden
      focusable="false"
      className={className}
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
}
