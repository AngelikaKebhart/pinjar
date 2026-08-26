// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { ThemeProvider } from '@/src/components/ThemeProvider';
import { interpolate } from '@/src/i18n/format';
import { TranslationProvider } from '@/src/i18n/TranslationProvider';
import { CATALOGS } from '@/src/i18n/messages';
import { addSavedLink, getSavedLinks } from '@/src/lib/storage';
import App from './App';

const en = CATALOGS.en;

async function renderDashboard(): Promise<void> {
  render(
    <ThemeProvider>
      <TranslationProvider>
        <App />
      </TranslationProvider>
    </ThemeProvider>,
  );

  // The heading is there immediately, the list only once storage has answered.
  // The visible count is the first thing that shows it has, in either language.
  //
  // Deliberately not the announced count: that one is set by an effect a render
  // later, so waiting for it means waiting past the render this helper is
  // actually after. Whoever needs the announcement waits for it themselves.
  await waitFor(() => {
    expect(shownCount()).toBeTruthy();
  });
}

/** The count as shown on screen, which updates on every keystroke. */
function shownCount(): string {
  return document.querySelector('main p[aria-hidden="true"]')?.textContent ?? '';
}

/** The count as announced to assistive technology, which lags behind on purpose. */
function announcedCount(): string {
  return document.querySelector('.sr-only[aria-live="polite"]')?.textContent ?? '';
}

/** An English message with its placeholders filled in, as a card shows it. */
function messageAbout(key: string, title: string): string {
  return interpolate(en[key] ?? '', { title });
}

/** The edit form, to tell its fields apart from the filter bar's. */
function editForm(): HTMLElement {
  return screen.getByRole('form');
}

/** Saves a link and returns it, failing loudly if it could not be stored. */
async function save(draft: Parameters<typeof addSavedLink>[0]) {
  const link = await addSavedLink(draft);
  if (link === null) {
    throw new Error(`Expected ${draft.url} to be storable`);
  }
  return link;
}

/** Opens one card's form the way a user does, and waits for it to be there. */
async function startEditing(title: string): Promise<void> {
  fireEvent.click(within(cardOf(title)).getByRole('button', { name: `Edit “${title}”` }));
  await screen.findByLabelText(en['dashboard.link.title'] ?? '');
}

function cardOf(title: string): HTMLElement {
  const card = screen.getByRole('link', { name: title }).closest('article');
  if (card === null) {
    throw new Error(`No card found for ${title}`);
  }
  return card;
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
});

afterEach(() => {
  cleanup();
});

describe('the list', () => {
  it('shows every saved link, whatever site it came from', async () => {
    await save({ url: 'https://shop.example/item', title: 'Jersey fabric' });
    await save({ url: 'https://other.example/item', title: 'A recipe' });

    await renderDashboard();

    expect(screen.getByRole('link', { name: 'Jersey fabric' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'A recipe' })).toBeTruthy();
  });

  it('counts them', async () => {
    await save({ url: 'https://shop.example/item', title: 'Jersey fabric' });
    await save({ url: 'https://other.example/item', title: 'A recipe' });

    await renderDashboard();

    expect(shownCount()).toBe('2 saved links');
  });

  it('shows the newest first', async () => {
    await save({ url: 'https://shop.example/older', title: 'Older find' });
    await save({ url: 'https://shop.example/newer', title: 'Newer find' });

    await renderDashboard();

    const titles = screen
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent);
    expect(titles).toEqual(['Newer find', 'Older find']);
  });

  it('explains what to do when there is nothing yet', async () => {
    await renderDashboard();

    expect(screen.getByText(en['dashboard.savedLinks.empty'] ?? '')).toBeTruthy();
  });

  it('opens a link in a new tab, leaving the dashboard where it is', async () => {
    await save({ url: 'https://shop.example/item', title: 'Jersey fabric' });

    await renderDashboard();

    const link = screen.getByRole('link', { name: 'Jersey fabric' });
    expect(link.getAttribute('href')).toBe('https://shop.example/item');
    expect(link.getAttribute('target')).toBe('_blank');
  });

  // The popup can save while this tab sits open.
  it('picks up a link saved elsewhere', async () => {
    await renderDashboard();

    await save({ url: 'https://shop.example/item', title: 'Jersey fabric' });

    expect(await screen.findByRole('link', { name: 'Jersey fabric' })).toBeTruthy();
  });
});

