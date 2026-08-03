import { apiUrl, normalizeBaseUrl } from './api-config';

describe('normalizeBaseUrl', () => {
  it('defaults to localhost:3001 when unset', () => {
    expect(normalizeBaseUrl(undefined)).toBe('http://localhost:3001');
  });

  it('strips trailing slashes', () => {
    expect(normalizeBaseUrl('http://192.168.1.10:3001/')).toBe('http://192.168.1.10:3001');
    expect(normalizeBaseUrl('https://api.example.com///')).toBe('https://api.example.com');
  });
});

describe('apiUrl', () => {
  it('joins paths onto the versioned API root, with or without a leading slash', () => {
    expect(apiUrl('/auth/login')).toMatch(/\/api\/v1\/auth\/login$/);
    expect(apiUrl('auth/login')).toMatch(/\/api\/v1\/auth\/login$/);
  });
});
