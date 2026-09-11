// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  isReturnDone,
  markReturnDone,
  pendingReturnId,
  returnToUrl,
  saveReturnFlow,
  forgetReturnFlow,
  peekReturnFlow,
} from '../src/return';

const flow = (requestId: string, createdAt = Date.now()) => ({
  v: 1 as const,
  issuer: 'https://id.zoreal.test',
  clientId: 'ast_x',
  flow: 'auth-code' as const,
  verifier: 'v'.repeat(43),
  nonce: 'n',
  state: 's',
  scope: 'openid',
  requestId,
  createdAt,
});

beforeEach(() => {
  localStorage.clear();
  window.location.hash = '';
});

describe('the way back', () => {
  it('saves a flow, shows it to any reader, and forgets it when its owner takes it', () => {
    saveReturnFlow(flow('A'.repeat(32)));
    expect(peekReturnFlow('A'.repeat(32))?.verifier).toBe('v'.repeat(43));
    expect(peekReturnFlow('A'.repeat(32))?.verifier).toBe('v'.repeat(43));
    forgetReturnFlow('A'.repeat(32));
    expect(peekReturnFlow('A'.repeat(32))).toBeNull();
  });

  it('does not show a flow that is too old to resume', () => {
    saveReturnFlow(flow('B'.repeat(32), Date.now() - 11 * 60 * 1000));
    expect(peekReturnFlow('B'.repeat(32))).toBeNull();
  });

  it('marks a flow done for the tab that was left behind', () => {
    saveReturnFlow(flow('C'.repeat(32)));
    expect(isReturnDone('C'.repeat(32))).toBe(false);
    markReturnDone('C'.repeat(32));
    expect(isReturnDone('C'.repeat(32))).toBe(true);
    expect(peekReturnFlow('C'.repeat(32))).toBeNull();
  });

  it('reads the pairing out of the fragment, clears it, and keeps it for every reader until taken', () => {
    expect(pendingReturnId()).toBeNull();
    window.location.hash = '#zoreal_return=' + 'D'.repeat(32);
    expect(pendingReturnId()).toBe('D'.repeat(32));
    expect(window.location.hash).toBe('');
    // A second reader on the same page load still sees it.
    expect(pendingReturnId()).toBe('D'.repeat(32));
    forgetReturnFlow('D'.repeat(32));
    expect(pendingReturnId()).toBeNull();
    window.location.hash = '#other=1&zoreal_return=' + 'E'.repeat(32) + '&x=2';
    expect(pendingReturnId()).toBe('E'.repeat(32));
    forgetReturnFlow('E'.repeat(32));
    window.location.hash = '#zoreal_return=short';
    expect(pendingReturnId()).toBeNull();
  });

  it('names this page without its fragment as the way back', () => {
    window.location.hash = '#top';
    expect(returnToUrl()).toBe(window.location.href.replace(/#.*$/, ''));
    expect(returnToUrl()).not.toContain('#');
  });
});
