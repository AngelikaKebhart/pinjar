import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { getCurrentPage, saveCurrentPage, type CurrentPage } from './current-page';
import type { PageMetadata } from './page-metadata';
import { getSavedLinks } from './storage';

/**
 * Stands in for the injection, which no fake browser can actually run.
 *
 * The cast is needed because `vi.spyOn` resolves these APIs to their callback
 * overload, which is typed as returning nothing rather than a promise.
 */
function injection(): Mock {
  return vi.spyOn(fakeBrowser.scripting, 'executeScript') as unknown as Mock;
}

function givenPageReads(metadata: PageMetadata): void {
  injection().mockResolvedValue([{ result: metadata, frameId: 0 }]);
}

function givenPageCannotBeRead(): void {
  injection().mockRejectedValue(new Error('Cannot access contents of the page'));
}

function aPage(overrides: Partial<CurrentPage> = {}): CurrentPage {
  return {
    tabId: 1,
    url: 'https://shop.example/item',
    title: 'Jersey — MegaShop',
    domain: 'shop.example',
    ...overrides,
  };
}

beforeEach(() => {
  fakeBrowser.reset();
  vi.restoreAllMocks();
});

describe('describing the current page', () => {
  /**
   * The popup asks for the active tab of the current window, so the fake needs
   * a focused window for that query to match anything — a real browser always
   * has one.
   */
  async function givenActiveTab(url: string): Promise<void> {
    const window = await fakeBrowser.windows.create({ focused: true });
    await fakeBrowser.tabs.create({ url, active: true, windowId: window?.id });
  }

  it('reports the active tab', async () => {
    await givenActiveTab('https://shop.example/item');

    await expect(getCurrentPage()).resolves.toMatchObject({
      url: 'https://shop.example/item',
      domain: 'shop.example',
    });
  });

  // The popup shows a message instead of a save button in this case.
  it('reports no domain for a page that cannot be saved', async () => {
    await givenActiveTab('chrome://extensions');

    await expect(getCurrentPage()).resolves.toMatchObject({ domain: null });
  });

  it('reports nothing when there is no tab to look at', async () => {
    await expect(getCurrentPage()).resolves.toBeNull();
  });
});

describe('saving the current page', () => {
  it('stores the page with what was read from it', async () => {
    givenPageReads({ title: 'Jersey fabric, blue', imageUrl: 'https://shop.example/p.jpg' });

    const outcome = await saveCurrentPage(aPage());

    expect(outcome).toMatchObject({ status: 'saved' });
    await expect(getSavedLinks()).resolves.toMatchObject([
      {
        url: 'https://shop.example/item',
        title: 'Jersey fabric, blue',
        imageUrl: 'https://shop.example/p.jpg',
        domain: 'shop.example',
      },
    ]);
  });

  it('runs the extraction in the tab the user is on', async () => {
    givenPageReads({ title: 'Jersey fabric', imageUrl: null });

    await saveCurrentPage(aPage({ tabId: 42 }));

    expect(fakeBrowser.scripting.executeScript).toHaveBeenCalledWith(
      expect.objectContaining({ target: { tabId: 42 } }),
    );
  });

  // Failing extraction is normal — browser pages, PDFs, a tab that navigated
  // away. None of it may cost the user the save.
  it('still saves when the page cannot be read', async () => {
    givenPageCannotBeRead();

    const outcome = await saveCurrentPage(aPage());

    expect(outcome).toMatchObject({ status: 'saved' });
    await expect(getSavedLinks()).resolves.toMatchObject([{ title: 'Jersey — MegaShop' }]);
  });

  it('falls back to the tab title when the page offers none', async () => {
    givenPageReads({ title: '', imageUrl: null });

    await saveCurrentPage(aPage());

    await expect(getSavedLinks()).resolves.toMatchObject([{ title: 'Jersey — MegaShop' }]);
  });

  it('refuses a page that has no domain to file it under', async () => {
    const outcome = await saveCurrentPage(aPage({ url: 'chrome://extensions', domain: null }));

    expect(outcome).toEqual({ status: 'unsupportedPage' });
    await expect(getSavedLinks()).resolves.toEqual([]);
  });

  it('does not read the page it is refusing', async () => {
    const executeScript = injection();

    await saveCurrentPage(aPage({ url: 'chrome://extensions', domain: null }));

    expect(executeScript).not.toHaveBeenCalled();
  });

  // Two entries for one address would only leave the user telling them apart.
  it('reports an address that is already on the list', async () => {
    givenPageReads({ title: 'Jersey fabric', imageUrl: null });
    await saveCurrentPage(aPage());

    const outcome = await saveCurrentPage(aPage());

    expect(outcome).toMatchObject({ status: 'alreadySaved' });
    await expect(getSavedLinks()).resolves.toHaveLength(1);
  });

  it('hands back the entry that already exists', async () => {
    givenPageReads({ title: 'Jersey fabric', imageUrl: null });
    const first = await saveCurrentPage(aPage());

    const second = await saveCurrentPage(aPage());

    expect(second).toEqual({
      status: 'alreadySaved',
      link: first.status === 'saved' ? first.link : undefined,
    });
  });
});
