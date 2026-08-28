// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { ThemeProvider } from '@/src/components/ThemeProvider';
import { interpolate } from '@/src/i18n/format';
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
  // The same two providers the popup is mounted under in main.tsx. The header
  // reads both of them — the theme switcher would throw without ThemeProvider.
  render(
    <ThemeProvider>
      <TranslationProvider>
        <App />
      </TranslationProvider>
    </ThemeProvider>,
  );

  // The main landmark, not the loading text going away: the provider renders
  // nothing until it knows the language, so "no loading text" is true before
  // the popup has started. The heading is no good either — it lives in the
  // header, which stands while storage is read — nor a button, whose name
  // changes with the language the test runs in.
  await screen.findByRole('main');
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

/** The button that opens the delete question on one link in the list. */
function deleteButton(title: string): HTMLElement {
  return screen.getByRole('button', { name: `Delete “${title}”` });
}

/** An English message with its placeholders filled in, as the popup shows it. */
function messageAbout(key: string, title: string): string {
  return interpolate(en[key] ?? '', { title });
}

/**
 * The delete question, found by its own name.
 *
 * Not simply by role: the form carries a fieldset for the tags, which is a
 * group too, so an unqualified query matches whichever happens to be there.
 */
function deleteQuestion(title: string): HTMLElement | null {
  return screen.queryByRole('group', { name: messageAbout('deleteLink.question', title) });
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

describe('the header', () => {
  it('carries the settings that apply everywhere', async () => {
    await givenTabOn('https://shop.example/item');

    await renderPopup();

    const header = screen.getByRole('banner');
    expect(within(header).getByRole('heading', { level: 1, name: 'PinJar' })).toBeTruthy();
    expect(
      within(header).getByRole('button', { name: en['settings.language.label'] ?? '' }),
    ).toBeTruthy();
    expect(
      within(header).getByRole('button', { name: en['settings.theme.label'] ?? '' }),
    ).toBeTruthy();
  });

  /*
   * The dashboard's third header button is left out by decision, not omission:
   * a download and a file picker both take the focus away, which is the gesture
   * Chrome dismisses the popup on. This test is here to stop them being added
   * back out of symmetry with the dashboard.
   */
  it('leaves the manage menu to the dashboard', async () => {
    await givenTabOn('https://shop.example/item');

    await renderPopup();

    expect(screen.queryByRole('button', { name: en['manage.heading'] ?? '' })).toBeNull();
  });
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
    // The button reads "Pinning…" until the first save is through, so waiting
    // for the confirmation is also what makes it findable again.
    expect(await screen.findByText(en['popup.status.saved'] ?? '')).toBeTruthy();

    fireEvent.click(saveButton());

    expect(await screen.findByText(en['popup.status.alreadySaved'] ?? '')).toBeTruthy();
    await expect(getSavedLinks()).resolves.toHaveLength(1);
  });

  // A browser page has no domain to file anything under, so the button could
  // only produce an error — better to say so up front.
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
 * Each link carries its own button for them, so saving stays the single click
 * the extension promises and the list stays what the popup shows.
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

    expect(await screen.findByText(en['linkFeedback.detailsSaved'] ?? '')).toBeTruthy();
    await expect(getSavedLinks()).resolves.toMatchObject([
      { note: 'Size M', tags: ['jersey', 'blue'] },
    ]);
  });

  // Saving stays one click: a form opening by itself would push the list out
  // of sight of everyone who only wanted to save.
  it('stays closed when a page is saved', async () => {
    await givenTabOn('https://shop.example/item');
    await renderPopup();

    fireEvent.click(saveButton());

    expect(await screen.findByText(en['popup.status.saved'] ?? '')).toBeTruthy();
    expect(screen.queryByRole('form')).toBeNull();
  });

  /*
   * The way out has to stay where the way in was. A form replacing the whole
   * row would put Cancel at the foot of something several screens long, and
   * make deleting a link just looked at a two-step job.
   */
  it('keeps both buttons in reach while the form is open', async () => {
    await addSavedLink({ url: 'https://shop.example/first', title: 'Jersey fabric' });
    await givenTabOn('https://shop.example/second');
    await renderPopup();

    fireEvent.click(editButton('Jersey fabric'));

    expect(editButton('Jersey fabric')).toBeTruthy();
    expect(deleteButton('Jersey fabric')).toBeTruthy();
  });

  // Two buttons that look and behave alike; this is the only thing telling a
  // screen reader which of them has something open.
  it('says on the button whether the form is open', async () => {
    await addSavedLink({ url: 'https://shop.example/first', title: 'Jersey fabric' });
    await givenTabOn('https://shop.example/second');
    await renderPopup();

    expect(editButton('Jersey fabric').getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(editButton('Jersey fabric'));

    expect(editButton('Jersey fabric').getAttribute('aria-expanded')).toBe('true');
  });

  it('closes the form when the same button is pressed again', async () => {
    await addSavedLink({ url: 'https://shop.example/first', title: 'Jersey fabric' });
    await givenTabOn('https://shop.example/second');
    await renderPopup();

    fireEvent.click(editButton('Jersey fabric'));
    fireEvent.click(editButton('Jersey fabric'));

    expect(screen.queryByRole('form')).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(editButton('Jersey fabric')));
  });

  // The same key that dismisses the delete question beside it.
  it('closes the form on Escape', async () => {
    await addSavedLink({ url: 'https://shop.example/first', title: 'Jersey fabric' });
    await givenTabOn('https://shop.example/second');
    await renderPopup();

    fireEvent.click(editButton('Jersey fabric'));
    fireEvent.keyDown(detailsForm('Jersey fabric'), { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('form')).toBeNull());
    expect(document.activeElement).toBe(editButton('Jersey fabric'));
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

    expect(screen.getByRole('heading', { name: 'Pinned on shop.example' })).toBeTruthy();
  });

  it('says so when there is nothing yet', async () => {
    await givenTabOn('https://shop.example/item');

    await renderPopup();

    expect(screen.getByText(en['popup.savedLinks.empty'] ?? '')).toBeTruthy();
  });

  /*
   * On a browser page there is no site to name: the heading would read "Saved
   * on " with nothing behind it, and the list would say nothing is saved here
   * yet — of a page that can never hold anything.
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

    fireEvent.click(deleteButton('Jersey fabric'));
    // Deleting asks once before it happens.
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete “Jersey fabric”' }));

    expect(
      await screen.findByText(messageAbout('linkFeedback.removed', 'Jersey fabric')),
    ).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Jersey fabric' })).toBeNull();
  });
});

describe('accessibility', () => {
  // The status line is the only signal that saving worked, so it has to reach
  // a screen reader without stealing focus.
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
   * The question opens under the button that asked it, so focus travels there
   * and back. It lands on the question, not on "Yes, delete": a held or
   * repeated Enter — the key that opened the panel — would otherwise answer it.
   */
  it('carries focus into the delete question and back out of it', async () => {
    await addSavedLink({ url: 'https://shop.example/first', title: 'Jersey fabric' });
    await givenTabOn('https://shop.example/second');
    await renderPopup();

    fireEvent.click(deleteButton('Jersey fabric'));
    expect(document.activeElement).toBe(
      screen.getByRole('group', {
        name: messageAbout('deleteLink.question', 'Jersey fabric'),
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Keep “Jersey fabric”' }));

    expect(document.activeElement).toBe(deleteButton('Jersey fabric'));
  });

  /*
   * Deleting the last link takes the button focus would have gone to with it,
   * and focus then falls to the document, where the next Tab starts over at
   * the top of the popup.
   */
  it('moves focus to the heading when the last link is deleted', async () => {
    await addSavedLink({ url: 'https://shop.example/first', title: 'Jersey fabric' });
    await givenTabOn('https://shop.example/second');
    await renderPopup();

    fireEvent.click(deleteButton('Jersey fabric'));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete “Jersey fabric”' }));

    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('heading', { name: 'Pinned on shop.example' }),
      ),
    );
  });

  it('keeps working in German', async () => {
    await givenTabOn('https://shop.example/item');
    Object.defineProperty(navigator, 'language', { configurable: true, get: () => 'de-DE' });

    await renderPopup();

    expect(screen.getByRole('button', { name: 'Pin setzen' })).toBeTruthy();
  });
});

