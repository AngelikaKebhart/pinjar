// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

/** The button that opens the form on one link in the list. */
function editButton(title: string): HTMLElement {
  return screen.getByRole('button', { name: `Edit “${title}”` });
}

/** The form for title, category, tags, status and note, once it is open. */
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
 * Concept §3.1: category, tags, status and note can be given from the popup.
 * Each link carries its own button for them, so that saving stays the single
 * click the extension promises and the list stays what the popup shows.
 */
describe('editing a link from the list', () => {
  it('opens the form from the button on that link', async () => {
    await addSavedLink({ url: 'https://shop.example/first', title: 'Jersey fabric' });
    await givenTabOn('https://shop.example/second');
    await renderPopup();

    fireEvent.click(editButton('Jersey fabric'));

    expect(detailsForm('Jersey fabric')).toBeTruthy();
  });

  it('keeps what was filled in', async () => {
    await addSavedLink({ url: 'https://shop.example/first', title: 'Jersey fabric' });
    await givenTabOn('https://shop.example/second');
    await renderPopup();

    fireEvent.click(editButton('Jersey fabric'));
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'Size M' } });
    fireEvent.change(screen.getByLabelText('New tags'), { target: { value: 'jersey, blue' } });
    fireEvent.click(detailsSaveButton());

    expect(await screen.findByText(en['popup.status.detailsSaved'] ?? '')).toBeTruthy();
    await expect(getSavedLinks()).resolves.toMatchObject([
      { note: 'Size M', tags: ['jersey', 'blue'] },
    ]);
  });

  // Saving is one click and stays one click. A form opening by itself would
  // push the list out of sight of everyone who only wanted to save.
  it('stays closed when a page is saved', async () => {
    await givenTabOn('https://shop.example/item');
    await renderPopup();

    fireEvent.click(saveButton());

    expect(await screen.findByText(en['popup.status.saved'] ?? '')).toBeTruthy();
    expect(screen.queryByRole('form')).toBeNull();
  });

  // Otherwise focus falls to the document, and a keyboard user starts over at
  // the top of the popup.
  it('hands focus back to the button when the form is dismissed', async () => {
    await addSavedLink({ url: 'https://shop.example/first', title: 'Jersey fabric' });
    await givenTabOn('https://shop.example/second');
    await renderPopup();

    fireEvent.click(editButton('Jersey fabric'));
    fireEvent.click(detailsCancelButton());

    await waitFor(() => expect(document.activeElement).toBe(editButton('Jersey fabric')));
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

  /*
   * The question replaces the button that asked it and the button comes back
   * in its place, so focus has to travel both ways. Left behind, it falls to
   * the document and the next Tab starts over at the top of the popup.
   */
  it('carries focus into the delete question and back out of it', async () => {
    await addSavedLink({ url: 'https://shop.example/first', title: 'Jersey fabric' });
    await givenTabOn('https://shop.example/second');
    await renderPopup();

    fireEvent.click(screen.getByRole('button', { name: 'Delete “Jersey fabric”' }));
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Yes, delete “Jersey fabric”' }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Keep “Jersey fabric”' }));

    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Delete “Jersey fabric”' }),
    );
  });

  it('keeps working in German', async () => {
    await givenTabOn('https://shop.example/item');
    Object.defineProperty(navigator, 'language', { configurable: true, get: () => 'de-DE' });

    await renderPopup();

    expect(screen.getByRole('button', { name: 'Diese Seite merken' })).toBeTruthy();
  });
});
