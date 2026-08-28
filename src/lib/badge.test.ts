import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { applyBadgeAppearance, refreshAllBadges, refreshBadgeForTab } from './badge';
import { languagePreference } from './settings';
import { addSavedLink } from './storage';

/** The tab the badge is asked about in most cases. */
const TAB_ID = 1;

function badgeTextOf(tabId = TAB_ID): Promise<string> {
  return fakeBrowser.action.getBadgeText({ tabId });
}

function tooltipOf(tabId = TAB_ID): Promise<string> {
  return fakeBrowser.action.getTitle({ tabId });
}

async function saveLinks(...urls: string[]): Promise<void> {
  for (const url of urls) {
    await addSavedLink({ url, title: 'Saved page' });
  }
}

beforeEach(() => {
  fakeBrowser.reset();
  // The worker reads the browser language for the tooltip; the Node
  // environment these tests run in has no navigator of its own.
  vi.stubGlobal('navigator', { language: 'en-US' });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the badge of a single tab', () => {
  it('shows how many links are saved for the domain', async () => {
    await saveLinks('https://shop.example/first', 'https://shop.example/second');

    await refreshBadgeForTab({ id: TAB_ID, url: 'https://shop.example/third' });

    await expect(badgeTextOf()).resolves.toBe('2');
  });

  // A "0" on every tab of every site would be permanent noise.
  it('stays empty when nothing is saved for the domain', async () => {
    await saveLinks('https://other.example/item');

    await refreshBadgeForTab({ id: TAB_ID, url: 'https://shop.example/item' });

    await expect(badgeTextOf()).resolves.toBe('');
  });

  it('counts only the domain of that tab', async () => {
    await saveLinks('https://shop.example/first', 'https://other.example/first');

    await refreshBadgeForTab({ id: TAB_ID, url: 'https://shop.example/second' });

    await expect(badgeTextOf()).resolves.toBe('1');
  });

  // Pages the extension cannot save anything on can never have a count.
  it.each([
    ['a browser page', 'chrome://extensions'],
    ['a local file', 'file:///C:/notes.html'],
    ['a tab whose address we cannot see', undefined],
  ])('shows no badge on %s', async (_case, url) => {
    await saveLinks('https://shop.example/item');

    await refreshBadgeForTab({ id: TAB_ID, url });

    await expect(badgeTextOf()).resolves.toBe('');
  });

  it('keeps the badge readable instead of cutting the number off', async () => {
    const urls = Array.from({ length: 101 }, (_, index) => `https://shop.example/${index}`);
    await saveLinks(...urls);

    await refreshBadgeForTab({ id: TAB_ID, url: 'https://shop.example/next' });

    await expect(badgeTextOf()).resolves.toBe('99+');
  });

  it('ignores a tab that cannot be addressed', async () => {
    await expect(
      refreshBadgeForTab({ id: undefined, url: 'https://shop.example/item' }),
    ).resolves.toBeUndefined();
  });
});

describe('the tooltip', () => {
  // Badge text is painted onto the icon and never reaches a screen reader, so
  // the count has to exist as text somewhere (WCAG 2.2 AA, 1.1.1).
  it('carries the count as real text', async () => {
    await saveLinks('https://shop.example/first', 'https://shop.example/second');

    await refreshBadgeForTab({ id: TAB_ID, url: 'https://shop.example/third' });

    await expect(tooltipOf()).resolves.toBe('PinJar: 2 pins on this site');
  });

  it('uses the singular for a single link', async () => {
    await saveLinks('https://shop.example/item');

    await refreshBadgeForTab({ id: TAB_ID, url: 'https://shop.example/item' });

    await expect(tooltipOf()).resolves.toBe('PinJar: 1 pin on this site');
  });

  it('says so when there is nothing saved', async () => {
    await refreshBadgeForTab({ id: TAB_ID, url: 'https://shop.example/item' });

    await expect(tooltipOf()).resolves.toBe('PinJar: Nothing pinned on this site');
  });

  it('follows the chosen interface language', async () => {
    await languagePreference.setValue('de');
    await saveLinks('https://shop.example/item');

    await refreshBadgeForTab({ id: TAB_ID, url: 'https://shop.example/item' });

    await expect(tooltipOf()).resolves.toBe('PinJar: 1 Pin auf dieser Seite');
  });

  it('follows the browser language while the choice is automatic', async () => {
    vi.stubGlobal('navigator', { language: 'de-AT' });

    await refreshBadgeForTab({ id: TAB_ID, url: 'https://shop.example/item' });

    await expect(tooltipOf()).resolves.toBe('PinJar: Auf dieser Seite ist nichts gepinnt');
  });
});

describe('refreshing every tab', () => {
  it('gives each tab the count of its own domain', async () => {
    await saveLinks('https://shop.example/first', 'https://shop.example/second');
    const shopTab = await fakeBrowser.tabs.create({ url: 'https://shop.example/third' });
    const otherTab = await fakeBrowser.tabs.create({ url: 'https://other.example/item' });

    await refreshAllBadges();

    await expect(badgeTextOf(shopTab.id)).resolves.toBe('2');
    await expect(badgeTextOf(otherTab.id)).resolves.toBe('');
  });

  // This is what makes a save in the popup show up on the tab behind it.
  it('picks up a link saved after the badges were set', async () => {
    const tab = await fakeBrowser.tabs.create({ url: 'https://shop.example/item' });
    await refreshAllBadges();

    await saveLinks('https://shop.example/item');
    await refreshAllBadges();

    await expect(badgeTextOf(tab.id)).resolves.toBe('1');
  });

  it('clears the badge again when the last link of a domain is gone', async () => {
    const tab = await fakeBrowser.tabs.create({ url: 'https://shop.example/item' });
    await saveLinks('https://shop.example/item');
    await refreshAllBadges();

    await fakeBrowser.storage.local.remove('savedLinks');
    await refreshAllBadges();

    await expect(badgeTextOf(tab.id)).resolves.toBe('');
  });
});

describe('badge appearance', () => {
  // The default badge color is the browser's, and nothing guarantees it passes
  // contrast against white text.
  it('sets a background color that carries white text', async () => {
    await applyBadgeAppearance();

    await expect(fakeBrowser.action.getBadgeBackgroundColor({})).resolves.toEqual([
      86, 22, 67, 255,
    ]);
  });
});
