// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { CATALOGS } from '@/src/i18n/messages';
import { TranslationProvider } from '@/src/i18n/TranslationProvider';
import { ManageMenu } from './ManageMenu';

const en = CATALOGS.en;

/**
 * The wiring between the cog, the panel of destinations and the dialogs behind
 * them. What each dialog does once open is its own test's business.
 */
async function renderMenu() {
  render(
    <TranslationProvider>
      <ManageMenu />
    </TranslationProvider>,
  );

  return screen.findByRole('button', { name: en['manage.heading'] });
}

const openMenu = async () => fireEvent.click(await renderMenu());

describe('ManageMenu', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    Object.defineProperty(navigator, 'language', { configurable: true, get: () => 'en-US' });
  });

  afterEach(cleanup);

  it('keeps its destinations out of the way until the cog is pressed', async () => {
    await renderMenu();

    expect(screen.queryByRole('button', { name: en['data.heading'] })).toBeNull();
  });

  // The cog reveals a panel rather than opening a dialog, and says which of the
  // two it is doing (WCAG 2.2 AA, 4.1.2).
  it('says whether its panel is showing', async () => {
    const cog = await renderMenu();

    expect(cog.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(cog);

    expect(cog.getAttribute('aria-expanded')).toBe('true');
  });

  it('names each destination in words, under a heading of its own', async () => {
    await openMenu();

    expect(screen.getByRole('heading', { name: en['manage.heading'] })).toBeTruthy();

    for (const destination of [
      en['organization.category.heading'],
      en['organization.tag.heading'],
      en['organization.status.heading'],
      en['data.heading'],
      en['contact.heading'],
    ]) {
      expect(screen.getByRole('button', { name: destination })).toBeTruthy();
    }
  });

  /*
   * The rule is read back, not merely drawn: it is what says the three lists
   * of values are one group and the rest another (WCAG 2.2 AA, 1.3.1).
   */
  it('separates the lists of values from the rest', async () => {
    await openMenu();

    expect(screen.getByRole('separator')).toBeTruthy();
  });

  // The three lists share one component, and telling it which kind it is
  // showing is the whole of what the menu does for them.
  it('opens each list of values under its own heading', async () => {
    const cog = await renderMenu();

    for (const heading of [
      en['organization.category.heading'],
      en['organization.tag.heading'],
      en['organization.status.heading'],
    ]) {
      fireEvent.click(cog);
      fireEvent.click(screen.getByRole('button', { name: heading }));

      expect(await screen.findByRole('dialog', { name: heading })).toBeTruthy();

      fireEvent.click(screen.getByRole('button', { name: en['dialog.close'] }));
    }
  });

  // Said by the entry, not by the cog: the cog only opens the panel.
  it('says that an entry opens a dialog', async () => {
    await openMenu();

    expect(
      screen.getByRole('button', { name: en['data.heading'] }).getAttribute('aria-haspopup'),
    ).toBe('dialog');
  });

  it('opens the dialog and takes the panel away with it', async () => {
    await openMenu();
    fireEvent.click(screen.getByRole('button', { name: en['data.heading'] }));

    expect(await screen.findByRole('dialog', { name: en['data.heading'] })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: en['manage.heading'] })).toBeNull();
  });

  /*
   * The dialog reports every way it is closed, and this is what that is for:
   * without it the menu would believe it is still open and the entry would do
   * nothing the second time.
   */
  it('opens the dialog again after it was closed', async () => {
    const cog = await renderMenu();

    fireEvent.click(cog);
    fireEvent.click(screen.getByRole('button', { name: en['data.heading'] }));
    fireEvent.click(await screen.findByRole('button', { name: en['dialog.close'] }));

    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(cog);
    fireEvent.click(screen.getByRole('button', { name: en['data.heading'] }));

    expect(screen.getByRole('dialog', { name: en['data.heading'] })).toBeTruthy();
  });
});
