import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FlowAbandonedError,
  OAuthFlowError,
  exchangeCode,
  pollUntilApproved,
  qrRefreshSecondsOf,
  resolveDisplay,
  startPairing,
} from '../src/pairing';
import { DEFAULT_QR_REFRESH_SECONDS, type PairCreated } from '../src/wire';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

afterEach(() => vi.restoreAllMocks());

const created = (extra: Partial<PairCreated> = {}): PairCreated => ({
  request_id: 'r1',
  pair_url: 'https://zoreal.com/login/r1',
  expires_in: 120,
  ...extra,
});

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

describe('the pairing surface', () => {
  it('sends the surface it is about to show, so the provider binds the pairing to it', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(created()));

    await startPairing('https://id.zoreal.test', {
      client_id: 'ast_x',
      scope: 'openid',
      state: 's',
      nonce: 'n',
      code_challenge: 'c',
      display: 'qr',
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1]!.body as string);
    expect(body.display).toBe('qr');
  });

  it('resolves an explicit preference over the user agent, and falls back to it', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' });
    expect(resolveDisplay('qr')).toBe('qr');
    expect(resolveDisplay()).toBe('link');
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' });
    expect(resolveDisplay()).toBe('qr');
    expect(resolveDisplay('link')).toBe('link');
    vi.unstubAllGlobals();
  });

  it("refreshes on the provider's cadence, and on three seconds when it names none", () => {
    expect(qrRefreshSecondsOf(created({ qr_refresh_seconds: 7 }))).toBe(7);
    expect(qrRefreshSecondsOf(created())).toBe(DEFAULT_QR_REFRESH_SECONDS);
    expect(DEFAULT_QR_REFRESH_SECONDS).toBe(3);
    // A zero would spin, so it is treated as no answer rather than obeyed.
    expect(qrRefreshSecondsOf(created({ qr_refresh_seconds: 0 }))).toBe(
      DEFAULT_QR_REFRESH_SECONDS
    );
  });
});

describe('the QR frames', () => {
  const pendingForever = () =>
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(json({ status: 'pending', expires_in: 118 }))
    );

  /** Every state that carried a QR image, in order. */
  const framesOf = (seen: Array<{ qrUrl?: string }>) =>
    seen.map((s) => s.qrUrl).filter((url): url is string => Boolean(url));

  it('publishes a fresh frame on the cadence, each one uncacheable', async () => {
    vi.useFakeTimers();
    pendingForever();
    const seen: Array<{ qrUrl?: string }> = [];
    const controller = new AbortController();
    const done = pollUntilApproved(
      'https://id.zoreal.test',
      'r 1',
      (s) => seen.push(s),
      controller.signal,
      { qrRefreshSeconds: 3 }
    );
    done.catch(() => {});

    await vi.advanceTimersByTimeAsync(2900);
    expect(framesOf(seen)).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(200);
    const first = framesOf(seen);
    expect(first).toHaveLength(1);
    // The request id is escaped and the query is a cache-buster: the same
    // image URL twice would be served from cache and the code would freeze.
    expect(first[0]).toMatch(/^https:\/\/id\.zoreal\.test\/pair\/r%201\/qr\.svg\?t=\d+$/);

    await vi.advanceTimersByTimeAsync(3000);
    const two = framesOf(seen);
    expect(two).toHaveLength(2);
    expect(two[1]).not.toBe(two[0]);

    // A frame is a whole state, not a bare URL: a custom UI renders it the
    // same way it renders every other state.
    expect(seen[seen.length - 1]).toMatchObject({ status: 'pending' });

    controller.abort();
    await vi.advanceTimersByTimeAsync(10_000);
    vi.useRealTimers();
  });

  it('stops once the phone has claimed the code: the QR is spent', async () => {
    vi.useFakeTimers();
    let polls = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(json(polls++ === 0 ? { status: 'pending', expires_in: 118 } : { status: 'claimed' }))
    );
    const seen: Array<{ qrUrl?: string }> = [];
    const controller = new AbortController();
    const done = pollUntilApproved(
      'https://id.zoreal.test',
      'r1',
      (s) => seen.push(s),
      controller.signal,
      { qrRefreshSeconds: 1 }
    );
    done.catch(() => {});

    // The second poll, at 2s, reports claimed. Frames can only have fired
    // while it was pending.
    await vi.advanceTimersByTimeAsync(4000);
    const whenClaimed = framesOf(seen).length;
    expect(whenClaimed).toBeGreaterThan(0);
    expect(whenClaimed).toBeLessThanOrEqual(2);

    await vi.advanceTimersByTimeAsync(30_000);
    expect(framesOf(seen)).toHaveLength(whenClaimed);

    controller.abort();
    await vi.advanceTimersByTimeAsync(10_000);
    vi.useRealTimers();
  });

  it('draws no frames for the app link, which has no QR to animate', async () => {
    vi.useFakeTimers();
    pendingForever();
    const seen: Array<{ qrUrl?: string }> = [];
    const controller = new AbortController();
    const done = pollUntilApproved('https://id.zoreal.test', 'r1', (s) => seen.push(s), controller.signal);
    done.catch(() => {});

    await vi.advanceTimersByTimeAsync(30_000);
    expect(framesOf(seen)).toHaveLength(0);

    controller.abort();
    await vi.advanceTimersByTimeAsync(10_000);
    vi.useRealTimers();
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

  it('a cancelled request stops the poll instead of spinning on it', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ status: 'cancelled' }));
    await expect(
      pollUntilApproved('https://id.zoreal.test', 'r1')
    ).rejects.toMatchObject({ reason: { type: 'request_expired' } });
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