/*
 * Popup and dashboard share one hook for this, and these are the dashboard's
 * rules asked of the popup. With state kept per row it answered differently,
 * and opening a second form left the first one standing.
 */
describe('one panel at a time', () => {
  async function listWith(...titles: string[]): Promise<void> {
    for (const [index, title] of titles.entries()) {
      await addSavedLink({ url: `https://shop.example/${index}`, title });
    }
    await givenTabOn('https://shop.example/current');
    await renderPopup();
  }

  it('closes the open form when another link is opened', async () => {
    await listWith('Jersey fabric', 'Cotton fabric');

    fireEvent.click(editButton('Jersey fabric'));
    fireEvent.click(editButton('Cotton fabric'));

    expect(screen.getAllByRole('form')).toHaveLength(1);
    expect(screen.getByRole('form', { name: 'Edit “Cotton fabric”' })).toBeTruthy();
  });

  it('leaves another link’s form alone when a question is dismissed', async () => {
    await listWith('Jersey fabric', 'Cotton fabric');

    fireEvent.click(editButton('Jersey fabric'));
    fireEvent.click(deleteButton('Cotton fabric'));
    fireEvent.click(screen.getByRole('button', { name: 'Keep “Cotton fabric”' }));

    expect(screen.getByRole('form', { name: 'Edit “Jersey fabric”' })).toBeTruthy();
  });

  it('shows the form and the question one at a time on a link', async () => {
    await listWith('Jersey fabric');

    fireEvent.click(editButton('Jersey fabric'));
    fireEvent.click(deleteButton('Jersey fabric'));

    expect(screen.queryByRole('form')).toBeNull();
    expect(editButton('Jersey fabric').getAttribute('aria-expanded')).toBe('false');
    expect(deleteButton('Jersey fabric').getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(editButton('Jersey fabric'));

    expect(deleteQuestion('Jersey fabric')).toBeNull();
    expect(screen.getByRole('form')).toBeTruthy();
    expect(deleteButton('Jersey fabric').getAttribute('aria-expanded')).toBe('false');
  });

  it('dismisses the question with Escape', async () => {
    await listWith('Jersey fabric');

    fireEvent.click(deleteButton('Jersey fabric'));
    fireEvent.keyDown(deleteQuestion('Jersey fabric') as HTMLElement, { key: 'Escape' });

    expect(deleteQuestion('Jersey fabric')).toBeNull();
    expect(document.activeElement).toBe(deleteButton('Jersey fabric'));
  });
});
