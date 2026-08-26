import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FlowAbandonedError,
  OAuthFlowError,
  exchangeCode,
  pollUntilApproved,
  startPairing,
} from '../src/pairing';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

afterEach(() => vi.restoreAllMocks());

describe('startPairing', () => {
  it('sends the wire version and PKCE method, returns the request', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(json({ request_id: 'r1', pair_url: 'https://zoreal.com/qr/r1', expires_in: 120 }));

    const started = await startPairing('https://id.zoreal.test', {
      client_id: 'ast_x',
      scope: 'openid',
      state: 's',
      nonce: 'n',
      code_challenge: 'c',
    });

    expect(started).toMatchObject({ request_id: 'r1' });
    const body = JSON.parse(fetchMock.mock.calls[0][1]!.body as string);
    expect(body.code_challenge_method).toBe('S256');
    expect(body.wire_version).toBe(1);
    expect(body.sdk).toMatch(/^@zoreal\/oauth2-react\//);
  });

  it("surfaces the provider's refusal verbatim", async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      json({ error: 'access_denied', error_description: 'sdk 0.0.9 is refused: CVE-XXXX' }, 400)
    );
    await expect(
      startPairing('https://id.zoreal.test', {
        client_id: 'ast_x',
        scope: 'openid',
        state: 's',
        nonce: 'n',
        code_challenge: 'c',
      })
    ).rejects.toMatchObject({ description: 'sdk 0.0.9 is refused: CVE-XXXX' });
  });
});

describe('pollUntilApproved', () => {
  it('walks pending, claimed, approved and returns the code', async () => {
    vi.useFakeTimers();
    const states = [
      { status: 'pending', expires_in: 118 },
      { status: 'claimed' },
      { status: 'approved', code: 'code-1' },
    ];
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(json(states.shift())));

    const seen: string[] = [];
    const codePromise = pollUntilApproved('https://id.zoreal.test', 'r1', (s) => seen.push(s.status));
    await vi.advanceTimersByTimeAsync(10_000);
    expect(await codePromise).toBe('code-1');
    expect(seen).toEqual(['pending', 'claimed', 'approved']);
    vi.useRealTimers();
  });

  it('throws the human outcomes as FlowAbandonedError', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ status: 'denied' }));
    await expect(pollUntilApproved('https://id.zoreal.test', 'r1')).rejects.toBeInstanceOf(
      FlowAbandonedError
    );
  });
});

describe('exchangeCode', () => {
  it('posts form-encoded PKCE exchange, no secret anywhere', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(json({ id_token: 'a.b.c' }));

    const tokens = await exchangeCode('https://id.zoreal.test', {
      code: 'code-1',
      code_verifier: 'v',
      client_id: 'ast_x',
    });
    expect(tokens.id_token).toBe('a.b.c');
    const body = fetchMock.mock.calls[0][1]!.body as URLSearchParams;
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('client_secret')).toBeNull();
  });

  it('throws OAuthFlowError with the server reason on failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      json({ error: 'invalid_grant', error_description: 'code already used' }, 400)
    );
    await expect(
      exchangeCode('https://id.zoreal.test', { code: 'c', code_verifier: 'v', client_id: 'a' })
    ).rejects.toBeInstanceOf(OAuthFlowError);
  });
});
