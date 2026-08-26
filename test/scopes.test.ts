import { describe, expect, it } from 'vitest';
import { hasGrantedAllScopesZoreal, hasGrantedAnyScopeZoreal } from '../src/scopes';

describe('scope checks', () => {
  const response = { scope: 'openid zoreal.age profile.name' };

  it('all: true only when every scope was granted', () => {
    expect(hasGrantedAllScopesZoreal(response, 'openid', 'zoreal.age')).toBe(true);
    expect(hasGrantedAllScopesZoreal(response, 'openid', 'email')).toBe(false);
  });

  it('any: true when at least one was granted', () => {
    expect(hasGrantedAnyScopeZoreal(response, 'email', 'profile.name')).toBe(true);
    expect(hasGrantedAnyScopeZoreal(response, 'email', 'profile.birthdate')).toBe(false);
  });

  it('an empty grant matches nothing', () => {
    expect(hasGrantedAnyScopeZoreal({ scope: '' }, 'openid')).toBe(false);
  });
});
