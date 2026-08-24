// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { ThemeProvider } from '@/src/components/ThemeProvider';
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
  return document.querySelector('[aria-live="polite"]')?.textContent ?? '';
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

function cardOf(title: string): HTMLElement {
  const card = screen.getByRole('link', { name: title }).closest('article');
  if (card === null) {
    throw new Error(`No card found for ${title}`);
  }
  return card;
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
});

describe('accessibility', () => {
  // Once the card is gone there is no other sign that anything happened.
  it('announces the count so a deletion does not pass silently', async () => {
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
    // Title, filters, the list, one card, the data section, settings.
    expect(levels).toEqual([1, 2, 2, 3, 2, 2]);
  });

  /*
   * The data section is only shown once the links are known, and it is also
   * what reports the deletion. An emptied store therefore has to arrive as
   * "nothing saved" rather than as "not known yet", or the section would
   * vanish at the very moment it has something to say.
   */
  it('stays whole after everything was deleted', async () => {
    await save({ url: 'https://shop.example/jersey', title: 'Jersey fabric' });
    await renderDashboard();

    fireEvent.click(screen.getByRole('button', { name: en['data.deleteAll.action'] }));
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
  async function startEditing(title: string): Promise<void> {
    fireEvent.click(within(cardOf(title)).getByRole('button', { name: `Edit “${title}”` }));
    await screen.findByLabelText(en['dashboard.link.title'] ?? '');
  }

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

  async function startEditing(title: string): Promise<void> {
    fireEvent.click(within(cardOf(title)).getByRole('button', { name: `Edit “${title}”` }));
    await screen.findByLabelText(en['dashboard.link.title'] ?? '');
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

  async function startEditing(title: string): Promise<void> {
    fireEvent.click(within(cardOf(title)).getByRole('button', { name: `Edit “${title}”` }));
    await screen.findByLabelText(en['dashboard.link.title'] ?? '');
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
