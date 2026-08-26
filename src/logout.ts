/**
 * Clears SDK-held local state. Named for parity with googleLogout and, like
 * it, LOCAL ONLY: it does not end the holder's ZOREAL session, which lives on
 * their phone and at the provider. A relying party that believes this signs
 * the user out of ZOREAL has a security misunderstanding, not a naming
 * complaint (05 section 8). The relying party's own session is the relying
 * party's to end.
 *
 * The SDK deliberately persists nothing (no localStorage, no cookies), so
 * today this has nothing to clear and exists as the stable API surface for a
 * future that does.
 */
export function zorealLogout(): void {
  // Intentionally empty until the SDK holds state worth clearing.
}
