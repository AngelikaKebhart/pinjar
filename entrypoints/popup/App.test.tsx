// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { TranslationProvider } from '@/src/i18n/TranslationProvider';
import { CATALOGS } from '@/src/i18n/messages';
import { addSavedLink, getSavedLinks } from '@/src/lib/storage';
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

/** The form for category, tags, status and note, once saving has opened it. */
function detailsForm(title: string): HTMLElement {
  return screen.getByRole('form', { name: `Edit “${title}”` });
}

function detailsSaveButton(): HTMLElement {
  return screen.getByRole('button', { name: en['editLink.save'] ?? '' });
}

function detailsCancelButton(): HTMLElement {
  return screen.getByRole('button', { name: en['editLink.cancel'] ?? '' });
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

    // Saving leads straight into the details, and the list is behind them.
    fireEvent.click(detailsCancelButton());

    expect(screen.getByRole('link', { name: 'Jersey fabric, blue' })).toBeTruthy();
  });

  it('refuses to save the same page twice', async () => {
    await givenTabOn('https://shop.example/item');
    await renderPopup();

    fireEvent.click(saveButton());
    // The button reads "Saving…" until the first save is through, so waiting
    // for the confirmation is also what makes it findable again.
    expect(await screen.findByText(en['popup.status.saved'] ?? '')).toBeTruthy();
    fireEvent.click(detailsCancelButton());

    fireEvent.click(saveButton());

    expect(await screen.findByText(en['popup.status.alreadySaved'] ?? '')).toBeTruthy();
    await expect(getSavedLinks()).resolves.toHaveLength(1);
  });

  // A browser page has no domain to file anything under, so the button would
  // only ever produce an error — better to make that visible up front.
  it('offers no way to save a browser page', async () => {
    await givenTabOn('chrome://extensions');
    await renderPopup();

    expect(saveButton()).toHaveProperty('disabled', true);
  });

  // A greyed-out button that gives no reason leaves the user guessing whether
  // the extension is broken.
  it('says why a browser page cannot be saved', async () => {
    await givenTabOn('chrome://extensions');

    await renderPopup();

    expect(screen.getByText(en['popup.status.unsupportedPage'] ?? '')).toBeTruthy();
  });
});

/*
 * Concept §3.1: category, tags, status and note can be given while saving.
 * They follow the save rather than standing in front of it, so that saving
 * stays the single click the extension promises.
 */
describe('the details right after saving', () => {
  it('are offered without a second click', async () => {
    await givenTabOn('https://shop.example/item');
    await renderPopup();

    fireEvent.click(saveButton());

    expect(await screen.findByText(en['popup.status.saved'] ?? '')).toBeTruthy();
    expect(detailsForm('Jersey fabric, blue')).toBeTruthy();
  });

  it('keep what was filled in', async () => {
    await givenTabOn('https://shop.example/item');
    await renderPopup();
    fireEvent.click(saveButton());
    expect(await screen.findByText(en['popup.status.saved'] ?? '')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'Size M' } });
    fireEvent.change(screen.getByLabelText('New tags'), { target: { value: 'jersey, blue' } });
    fireEvent.click(detailsSaveButton());

    expect(await screen.findByText(en['popup.status.detailsSaved'] ?? '')).toBeTruthy();
    await expect(getSavedLinks()).resolves.toMatchObject([
      { note: 'Size M', tags: ['jersey', 'blue'] },
    ]);
  });

  // The link is stored before the form appears, so dismissing it is not an
  // undo — it only means the user wanted nothing more than the one click.
  it('leave the link saved when they are dismissed', async () => {
    await givenTabOn('https://shop.example/item');
    await renderPopup();
    fireEvent.click(saveButton());
    expect(await screen.findByText(en['popup.status.saved'] ?? '')).toBeTruthy();

    fireEvent.click(detailsCancelButton());

    await expect(getSavedLinks()).resolves.toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Jersey fabric, blue' })).toBeTruthy();
  });

  // Saving a page that is already on the list would otherwise be a gesture
  // with no answer to it.
  it('are offered for a page that is already on the list', async () => {
    await addSavedLink({ url: 'https://shop.example/item', title: 'Jersey fabric' });
    await givenTabOn('https://shop.example/item');
    await renderPopup();

    fireEvent.click(saveButton());

    expect(await screen.findByText(en['popup.status.alreadySaved'] ?? '')).toBeTruthy();
    expect(detailsForm('Jersey fabric')).toBeTruthy();
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

  /*
   * On a browser page there is no site to name. The heading would read
   * "Saved on " with nothing behind it, and the list below it would report
   * that nothing is saved here yet — for a page that can never hold anything.
   */
  it('lists nothing for a page that has no site', async () => {
    await givenTabOn('chrome://extensions');

    await renderPopup();

    expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
    expect(screen.queryByText(en['popup.savedLinks.empty'] ?? '')).toBeNull();
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

    fireEvent.click(screen.getByRole('button', { name: 'Delete “Jersey fabric”' }));
    // Deleting asks once before it happens.
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete “Jersey fabric”' }));

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

  // With several links listed, "Delete" alone would not say which one.
  it('names which link a delete button belongs to', async () => {
    await addSavedLink({ url: 'https://shop.example/first', title: 'Jersey fabric' });
    await givenTabOn('https://shop.example/second');

    await renderPopup();

    expect(screen.getByRole('button', { name: 'Delete “Jersey fabric”' })).toBeTruthy();
  });

  // A stray click must not cost a saved link (WCAG 3.3.4).
  it('keeps the link when the delete question is dismissed', async () => {
    await addSavedLink({ url: 'https://shop.example/first', title: 'Jersey fabric' });
    await givenTabOn('https://shop.example/second');
    await renderPopup();

    fireEvent.click(screen.getByRole('button', { name: 'Delete “Jersey fabric”' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep “Jersey fabric”' }));

    expect(screen.getByRole('link', { name: 'Jersey fabric' })).toBeTruthy();
  });

  it('keeps working in German', async () => {
    await givenTabOn('https://shop.example/item');
    Object.defineProperty(navigator, 'language', { configurable: true, get: () => 'de-DE' });

    await renderPopup();

    expect(screen.getByRole('button', { name: 'Diese Seite merken' })).toBeTruthy();
  });
});
