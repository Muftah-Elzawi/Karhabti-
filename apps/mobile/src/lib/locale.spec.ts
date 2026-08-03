import { fontForLocale, isRtl, resolveLocale } from './locale';

describe('resolveLocale', () => {
  it('falls back to Arabic when nothing is stored', () => {
    expect(resolveLocale(null)).toBe('ar');
  });

  it('falls back to Arabic for unknown stored values', () => {
    expect(resolveLocale('fr')).toBe('ar');
    expect(resolveLocale('')).toBe('ar');
  });

  it('returns a valid stored locale', () => {
    expect(resolveLocale('en')).toBe('en');
    expect(resolveLocale('ar')).toBe('ar');
  });
});

describe('isRtl', () => {
  it('is RTL for Arabic and LTR for English', () => {
    expect(isRtl('ar')).toBe(true);
    expect(isRtl('en')).toBe(false);
  });
});

describe('fontForLocale', () => {
  it('pairs Plex Arabic with ar and Inter with en, in both weights', () => {
    expect(fontForLocale('ar')).toBe('IBMPlexSansArabic_400Regular');
    expect(fontForLocale('ar', 'medium')).toBe('IBMPlexSansArabic_500Medium');
    expect(fontForLocale('en')).toBe('Inter_400Regular');
    expect(fontForLocale('en', 'medium')).toBe('Inter_500Medium');
  });
});
