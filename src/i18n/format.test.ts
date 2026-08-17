import { describe, expect, it } from 'vitest';
import { formatDate, formatNumber, interpolate, translate, translatePlural } from './format';
import type { MessageCatalog } from './messages';

const catalog: MessageCatalog = {
  greeting: 'Hello {name}',
  plain: 'No placeholders here',
  items_one: '{count} item',
  items_other: '{count} items',
  partial_other: '{count} things',
};

describe('interpolate', () => {
  it('replaces placeholders with the given values', () => {
    expect(interpolate('Hello {name}', { name: 'Angelika' })).toBe('Hello Angelika');
  });

  it('replaces every occurrence and accepts numbers', () => {
    expect(interpolate('{n} of {n}', { n: 3 })).toBe('3 of 3');
  });

  it('leaves unknown placeholders untouched so the mistake stays visible', () => {
    expect(interpolate('Hello {name}', { other: 'x' })).toBe('Hello {name}');
  });

  it('returns the template unchanged when no params are given', () => {
    expect(interpolate('Hello {name}')).toBe('Hello {name}');
  });
});

describe('translate', () => {
  it('looks up a message and fills in placeholders', () => {
    expect(translate(catalog, 'greeting', { name: 'Angelika' })).toBe('Hello Angelika');
  });

  it('returns messages without placeholders as they are', () => {
    expect(translate(catalog, 'plain')).toBe('No placeholders here');
  });

  it('falls back to the key when it is missing', () => {
    expect(translate(catalog, 'does.not.exist')).toBe('does.not.exist');
  });
});

describe('translatePlural', () => {
  it('picks the singular form for one', () => {
    expect(translatePlural(catalog, 'en', 'items', 1)).toBe('1 item');
  });

  it('picks the plural form for zero and for many', () => {
    expect(translatePlural(catalog, 'en', 'items', 0)).toBe('0 items');
    expect(translatePlural(catalog, 'en', 'items', 42)).toBe('42 items');
  });

  it('makes count available without passing it explicitly', () => {
    expect(translatePlural(catalog, 'de', 'items', 7)).toBe('7 items');
  });

  it('falls back to the "other" form when the specific one is missing', () => {
    expect(translatePlural(catalog, 'en', 'partial', 1)).toBe('1 things');
  });

  it('falls back to the key when the message is missing entirely', () => {
    expect(translatePlural(catalog, 'en', 'nope', 1)).toBe('nope');
  });
});

describe('formatNumber', () => {
  it('uses the decimal separator of the active language', () => {
    expect(formatNumber('de', 1234.5)).toBe('1.234,5');
    expect(formatNumber('en', 1234.5)).toBe('1,234.5');
  });

  it('accepts currency options', () => {
    expect(formatNumber('en', 19.9, { style: 'currency', currency: 'EUR' })).toContain('19.90');
  });
});

describe('formatDate', () => {
  const date = new Date('2026-03-07T12:00:00Z');

  it('formats according to the active language', () => {
    expect(formatDate('de', date)).not.toBe(formatDate('en', date));
  });

  it('accepts an ISO string as well as a Date', () => {
    expect(formatDate('en', '2026-03-07T12:00:00Z')).toBe(formatDate('en', date));
  });

  it('returns an empty string for an unparsable value instead of throwing', () => {
    expect(formatDate('en', 'not a date')).toBe('');
    expect(formatDate('en', '')).toBe('');
    expect(formatDate('en', new Date(Number.NaN))).toBe('');
  });
});
