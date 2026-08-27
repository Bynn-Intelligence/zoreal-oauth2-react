import { afterEach, describe, expect, it, vi } from 'vitest';
import { interpolate, isRtl, strings } from '../src/i18n';

describe('strings', () => {
  it('resolves an exact locale', () => {
    expect(strings('sv').title).toBe('Skanna för att logga in');
  });

  it('resolves a regional tag to its primary language', () => {
    expect(strings('pt-BR').cancel).toBe(strings('pt').cancel);
    expect(strings('de-AT').cancel).toBe(strings('de').cancel);
  });

  it('is case and separator insensitive', () => {
    expect(strings('FR_CA').cancel).toBe(strings('fr').cancel);
  });

  // The one split that needs more than the primary subtag, and the one most
  // likely to regress: a Simplified reader must never be served Traditional.
  it('splits Chinese by script, not by primary subtag', () => {
    expect(strings('zh-Hans').cancel).toBe('取消');
    expect(strings('zh-CN').close).toBe('关闭');
    expect(strings('zh-Hant').close).toBe('關閉');
    expect(strings('zh-TW').close).toBe('關閉');
    expect(strings('zh').close).toBe('關閉');
  });

  it('falls back to English rather than rendering a key', () => {
    expect(strings('xx').title).toBe(strings('en').title);
    expect(strings(undefined).title).toBe(strings('en').title);
  });

  it('carries every key in every locale', () => {
    const keys = Object.keys(strings('en')).sort();
    for (const locale of ['sv', 'es', 'pt', 'fr', 'de', 'ru', 'ja', 'hi', 'zh-Hans', 'zh-Hant', 'ar', 'ko']) {
      const got = strings(locale);
      expect(Object.keys(got).sort(), `${locale} key set`).toEqual(keys);
      for (const [key, value] of Object.entries(got)) {
        expect(value, `${locale}.${key}`).toBeTruthy();
      }
    }
  });

  // The countdown is the only interpolated string; losing the placeholder in a
  // translation would silently ship a timer with no number in it.
  it('keeps the {time} placeholder in every locale', () => {
    for (const locale of ['en', 'sv', 'es', 'pt', 'fr', 'de', 'ru', 'ja', 'hi', 'zh-Hans', 'zh-Hant', 'ar', 'ko']) {
      expect(strings(locale).expiresIn, locale).toContain('{time}');
    }
  });
});

describe('isRtl', () => {
  it('flags Arabic and not the others', () => {
    expect(isRtl('ar')).toBe(true);
    expect(isRtl('ar-EG')).toBe(true);
    expect(isRtl('en')).toBe(false);
    expect(isRtl(undefined)).toBe(false);
  });
});

describe('interpolate', () => {
  it('substitutes the time', () => {
    expect(interpolate('Expires in {time}', '1:59')).toBe('Expires in 1:59');
  });
});

/**
 * With no locale from the host, the modal follows the browser. This is the
 * default path for any integrator who never sets `locale`, so it is the one
 * most people will actually ship.
 */
describe('browser preference', () => {
  const setLanguages = (languages: string[]) => {
    vi.stubGlobal('navigator', { languages, language: languages[0] });
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the browser language when none is passed', () => {
    setLanguages(['sv-SE', 'en-US']);
    expect(strings().title).toBe(strings('sv').title);
  });

  it('walks the preference list past languages it does not carry', () => {
    setLanguages(['cy-GB', 'is-IS', 'de-DE']);
    expect(strings().title).toBe(strings('de').title);
  });

  it('falls back to English when it carries none of them', () => {
    setLanguages(['cy-GB', 'is-IS']);
    expect(strings().title).toBe(strings('en').title);
  });

  it('lets an explicit locale win over the browser', () => {
    setLanguages(['sv-SE']);
    expect(strings('ja').title).toBe(strings('ja').title);
    expect(strings('ja').title).not.toBe(strings('sv').title);
  });

  it('reads direction from the browser too', () => {
    setLanguages(['ar-EG']);
    expect(isRtl()).toBe(true);
    setLanguages(['en-US']);
    expect(isRtl()).toBe(false);
  });

  it('survives a navigator with only `language`', () => {
    vi.stubGlobal('navigator', { language: 'ko-KR' });
    expect(strings().title).toBe(strings('ko').title);
  });
});