describe('what a card shows', () => {
  it('shows where the link leads', async () => {
    await save({ url: 'https://shop.example/item', title: 'Jersey fabric' });

    await renderDashboard();

    expect(within(cardOf('Jersey fabric')).getByText(/shop\.example/)).toBeTruthy();
  });

  it('shows the organizing fields the user filled in', async () => {
    await save({
      url: 'https://shop.example/item',
      title: 'Jersey fabric',
      category: 'Fabrics',
      tags: ['jersey', 'blue'],
      note: 'Two metres are enough',
      status: { kind: 'custom', label: 'Bought' },
    });

    await renderDashboard();

    const card = within(cardOf('Jersey fabric'));
    expect(card.getByText('Fabrics')).toBeTruthy();
    expect(card.getByText('jersey')).toBeTruthy();
    expect(card.getByText('blue')).toBeTruthy();
    expect(card.getByText('Two metres are enough')).toBeTruthy();
    expect(card.getByText('Bought')).toBeTruthy();
  });

  // Empty rows would only add labels with nothing behind them.
  it('leaves out what was never filled in', async () => {
    await save({ url: 'https://shop.example/item', title: 'Jersey fabric' });

    await renderDashboard();

    const card = within(cardOf('Jersey fabric'));
    expect(card.queryByText(en['dashboard.link.category'] ?? '')).toBeNull();
    expect(card.queryByText(en['dashboard.link.tags'] ?? '')).toBeNull();
    expect(card.queryByText(en['dashboard.link.note'] ?? '')).toBeNull();
  });

  it('shows the preview image with the title as its description', async () => {
    await save({
      url: 'https://shop.example/item',
      title: 'Jersey fabric',
      imageUrl: 'https://shop.example/preview.jpg',
    });

    await renderDashboard();

    const image = screen.getByRole('img', { name: 'Jersey fabric' });
    expect(image.getAttribute('src')).toBe('https://shop.example/preview.jpg');
  });

  // Loading a preview would otherwise tell the shop's server that someone is
  // looking at their page from a wishlist.
  it('loads the preview without telling the site where from', async () => {
    await save({
      url: 'https://shop.example/item',
      title: 'Jersey fabric',
      imageUrl: 'https://shop.example/preview.jpg',
    });

    await renderDashboard();

    const image = screen.getByRole('img', { name: 'Jersey fabric' });
    expect(image.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(image.getAttribute('loading')).toBe('lazy');
  });

  it('shows no image when the page had none', async () => {
    await save({ url: 'https://shop.example/item', title: 'Jersey fabric' });

    await renderDashboard();

    expect(screen.queryByRole('img')).toBeNull();
  });

  // These URLs are months old by the time anyone looks at them.
  it('drops a preview that cannot be loaded', async () => {
    await save({
      url: 'https://shop.example/item',
      title: 'Jersey fabric',
      imageUrl: 'https://shop.example/gone.jpg',
    });
    await renderDashboard();

    fireEvent.error(screen.getByRole('img', { name: 'Jersey fabric' }));

    expect(screen.queryByRole('img')).toBeNull();
  });
});

describe('deleting', () => {
  it('removes the link once the question is answered', async () => {
    await save({ url: 'https://shop.example/item', title: 'Jersey fabric' });
    await renderDashboard();

    fireEvent.click(screen.getByRole('button', { name: 'Delete “Jersey fabric”' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete “Jersey fabric”' }));

    await vi.waitFor(async () => {
      await expect(getSavedLinks()).resolves.toEqual([]);
    });
  });

  // A single stray click must not cost a saved link (WCAG 3.3.4).
  it('does not delete on the first click', async () => {
    await save({ url: 'https://shop.example/item', title: 'Jersey fabric' });
    await renderDashboard();

    fireEvent.click(screen.getByRole('button', { name: 'Delete “Jersey fabric”' }));

    await expect(getSavedLinks()).resolves.toHaveLength(1);
  });

  it('asks about the right link when several are listed', async () => {
    await save({ url: 'https://shop.example/first', title: 'Jersey fabric' });
    await save({ url: 'https://shop.example/second', title: 'A recipe' });

    await renderDashboard();

    expect(screen.getByRole('button', { name: 'Delete “A recipe”' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete “Jersey fabric”' })).toBeTruthy();
  });

  /*
   * In the buttons' labels alone, the question is readable to a screen reader
   * and to nobody else — and three cards that look alike leave everyone else
   * guessing which one is about to go.
   */
  it('names the link in the question itself', async () => {
    await save({ url: 'https://shop.example/item', title: 'Jersey fabric' });
    await renderDashboard();

    fireEvent.click(screen.getByRole('button', { name: 'Delete “Jersey fabric”' }));

    expect(screen.getByText(messageAbout('deleteLink.question', 'Jersey fabric'))).toBeTruthy();
  });

  /*
   * The deleted card cannot report its own disappearance, and the count that
   * follows says how many are left rather than what just happened.
   */
  it('says which link was deleted', async () => {
    await save({ url: 'https://shop.example/item', title: 'Jersey fabric' });
    await renderDashboard();

    fireEvent.click(screen.getByRole('button', { name: 'Delete “Jersey fabric”' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete “Jersey fabric”' }));

    expect(
      await screen.findByText(messageAbout('linkFeedback.removed', 'Jersey fabric')),
    ).toBeTruthy();
  });

  /*
   * Deleting a card takes the focus with it unless it is handed on. Left
   * behind, it falls to the document and the next Tab starts again at the top
   * of a page that may be very long.
   */
  it('hands focus to the link left behind', async () => {
    await save({ url: 'https://shop.example/first', title: 'Jersey fabric' });
    await save({ url: 'https://shop.example/second', title: 'A recipe' });
    await renderDashboard();

    fireEvent.click(screen.getByRole('button', { name: 'Delete “Jersey fabric”' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete “Jersey fabric”' }));

    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Edit “A recipe”' })),
    );
  });

  // With nothing left to hand it to, the heading above the list takes it.
  it('hands focus to the heading when the last link goes', async () => {
    await save({ url: 'https://shop.example/item', title: 'Jersey fabric' });
    await renderDashboard();

    fireEvent.click(screen.getByRole('button', { name: 'Delete “Jersey fabric”' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete “Jersey fabric”' }));

    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('heading', { name: en['dashboard.savedLinks.heading'] ?? '' }),
      ),
    );
  });
});

describe('accessibility', () => {
  it('announces how many links are listed', async () => {
    await save({ url: 'https://shop.example/item', title: 'Jersey fabric' });

    await renderDashboard();

    await waitFor(() => expect(announcedCount()).toBe('1 saved link'));
  });

  // Read out once, not twice: the visible line says the same thing and is
  // hidden from assistive technology for exactly that reason.
  it('carries the count in one place only', async () => {
    await save({ url: 'https://shop.example/item', title: 'Jersey fabric' });

    await renderDashboard();

    // The one match left after ignoring the visible line is the live region,
    // which fills a render after the count itself.
    await waitFor(() =>
      expect(screen.getAllByText('1 saved link', { ignore: '[aria-hidden="true"]' })).toHaveLength(
        1,
      ),
    );
  });

  it('keeps the heading order intact', async () => {
    await save({ url: 'https://shop.example/item', title: 'Jersey fabric' });

    await renderDashboard();

    const levels = screen
      .getAllByRole('heading')
      .map((heading) => Number(heading.tagName.slice(1)));
    // The wordmark, filters, the list, one card. The data heading belongs to
    // the dialog and is only there while that is open.
    expect(levels).toEqual([1, 2, 2, 3]);
  });

  /*
   * The data dialog is only shown once the links are known, and it is also what
   * reports the deletion. An emptied store therefore has to arrive as "nothing
   * saved" rather than as "not known yet", or the dialog would empty itself at
   * the very moment it has something to say.
   */
  it('stays whole after everything was deleted', async () => {
    await save({ url: 'https://shop.example/jersey', title: 'Jersey fabric' });
    await renderDashboard();

    fireEvent.click(screen.getByRole('button', { name: en['data.heading'] }));
    fireEvent.click(await screen.findByRole('button', { name: en['data.deleteAll.action'] }));
    fireEvent.click(screen.getByRole('button', { name: en['data.deleteAll.confirm'] }));

    await waitFor(() =>
      expect(screen.getByText(en['dashboard.savedLinks.empty'] ?? '')).toBeTruthy(),
    );
    expect(screen.getByRole('button', { name: en['data.export.action'] })).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('works in German too', async () => {
    Object.defineProperty(navigator, 'language', { configurable: true, get: () => 'de-DE' });
    await save({ url: 'https://shop.example/item', title: 'Jersey fabric', category: 'Stoffe' });

    await renderDashboard();

    expect(within(cardOf('Jersey fabric')).getByText('Kategorie')).toBeTruthy();
    expect(screen.getByRole('button', { name: '„Jersey fabric“ löschen' })).toBeTruthy();
  });

  // The built-in status is translated, the user's own wording never is.
  it('translates the built-in status but leaves a custom one alone', async () => {
    await save({ url: 'https://shop.example/first', title: 'Default status' });
    await save({
      url: 'https://shop.example/second',
      title: 'Custom status',
      status: { kind: 'custom', label: 'Gekauft' },
    });

    await renderDashboard();

    expect(within(cardOf('Default status')).getByText('Saved')).toBeTruthy();
    expect(within(cardOf('Custom status')).getByText('Gekauft')).toBeTruthy();
  });
});

describe('editing a link', () => {
  /** Opens the form on the card of the given link. */
  /**
   * Adds a category the way a first one is made: pick "add a new one", type
   * into the field that takes the dropdown's place, confirm with Enter.
   */
  function addCategory(name: string): void {
    const field = () => within(editForm()).getByLabelText('Category');
    fireEvent.change(field(), { target: { value: 'new' } });
    fireEvent.change(field(), { target: { value: name } });
    fireEvent.keyDown(field(), { key: 'Enter' });
  }

  it('stores what was changed', async () => {
    const link = await save({ url: 'https://shop.example/item', title: 'Jersey fabric' });
    await renderDashboard();

    await startEditing('Jersey fabric');
    addCategory('Fabrics');
    fireEvent.change(within(editForm()).getByLabelText('New tags'), {
      target: { value: 'jersey, blue' },
    });
    fireEvent.change(within(editForm()).getByLabelText('Note'), {
      target: { value: 'Two metres' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(async () => {
      await expect(getSavedLinks()).resolves.toMatchObject([
        { id: link.id, category: 'Fabrics', tags: ['jersey', 'blue'], note: 'Two metres' },
      ]);
    });
  });

  it('shows the change on the card without a reload', async () => {
    await save({ url: 'https://shop.example/item', title: 'Jersey fabric' });
    await renderDashboard();

    await startEditing('Jersey fabric');
    addCategory('Fabrics');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Fabrics')).toBeTruthy();
  });

  it('closes the form again once saved', async () => {
    await save({ url: 'https://shop.example/item', title: 'Jersey fabric' });
    await renderDashboard();

    await startEditing('Jersey fabric');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.queryByRole('form')).toBeNull();
    });
  });

  it('changes nothing when the edit is cancelled', async () => {
    await save({ url: 'https://shop.example/item', title: 'Jersey fabric' });
    await renderDashboard();

    await startEditing('Jersey fabric');
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Something else' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await expect(getSavedLinks()).resolves.toMatchObject([{ title: 'Jersey fabric' }]);
  });

  // Editing one card must not open the form on every card in the list.
  it('edits only the card it was started on', async () => {
    await save({ url: 'https://shop.example/first', title: 'Jersey fabric' });
    await save({ url: 'https://shop.example/second', title: 'Cotton fabric' });
    await renderDashboard();

    await startEditing('Jersey fabric');

    expect(screen.getAllByRole('form')).toHaveLength(1);
  });

  /*
   * One form at a time, and the list is what enforces it. While each card kept
   * its own state, a long list could end up with a screenful of open forms and
   * nothing saying where one ended and the next began.
   */
  it('closes the open form when another card is opened', async () => {
    await save({ url: 'https://shop.example/first', title: 'Jersey fabric' });
    await save({ url: 'https://shop.example/second', title: 'Cotton fabric' });
    await renderDashboard();

    await startEditing('Jersey fabric');
    await startEditing('Cotton fabric');

    expect(screen.getAllByRole('form')).toHaveLength(1);
    expect(screen.getByRole('form', { name: 'Edit “Cotton fabric”' })).toBeTruthy();
  });

  /*
   * The buttons used to be taken away while the form was open, which left the
   * way out at the foot of the form and made deleting a link one had just
   * looked at a two-step job.
   */
  it('keeps both buttons in reach while the form is open', async () => {
    await save({ url: 'https://shop.example/item', title: 'Jersey fabric' });
    await renderDashboard();

    await startEditing('Jersey fabric');

    const card = cardOf('Jersey fabric');
    expect(within(card).getByRole('button', { name: 'Edit “Jersey fabric”' })).toBeTruthy();
    expect(within(card).getByRole('button', { name: 'Delete “Jersey fabric”' })).toBeTruthy();
  });

  // The pencil and the waste bin are both disclosures now; this is what tells
  // a screen reader which of them has something open.
  it('says on the button whether the form is open', async () => {
    await save({ url: 'https://shop.example/item', title: 'Jersey fabric' });
    await renderDashboard();

    const button = () =>
      within(cardOf('Jersey fabric')).getByRole('button', { name: 'Edit “Jersey fabric”' });

    expect(button().getAttribute('aria-expanded')).toBe('false');

    await startEditing('Jersey fabric');

    expect(button().getAttribute('aria-expanded')).toBe('true');
  });

  it('closes the form when the same button is pressed again', async () => {
    await save({ url: 'https://shop.example/item', title: 'Jersey fabric' });
    await renderDashboard();

    await startEditing('Jersey fabric');
    const button = within(cardOf('Jersey fabric')).getByRole('button', {
      name: 'Edit “Jersey fabric”',
    });
    fireEvent.click(button);

    expect(screen.queryByRole('form')).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  // The same key that dismisses the delete question beside it.
  it('closes the form on Escape', async () => {
    await save({ url: 'https://shop.example/item', title: 'Jersey fabric' });
    await renderDashboard();

    await startEditing('Jersey fabric');
    fireEvent.keyDown(editForm(), { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('form')).toBeNull());
  });
});

// What the separately stored lists in docs/concept.md §4 are for: something
// typed once on one link is offered on the next one, so it cannot end up as
// two near-identical categories that differ by a typo.
describe('reusing what was entered before', () => {
  function addNewCategory(name: string): void {
    const field = () => within(editForm()).getByLabelText('Category');
    fireEvent.change(field(), { target: { value: 'new' } });
    fireEvent.change(field(), { target: { value: name } });
    fireEvent.keyDown(field(), { key: 'Enter' });
  }

  it('offers a category on the next link once it exists', async () => {
    await save({ url: 'https://shop.example/first', title: 'First find' });
    await save({ url: 'https://shop.example/second', title: 'Second find' });
    await renderDashboard();

    await startEditing('First find');
    addNewCategory('Fabrics');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.queryByRole('form')).toBeNull());
    await startEditing('Second find');
    fireEvent.change(await within(editForm()).findByLabelText('Category'), {
      target: { value: 'known:Fabrics' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(async () => {
      await expect(getSavedLinks()).resolves.toMatchObject([
        { title: 'Second find', category: 'Fabrics' },
        { title: 'First find', category: 'Fabrics' },
      ]);
    });
  });

  it('offers a tag on the next link once it exists', async () => {
    await save({ url: 'https://shop.example/first', title: 'First find' });
    await save({ url: 'https://shop.example/second', title: 'Second find' });
    await renderDashboard();

    await startEditing('First find');
    fireEvent.change(within(editForm()).getByLabelText('New tags'), {
      target: { value: 'jersey' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.queryByRole('form')).toBeNull());
    await startEditing('Second find');

    // Now a tick box rather than something to type again.
    fireEvent.click(await within(editForm()).findByLabelText('jersey'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(async () => {
      await expect(getSavedLinks()).resolves.toMatchObject([
        { title: 'Second find', tags: ['jersey'] },
        { title: 'First find', tags: ['jersey'] },
      ]);
    });
  });
});

describe('searching and filtering', () => {
  /** The filter bar, to tell its controls apart from an open edit form. */
  function filters(): HTMLElement {
    const heading = screen.getByRole('heading', { name: en['filters.heading'] ?? '' });
    const section = heading.closest('section');
    if (section === null) {
      throw new Error('No filter section found');
    }
    return section;
  }

  function search(text: string): void {
    fireEvent.change(within(filters()).getByLabelText('Search'), { target: { value: text } });
  }

  function listedTitles(): string[] {
    return screen.getAllByRole('link').map((link) => link.textContent ?? '');
  }

  async function givenLinks(): Promise<void> {
    await save({
      url: 'https://shop.example/jersey',
      title: 'Blue jersey',
      category: 'Fabrics',
      tags: ['jersey', 'blue'],
      note: 'Two metres',
    });
    await save({
      url: 'https://shop.example/poplin',
      title: 'Cotton poplin',
      category: 'Fabrics',
      tags: ['cotton'],
      status: { kind: 'custom', label: 'Bought' },
    });
    await save({ url: 'https://shop.example/pattern', title: 'Sewing pattern' });
    await renderDashboard();
  }

  it('narrows the list down to what matches the text', async () => {
    await givenLinks();

    search('poplin');

    expect(listedTitles()).toEqual(['Cotton poplin']);
  });

  it('filters by category', async () => {
    await givenLinks();

    fireEvent.change(await within(filters()).findByLabelText('Category'), {
      target: { value: 'named:Fabrics' },
    });

    expect(listedTitles()).toEqual(['Cotton poplin', 'Blue jersey']);
  });

  it('can single out the links without a category', async () => {
    await givenLinks();

    fireEvent.change(within(filters()).getByLabelText('Category'), { target: { value: 'none' } });

    expect(listedTitles()).toEqual(['Sewing pattern']);
  });

  it('filters by status', async () => {
    await givenLinks();

    fireEvent.change(await within(filters()).findByLabelText('Status'), {
      target: { value: 'custom:Bought' },
    });

    expect(listedTitles()).toEqual(['Cotton poplin']);
  });

  it('filters by tag', async () => {
    await givenLinks();

    fireEvent.click(await within(filters()).findByLabelText('jersey'));

    expect(listedTitles()).toEqual(['Blue jersey']);
  });

  it('filters by domain', async () => {
    await save({ url: 'https://shop.example/jersey', title: 'Blue jersey' });
    await save({ url: 'https://blog.example/post', title: 'Sewing tutorial' });
    await renderDashboard();

    fireEvent.change(await within(filters()).findByLabelText('Domain'), {
      target: { value: 'named:blog.example' },
    });

    expect(listedTitles()).toEqual(['Sewing tutorial']);
  });

  it('combines a filter with the search', async () => {
    await givenLinks();

    fireEvent.change(await within(filters()).findByLabelText('Category'), {
      target: { value: 'named:Fabrics' },
    });
    search('poplin');

    expect(listedTitles()).toEqual(['Cotton poplin']);
  });

  it('says how many of how many are left', async () => {
    await givenLinks();

    search('jersey');

    expect(shownCount()).toBe('1 of 3 shown');
  });

  // "Nothing saved yet" would be wrong and unhelpful here.
  it('explains an empty result differently from an empty list', async () => {
    await givenLinks();

    search('velvet');

    expect(screen.getByText(en['dashboard.savedLinks.noMatches'] ?? '')).toBeTruthy();
  });

  it('brings everything back when the filters are reset', async () => {
    await givenLinks();
    search('poplin');

    fireEvent.click(within(filters()).getByRole('button', { name: 'Reset filters' }));

    expect(listedTitles()).toHaveLength(3);
  });

  // A button that does nothing is one the user has to think about every time.
  it('offers no reset while nothing is filtered', async () => {
    await givenLinks();

    expect(within(filters()).queryByRole('button', { name: 'Reset filters' })).toBeNull();
  });

  // A category the user calls "all" or "none" must not be read as one of the
  // collective entries.
  it.each(['all', 'none'])('keeps a category named "%s" usable as a filter', async (name) => {
    await save({ url: 'https://shop.example/odd', title: 'Odd one', category: name });
    await save({ url: 'https://shop.example/other', title: 'Other one' });
    await renderDashboard();

    fireEvent.change(await within(filters()).findByLabelText('Category'), {
      target: { value: `named:${name}` },
    });

    expect(listedTitles()).toEqual(['Odd one']);
  });

  it('announces the result of a search once the typing stops', async () => {
    await givenLinks();

    search('jersey');

    await waitFor(() => expect(announcedCount()).toBe('1 of 3 shown'));
  });
});

// The filter bar stays mounted while a card below it is being edited, so it
// has to notice what that edit adds — otherwise a fresh category is only
// filterable after reloading the page.
describe('the filters and an open edit form', () => {
  function filters(): HTMLElement {
    const heading = screen.getByRole('heading', { name: en['filters.heading'] ?? '' });
    const section = heading.closest('section');
    if (section === null) {
      throw new Error('No filter section found');
    }
    return section;
  }

  function enterInForm(label: string, value: string): void {
    fireEvent.change(within(editForm()).getByLabelText(label), { target: { value } });
  }

  it('offers a category added on a card without a reload', async () => {
    await save({ url: 'https://shop.example/item', title: 'Jersey fabric' });
    await renderDashboard();

    await startEditing('Jersey fabric');
    enterInForm('Category', 'new');
    enterInForm('Category', 'Fabrics');
    fireEvent.keyDown(within(editForm()).getByLabelText('Category'), { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await within(filters()).findByRole('option', { name: 'Fabrics' })).toBeTruthy();
  });

  it('offers a tag added on a card without a reload', async () => {
    await save({ url: 'https://shop.example/item', title: 'Jersey fabric' });
    await renderDashboard();

    await startEditing('Jersey fabric');
    enterInForm('New tags', 'jersey');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await within(filters()).findByLabelText('jersey')).toBeTruthy();
  });

  it('offers a status added on a card without a reload', async () => {
    await save({ url: 'https://shop.example/item', title: 'Jersey fabric' });
    await renderDashboard();

    await startEditing('Jersey fabric');
    enterInForm('Status', 'new');
    enterInForm('Status', 'Ordered');
    fireEvent.keyDown(within(editForm()).getByLabelText('Status'), { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await within(filters()).findByRole('option', { name: 'Ordered' })).toBeTruthy();
  });
});

// Every option on offer leads somewhere: each filter lists what the others
// leave, so nothing can be picked that is bound to come back empty.
describe('the filters narrowing each other', () => {
  function filters(): HTMLElement {
    const heading = screen.getByRole('heading', { name: en['filters.heading'] ?? '' });
    const section = heading.closest('section');
    if (section === null) {
      throw new Error('No filter section found');
    }
    return section;
  }

  function chooseCategory(value: string): void {
    fireEvent.change(within(filters()).getByLabelText('Category'), { target: { value } });
  }

  function offeredTags(): string[] {
    return within(filters())
      .queryAllByRole('checkbox')
      .map((box) => box.closest('label')?.textContent ?? '');
  }

  /** The statuses on offer, without the "any status" entry that leads the list. */
  function offeredStatuses(): string[] {
    const select = within(filters()).getByLabelText('Status') as HTMLSelectElement;
    return [...select.options].slice(1).map((option) => option.textContent ?? '');
  }

  async function givenLinks(): Promise<void> {
    await save({
      url: 'https://shop.example/jersey',
      title: 'Blue jersey',
      category: 'Fabrics',
      tags: ['jersey', 'blue'],
    });
    await save({
      url: 'https://shop.example/pattern',
      title: 'Dress pattern',
      category: 'Patterns',
      tags: ['dress'],
      status: { kind: 'custom', label: 'Bought' },
    });
    await renderDashboard();
    await within(filters()).findByLabelText('jersey');
  }

  it('offers only the tags used in the chosen category', async () => {
    await givenLinks();

    chooseCategory('named:Patterns');

    await waitFor(() => expect(offeredTags()).toEqual(['dress']));
  });

  it('offers only the statuses left by the chosen category', async () => {
    await givenLinks();

    chooseCategory('named:Fabrics');

    await waitFor(() => {
      expect(within(filters()).queryByRole('option', { name: 'Bought' })).toBeNull();
    });
  });

  // Otherwise the dropdown would collapse to the value already picked and
  // there would be no way to switch to another category.
  it('keeps offering the other categories', async () => {
    await givenLinks();

    chooseCategory('named:Fabrics');

    expect(within(filters()).getByRole('option', { name: 'Patterns' })).toBeTruthy();
  });

  it('brings the hidden tags back when the category filter is dropped', async () => {
    await givenLinks();
    chooseCategory('named:Patterns');
    await waitFor(() => expect(offeredTags()).toEqual(['dress']));

    chooseCategory('all');

    await waitFor(() => expect(offeredTags()).toEqual(['blue', 'dress', 'jersey']));
  });

  // Sorted by name rather than by whichever link was saved last, so a tag
  // keeps its place while the list is being narrowed.
  it('sorts the tags by name', async () => {
    await givenLinks();

    expect(offeredTags()).toEqual(['blue', 'dress', 'jersey']);
  });

  // By the label on screen, not by the stored status: the built-in one is the
  // only translated status (§4), so ordering it by its key would put it
  // somewhere else than where the user reads it. Without this the list was
  // in order of first appearance and shuffled itself on every edit.
  it('sorts the statuses by the label shown', async () => {
    // Saved newest last, so first appearance in the list would be the reverse
    // of the order asserted below.
    await save({
      url: 'https://shop.example/first',
      title: 'Wrapped up',
      status: { kind: 'custom', label: 'Zebra print ordered' },
    });
    await save({
      url: 'https://shop.example/second',
      title: 'Waiting',
      status: { kind: 'custom', label: 'Asked about it' },
    });
    await save({ url: 'https://shop.example/third', title: 'Still wishlisted' });

    await renderDashboard();
    await within(filters()).findByRole('option', { name: 'Asked about it' });

    expect(offeredStatuses()).toEqual(['Asked about it', 'Saved', 'Zebra print ordered']);
  });
});

/*
 * The form and the delete question are two separate disclosures, and every
 * test here exists because they were once a single "which panel is open"
 * value that could only ever show one of them. That made closing either one
 * reach further than it should.
 */
describe('the form and the delete question side by side', () => {
  // Dismissing a question on one card used to clear the whole list's editing
  // state, which took an unrelated card's open form with it.
  it('leaves another card’s form alone when a question is dismissed', async () => {
    await save({ url: 'https://shop.example/first', title: 'Jersey fabric' });
    await save({ url: 'https://shop.example/second', title: 'Cotton fabric' });
    await renderDashboard();

    await startEditing('Jersey fabric');
    fireEvent.click(screen.getByRole('button', { name: 'Delete “Cotton fabric”' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep “Cotton fabric”' }));

    expect(screen.getByRole('form', { name: 'Edit “Jersey fabric”' })).toBeTruthy();
  });

  /*
   * One panel per link at a time. The pencil and the basket are each drawn
   * filled while their own panel is up, so two filled buttons over a single
   * card would be saying that both are showing when only one can be.
   */
  it('closes the form when the question is opened on the same link', async () => {
    await save({ url: 'https://shop.example/item', title: 'Jersey fabric' });
    await renderDashboard();

    await startEditing('Jersey fabric');
    const card = cardOf('Jersey fabric');
    fireEvent.click(within(card).getByRole('button', { name: 'Delete “Jersey fabric”' }));

    expect(screen.queryByRole('form')).toBeNull();
    expect(deleteQuestion('Jersey fabric')).toBeTruthy();
    expect(
      within(card)
        .getByRole('button', { name: 'Edit “Jersey fabric”' })
        .getAttribute('aria-expanded'),
    ).toBe('false');
  });

  it('closes the question when the form is opened on the same link', async () => {
    await save({ url: 'https://shop.example/item', title: 'Jersey fabric' });
    await renderDashboard();

    const card = cardOf('Jersey fabric');
    fireEvent.click(within(card).getByRole('button', { name: 'Delete “Jersey fabric”' }));
    await startEditing('Jersey fabric');

    expect(deleteQuestion('Jersey fabric')).toBeNull();
    expect(screen.getByRole('form')).toBeTruthy();
    expect(
      within(card)
        .getByRole('button', { name: 'Delete “Jersey fabric”' })
        .getAttribute('aria-expanded'),
    ).toBe('false');
  });

  // The same key that closes the form, so there is one way out to learn.
  it('dismisses the question with Escape and hands focus back', async () => {
    await save({ url: 'https://shop.example/item', title: 'Jersey fabric' });
    await renderDashboard();

    const button = within(cardOf('Jersey fabric')).getByRole('button', {
      name: 'Delete “Jersey fabric”',
    });
    fireEvent.click(button);

    fireEvent.keyDown(deleteQuestion('Jersey fabric') as HTMLElement, { key: 'Escape' });

    expect(deleteQuestion('Jersey fabric')).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  /*
   * Both buttons report the same way, because both are the same component.
   * The delete button used to say `aria-pressed` — "this control is switched
   * on" — for something that is a disclosure like the pencil beside it.
   */
  it('says on the delete button whether the question is open', async () => {
    await save({ url: 'https://shop.example/item', title: 'Jersey fabric' });
    await renderDashboard();

    const button = () =>
      within(cardOf('Jersey fabric')).getByRole('button', { name: 'Delete “Jersey fabric”' });

    expect(button().getAttribute('aria-expanded')).toBe('false');
    expect(button().getAttribute('aria-controls')).toBeTruthy();

    fireEvent.click(button());

    expect(button().getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById(button().getAttribute('aria-controls') ?? '')).toBe(
      deleteQuestion('Jersey fabric'),
    );
  });

  /*
   * Focus is moved into the question when it opens, which needs the group to
   * be focusable — but only programmatically. At tabIndex 0 it became a stop
   * on the way through the page that answered to Tab and then did nothing.
   */
  it('keeps the question out of the tab order', async () => {
    await save({ url: 'https://shop.example/item', title: 'Jersey fabric' });
    await renderDashboard();

    fireEvent.click(screen.getByRole('button', { name: 'Delete “Jersey fabric”' }));

    expect(deleteQuestion('Jersey fabric')?.getAttribute('tabindex')).toBe('-1');
  });
});
