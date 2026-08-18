// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { TranslationProvider } from '@/src/i18n/TranslationProvider';
import { CATALOGS } from '@/src/i18n/messages';
import { addSavedLink } from '@/src/lib/storage';
import App from './App';

const en = CATALOGS.en;

/** Puts the fake browser on a page, the way the popup will find it. */
async function givenTabOn(url: string): Promise<void> {
  const window = await fakeBrowser.windows.create({ focused: true });
  await fakeBrowser.tabs.create({ url, active: true, windowId: window?.id });
}

async function renderPopup(): Promise<void> {
  render(
    <TranslationProvider>
      <App />
    </TranslationProvider>,
  );

  // Waiting for the heading, not for the loading text to vanish: the
  // provider renders nothing at all until it knows the language, so "no
  // loading text" is true before the popup has even started.
  await screen.findByRole('heading', { level: 1 });
}

function saveButton(): HTMLElement {
  return screen.getByRole('button', { name: en['popup.savePage'] ?? '' });
}

beforeEach(() => {
  fakeBrowser.reset();
  vi.restoreAllMocks();
  Object.defineProperty(navigator, 'language', { configurable: true, get: () => 'en-US' });
  // The cast is needed because `vi.spyOn` resolves the extension APIs to their
  // callback overload, which is typed as returning nothing.
  (vi.spyOn(fakeBrowser.scripting, 'executeScript') as unknown as Mock).mockResolvedValue([
    { result: { title: 'Jersey fabric, blue', imageUrl: null }, frameId: 0 },
  ]);
});

afterEach(() => {
  cleanup();
});

describe('saving the current page', () => {
  it('puts the page on the list and says so', async () => {
    await givenTabOn('https://shop.example/item');
    await renderPopup();

    fireEvent.click(saveButton());

    expect(await screen.findByText(en['popup.status.saved'] ?? '')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Jersey fabric, blue' })).toBeTruthy();
  });

  it('refuses to save the same page twice', async () => {
    await givenTabOn('https://shop.example/item');
    await renderPopup();

    fireEvent.click(saveButton());
    // The button reads "Saving…" until the first save is through, so waiting
    // for the confirmation is also what makes it findable again.
    expect(await screen.findByText(en['popup.status.saved'] ?? '')).toBeTruthy();

    fireEvent.click(saveButton());

    expect(await screen.findByText(en['popup.status.alreadySaved'] ?? '')).toBeTruthy();
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  // A browser page has no domain to file anything under, so the button would
  // only ever produce an error — better to make that visible up front.
  it('offers no way to save a browser page', async () => {
    await givenTabOn('chrome://extensions');
    await renderPopup();

    expect(saveButton()).toHaveProperty('disabled', true);
  });
});

describe('the links of this site', () => {
  it('lists what is already saved for the domain', async () => {
    await addSavedLink({ url: 'https://shop.example/first', title: 'Jersey fabric' });
    await addSavedLink({ url: 'https://other.example/item', title: 'Something else' });
    await givenTabOn('https://shop.example/second');

    await renderPopup();

    expect(screen.getByRole('link', { name: 'Jersey fabric' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Something else' })).toBeNull();
  });

  it('names the site it is listing', async () => {
    await givenTabOn('https://shop.example/item');

    await renderPopup();

    expect(screen.getByRole('heading', { name: 'Saved on shop.example' })).toBeTruthy();
  });

  it('says so when there is nothing yet', async () => {
    await givenTabOn('https://shop.example/item');

    await renderPopup();

    expect(screen.getByText(en['popup.savedLinks.empty'] ?? '')).toBeTruthy();
  });

  it('opens a saved link in a new tab rather than inside the popup', async () => {
    await addSavedLink({ url: 'https://shop.example/first', title: 'Jersey fabric' });
    await givenTabOn('https://shop.example/second');

    await renderPopup();

    const link = screen.getByRole('link', { name: 'Jersey fabric' });
    expect(link.getAttribute('href')).toBe('https://shop.example/first');
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('removes a link and drops it from the list', async () => {
    await addSavedLink({ url: 'https://shop.example/first', title: 'Jersey fabric' });
    await givenTabOn('https://shop.example/second');
    await renderPopup();

    fireEvent.click(screen.getByRole('button', { name: 'Remove “Jersey fabric”' }));

    expect(await screen.findByText(en['popup.status.removed'] ?? '')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Jersey fabric' })).toBeNull();
  });
});

describe('accessibility', () => {
  // Badge-free feedback: the status line is the only signal that saving
  // worked, so it has to reach a screen reader without stealing focus.
  it('announces the outcome politely', async () => {
    await givenTabOn('https://shop.example/item');
    await renderPopup();

    fireEvent.click(saveButton());

    const status = await screen.findByText(en['popup.status.saved'] ?? '');
    expect(status.getAttribute('aria-live')).toBe('polite');
  });

  // Every delete button would otherwise be announced as just "✕".
  it('names which link a remove button belongs to', async () => {
    await addSavedLink({ url: 'https://shop.example/first', title: 'Jersey fabric' });
    await givenTabOn('https://shop.example/second');

    await renderPopup();

    expect(screen.getByRole('button', { name: 'Remove “Jersey fabric”' })).toBeTruthy();
  });

  it('keeps working in German', async () => {
    await givenTabOn('https://shop.example/item');
    Object.defineProperty(navigator, 'language', { configurable: true, get: () => 'de-DE' });

    await renderPopup();

    expect(screen.getByRole('button', { name: 'Diese Seite merken' })).toBeTruthy();
  });
});
