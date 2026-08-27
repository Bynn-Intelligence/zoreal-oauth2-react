import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_ISSUER } from './wire';
import { PairingModal } from './PairingModal';
import type { PairingState, PairingUI, ZorealTheme } from './types';

export interface ZorealOAuthProviderProps {
  /** From the ZOREAL dashboard: the asset ID. */
  clientId: string;
  /** Override the provider origin. Sandbox and self-hosted testing only. */
  issuer?: string;
  /**
   * BCP 47. Drives button text, the pairing page, AND the pairing modal's own
   * copy — pass the language your app is currently showing, so the browser and
   * the phone say the same thing.
   */
  locale?: string;
  /** Colour scheme for the pairing modal. Defaults to following the OS. */
  theme?: ZorealTheme;
  /**
   * Who renders the QR. Defaults to 'modal': the SDK draws it. Set 'none' only
   * if you are rendering your own from `onPairingStateChange`.
   */
  pairingUI?: PairingUI;
  /**
   * How long the modal stays open before giving up and cancelling, in ms.
   * Defaults to 120000. The provider's own expiry wins when it is shorter.
   */
  pairingTimeoutMs?: number;
  children: ReactNode;
}

export interface ZorealOAuthContextProps {
  clientId: string;
  issuer: string;
  locale?: string;
}

/** What the flow hands the provider so it can draw the pairing. */
export interface HostedPairing {
  state: PairingState;
  qrUrl: string;
  cancel: () => void;
}

const ZorealOAuthContext = createContext<ZorealOAuthContextProps | null>(null);

/**
 * Internal channel from the flow to the provider.
 *
 * The modal has to be rendered by the provider rather than by the hook, because
 * `useZorealLogin` returns a function, not an element: there is nowhere for a
 * hook to put a dialog. Publishing up to the provider is what lets an
 * integrator get the whole pairing UI without writing (or importing) anything.
 *
 * Null when `pairingUI` is 'none', which is also how the flow knows to stay out
 * of the way and let the caller render.
 */
const PairingHostContext = createContext<((pairing: HostedPairing | null) => void) | null>(null);

export function useZorealPairingHost() {
  return useContext(PairingHostContext);
}

export function ZorealOAuthProvider({
  clientId,
  issuer = DEFAULT_ISSUER,
  locale,
  theme = 'auto',
  pairingUI = 'modal',
  pairingTimeoutMs,
  children,
}: ZorealOAuthProviderProps) {
  const [pairing, setPairing] = useState<HostedPairing | null>(null);

  const value = useMemo(
    () => ({ clientId, issuer: issuer.replace(/\/$/, ''), locale }),
    [clientId, issuer, locale]
  );

  const host = pairingUI === 'modal' ? setPairing : null;

  return (
    <ZorealOAuthContext.Provider value={value}>
      <PairingHostContext.Provider value={host}>
        {children}
        {pairing && (
          <PairingModal
            state={pairing.state}
            qrUrl={pairing.qrUrl}
            onCancel={pairing.cancel}
            locale={locale}
            theme={theme}
            timeoutMs={pairingTimeoutMs}
          />
        )}
      </PairingHostContext.Provider>
    </ZorealOAuthContext.Provider>
  );
}

export function useZorealOAuth(): ZorealOAuthContextProps {
  const ctx = useContext(ZorealOAuthContext);
  if (!ctx) {
    throw new Error(
      'useZorealOAuth must be used inside <ZorealOAuthProvider clientId=...>. ' +
        'Wrap your app (or the part that logs in) in the provider.'
    );
  }
  return ctx;
}
