import { describe, it, expect } from 'vitest';
import { extractDomain, isSafeImageUrl } from './url';

describe('extractDomain', () => {
  it('returns the hostname of an http(s) URL', () => {
    expect(extractDomain('https://www.example.com/products/42?ref=x')).toBe('www.example.com');
    expect(extractDomain('http://example.com')).toBe('example.com');
  });

  it('keeps subdomains and ports apart from the hostname', () => {
    expect(extractDomain('https://shop.example.com:8443/item')).toBe('shop.example.com');
  });

  it('is not fooled by a host-like string in the path or credentials', () => {
    expect(extractDomain('https://evil.test/https://example.com')).toBe('evil.test');
    expect(extractDomain('https://example.com@evil.test/')).toBe('evil.test');
  });

  it('rejects non-http(s) schemes', () => {
    expect(extractDomain('javascript:alert(1)')).toBeNull();
    expect(extractDomain('data:text/html,<h1>hi</h1>')).toBeNull();
    expect(extractDomain('file:///C:/secrets.txt')).toBeNull();
  });

  it('returns null for unparsable input', () => {
    expect(extractDomain('')).toBeNull();
    expect(extractDomain('not a url')).toBeNull();
  });
});

describe('isSafeImageUrl', () => {
  it('accepts http(s) image URLs', () => {
    expect(isSafeImageUrl('https://cdn.example.com/preview.jpg')).toBe(true);
    expect(isSafeImageUrl('http://example.com/a.png')).toBe(true);
  });

  it('rejects dangerous or missing URLs', () => {
    expect(isSafeImageUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeImageUrl('data:image/svg+xml,<svg onload=alert(1)>')).toBe(false);
    expect(isSafeImageUrl(null)).toBe(false);
    expect(isSafeImageUrl(undefined)).toBe(false);
    expect(isSafeImageUrl('')).toBe(false);
  });
});
