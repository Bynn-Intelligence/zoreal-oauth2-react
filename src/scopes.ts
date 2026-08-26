import type { ZorealCodeResponse } from './types';

/** Mirrors hasGrantedAllScopesGoogle for name-for-name portability. */
export function hasGrantedAllScopesZoreal(
  response: Pick<ZorealCodeResponse, 'scope'>,
  firstScope: string,
  ...restScopes: string[]
): boolean {
  const granted = new Set((response.scope ?? '').split(/\s+/).filter(Boolean));
  return [firstScope, ...restScopes].every((s) => granted.has(s));
}

export function hasGrantedAnyScopeZoreal(
  response: Pick<ZorealCodeResponse, 'scope'>,
  firstScope: string,
  ...restScopes: string[]
): boolean {
  const granted = new Set((response.scope ?? '').split(/\s+/).filter(Boolean));
  return [firstScope, ...restScopes].some((s) => granted.has(s));
}
