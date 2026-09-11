import { describe, expect, it } from 'vitest';
import { sameDeviceStartUrl } from '../src/pairing';

describe('same device', () => {
  it('builds the start navigation from the pairing parameters, the page token and its origin', () => {
    const url = new URL(
      sameDeviceStartUrl('https://id.zoreal.test', {
        client_id: 'ast_x',
        scope: 'openid profile.name',
        state: 's1',
        nonce: 'n1',
        code_challenge: 'c'.repeat(43),
        acr_values: 'zoreal.live',
        locale: 'sv',
        request_id: 'r'.repeat(32),
        origin: 'https://rp.example',
      })
    );
    expect(`${url.origin}${url.pathname}`).toBe('https://id.zoreal.test/pair/start');
    const q = url.searchParams;
    expect(q.get('client_id')).toBe('ast_x');
    expect(q.get('scope')).toBe('openid profile.name');
    expect(q.get('code_challenge_method')).toBe('S256');
    expect(q.get('acr_values')).toBe('zoreal.live');
    expect(q.get('locale')).toBe('sv');
    expect(q.get('request_id')).toBe('r'.repeat(32));
    expect(q.get('origin')).toBe('https://rp.example');
    expect(q.get('wire_version')).toBe('1');
    expect(q.get('sdk')).toMatch(/^@zoreal\/oauth2-react\//);
    // Absent options are absent, not "undefined".
    expect(q.has('redirect_uri')).toBe(false);
    expect(q.has('max_age')).toBe(false);
    expect(q.has('display')).toBe(false);
  });
});
