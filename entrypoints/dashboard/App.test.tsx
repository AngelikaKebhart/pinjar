// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { TranslationProvider } from '@/src/i18n/TranslationProvider';
import { CATALOGS } from '@/src/i18n/messages';
import { addSavedLink, getSavedLinks } from '@/src/lib/storage';
import App from './App';

const en = CATALOGS.en;

async function renderDashboard(): Promise<void> {
  render(
    <TranslationProvider>
      <App />
    </TranslationProvider>,
  );

  // The heading is there immediately, the list only once storage has answered.
  // The count is the first thing that shows it has, in either language.
  await waitFor(() => {
    expect(document.querySelector('[aria-live="polite"]')?.textContent).toBeTruthy();
  });
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

    expect(screen.getByText('2 saved links')).toBeTruthy();
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

    expect(screen.getByText('1 saved link').getAttribute('aria-live')).toBe('polite');
  });

  it('keeps the heading order intact', async () => {
    await save({ url: 'https://shop.example/item', title: 'Jersey fabric' });

    await renderDashboard();

    const levels = screen
      .getAllByRole('heading')
      .map((heading) => Number(heading.tagName.slice(1)));
    expect(levels).toEqual([1, 2, 3, 2]);
  });

  it('works in German too', async () => {
    Object.defineProperty(navigator, 'language', { configurable: true, get: () => 'de-DE' });
    await save({ url: 'https://shop.example/item', title: 'Jersey fabric', category: 'Stoffe' });

    await renderDashboard();

    expect(screen.getByText('Kategorie')).toBeTruthy();
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
