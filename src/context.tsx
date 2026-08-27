import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { DEFAULT_ISSUER } from './wire';

export interface ZorealOAuthProviderProps {
  /** From the ZOREAL dashboard: the asset ID. */
  clientId: string;
  /** Override the provider origin. Sandbox and self-hosted testing only. */
  issuer?: string;
  /** BCP 47. Drives button text and the pairing page. */
  locale?: string;
  children: ReactNode;
}

export interface ZorealOAuthContextProps {
  clientId: string;
  issuer: string;
  locale?: string;
}

const ZorealOAuthContext = createContext<ZorealOAuthContextProps | null>(null);

export function ZorealOAuthProvider({
  clientId,
  issuer = DEFAULT_ISSUER,
  locale,
  children,
}: ZorealOAuthProviderProps) {
  const value = useMemo(
    () => ({ clientId, issuer: issuer.replace(/\/$/, ''), locale }),
    [clientId, issuer, locale]
  );
  return <ZorealOAuthContext.Provider value={value}>{children}</ZorealOAuthContext.Provider>;
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
