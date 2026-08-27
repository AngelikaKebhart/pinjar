// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { CATALOGS } from '@/src/i18n/messages';
import { TranslationProvider } from '@/src/i18n/TranslationProvider';
import type { OrganizationKind } from '@/src/lib/organization';
import { addSavedLink, categories, getOrganizationValues, getSavedLinks } from '@/src/lib/storage';
import { OrganizationDialog } from './OrganizationDialog';

const en = CATALOGS.en;

/**
 * The one dialog behind the three manage entries: what it lists, what renaming
 * and deleting a value do to the saved links, and what it asks before merging
 * two of them.
 *
 * The storage layer underneath is covered by storage.test.ts; what is checked
 * here is that the interface reaches it, says what happened and never leaves
 * the keyboard without a place to stand. The modal behaviour itself belongs to
 * the browser and to Dialog — see DataDialog.test.tsx.
 */
async function renderDialog(kind: OrganizationKind, onClose = vi.fn()) {
  render(
    <TranslationProvider>
      <OrganizationDialog kind={kind} isOpen onClose={onClose} />
    </TranslationProvider>,
  );

  // Nothing renders until the provider has read the stored language, the dialog
  // is opened by an effect a moment later, and the list is read from storage
  // after that.
  await screen.findByRole('dialog', { name: en[`organization.${kind}.heading`] });

  return { onClose };
}

async function saveLink(url: string, fields: { category?: string; tags?: string[] }) {
  await addSavedLink({ url, title: url, ...fields });
}

const renameButton = (value: string) => screen.getByRole('button', { name: `Rename “${value}”` });

const deleteButton = (value: string) => screen.getByRole('button', { name: `Delete “${value}”` });

const nameField = (value: string) =>
  screen.getByLabelText(`New name for “${value}”`) as HTMLInputElement;

async function rename(from: string, to: string) {
  fireEvent.click(renameButton(from));
  fireEvent.change(nameField(from), { target: { value: to } });
  fireEvent.click(screen.getByRole('button', { name: en['organization.rename.save'] }));
}

describe('OrganizationDialog', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    Object.defineProperty(navigator, 'language', { configurable: true, get: () => 'en-US' });
  });

  afterEach(cleanup);

  it('lists every remembered value with what still hangs on it', async () => {
    await saveLink('https://shop.example/one', { category: 'Fabrics' });
    await saveLink('https://shop.example/two', { category: 'Fabrics' });
    await saveLink('https://shop.example/three', { category: 'Books' });

    await renderDialog('category');

    expect(await screen.findByText('Fabrics')).toBeTruthy();
    expect(screen.getByText('Books')).toBeTruthy();
    expect(screen.getByText('On 2 saved links')).toBeTruthy();
    expect(screen.getByText('On 1 saved link')).toBeTruthy();
  });

  /*
   * A count line rather than a live region: every number in it changes because
   * of an action the feedback line already announces (WCAG 2.2 AA, 4.1.3).
   */
  it('counts the values and how many of them are unused', async () => {
    await saveLink('https://shop.example/one', { category: 'Fabrics' });
    await categories.setValue(['Fabrics', 'Recipes']);

    await renderDialog('category');

    expect(await screen.findByText('2 categories. 1 of them is on no saved link.')).toBeTruthy();
  });

  /*
   * A category and a custom status outlive their last link on purpose, so
   * clearing them out is the user's decision and not the extension's. Tags are
   * the ones that go by themselves, which is why nothing here is ever offered
   * for them — see storage.test.ts.
   */
  it('offers to remove the unused values, and asks before it does', async () => {
    await saveLink('https://shop.example/one', { category: 'Fabrics' });
    await categories.setValue(['Fabrics', 'Recipes']);

    await renderDialog('category');
    await screen.findByText('Recipes');

    fireEvent.click(screen.getByRole('button', { name: 'Remove unused categories' }));
    expect(
      screen.getByText(
        'Your saved links stay exactly as they are — none of them uses these names. You can type any of them again at any time.',
      ),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Yes, remove' }));

    await waitFor(async () => {
      expect(await getOrganizationValues('category')).toEqual([{ value: 'Fabrics', usage: 1 }]);
    });

    expect(screen.getByText('1 unused category was removed.')).toBeTruthy();
    expect(await getSavedLinks()).toMatchObject([{ category: 'Fabrics' }]);
  });

  // A button that would do nothing is a button to read past every time.
  it('does not offer the removal while every value is in use', async () => {
    await saveLink('https://shop.example/one', { category: 'Fabrics' });

    await renderDialog('category');
    await screen.findByText('Fabrics');

    expect(screen.queryByRole('button', { name: 'Remove unused categories' })).toBeNull();
  });

  it('says so when nothing has been used yet', async () => {
    await renderDialog('status');

    expect(await screen.findByText('You have not added a status of your own yet.')).toBeTruthy();
  });

  it('renames a value on every link that carries it', async () => {
    await saveLink('https://shop.example/one', { category: 'Fabrcis' });

    await renderDialog('category');
    await screen.findByText('Fabrcis');

    await rename('Fabrcis', 'Fabrics');

    await waitFor(async () => {
      expect((await getSavedLinks())[0]?.category).toBe('Fabrics');
    });
    expect(screen.getByText('“Fabrcis” is now called “Fabrics”.')).toBeTruthy();
  });

  // Renaming onto a name that exists merges the two, which is right and still
  // not something to do behind the user's back (3.3.4).
  it('asks before it merges two values into one', async () => {
    await saveLink('https://shop.example/one', { tags: ['linnen'] });
    await saveLink('https://shop.example/two', { tags: ['linen'] });

    await renderDialog('tag');
    await screen.findByText('linnen');

    await rename('linnen', 'linen');

    expect(screen.getByText('“linen” already exists. Merge the two?')).toBeTruthy();
    expect(await getOrganizationValues('tag')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: en['organization.rename.merge.confirm'] }));

    await waitFor(async () => {
      expect(await getOrganizationValues('tag')).toHaveLength(1);
    });
    expect(screen.getByText('“linnen” was merged into “linen”.')).toBeTruthy();
  });

  it('leaves both values alone when the merge is declined', async () => {
    await saveLink('https://shop.example/one', { tags: ['linnen'] });
    await saveLink('https://shop.example/two', { tags: ['linen'] });

    await renderDialog('tag');
    await screen.findByText('linnen');

    await rename('linnen', 'linen');
    fireEvent.click(screen.getByRole('button', { name: en['organization.rename.merge.cancel'] }));

    expect(await getOrganizationValues('tag')).toHaveLength(2);
    // Back in the field, so the slip can be corrected rather than started over.
    expect(nameField('linnen').value).toBe('linen');
  });

  it('closes the field rather than complaining when the name did not change', async () => {
    await saveLink('https://shop.example/one', { category: 'Fabrics' });

    await renderDialog('category');
    await screen.findByText('Fabrics');

    fireEvent.click(renameButton('Fabrics'));
    fireEvent.change(nameField('Fabrics'), { target: { value: '  Fabrics  ' } });
    fireEvent.click(screen.getByRole('button', { name: en['organization.rename.save'] }));

    expect(screen.queryByLabelText('New name for “Fabrics”')).toBeNull();
    expect(await getOrganizationValues('category')).toHaveLength(1);
  });

  it('deletes a value without deleting what was filed under it', async () => {
    await saveLink('https://shop.example/one', { category: 'Fabrics' });

    await renderDialog('category');
    await screen.findByText('Fabrics');

    fireEvent.click(deleteButton('Fabrics'));
    expect(
      screen.getByText('Your saved links stay. They simply no longer have a category.'),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete “Fabrics”' }));

    await waitFor(async () => {
      expect(await getOrganizationValues('category')).toEqual([]);
    });

    const links = await getSavedLinks();
    expect(links).toHaveLength(1);
    expect(links[0]?.category).toBeNull();
    expect(
      screen.getByText('“Fabrics” was deleted. The saved links that carried it are still there.'),
    ).toBeTruthy();
  });

  it('keeps a question and a rename field from standing open at once', async () => {
    await saveLink('https://shop.example/one', { category: 'Fabrics' });

    await renderDialog('category');
    await screen.findByText('Fabrics');

    fireEvent.click(renameButton('Fabrics'));
    fireEvent.click(deleteButton('Fabrics'));

    expect(screen.queryByLabelText('New name for “Fabrics”')).toBeNull();
    expect(screen.getByText('Delete “Fabrics”?')).toBeTruthy();
  });

  /*
   * The row that was being worked on leaves the screen — deleted, merged, or
   * sorted elsewhere under its new name — and focus would fall to the dialog
   * with nothing saying why (2.4.3).
   */
  it('leaves focus on something after the list has changed', async () => {
    await saveLink('https://shop.example/one', { category: 'Fabrcis' });
    await saveLink('https://shop.example/two', { category: 'Books' });

    await renderDialog('category');
    await screen.findByText('Fabrcis');

    await rename('Fabrcis', 'Fabrics');

    await waitFor(() => {
      expect(document.activeElement).toBe(renameButton('Fabrics'));
    });
  });

  /*
   * Both buttons are disclosures, and a disclosure that is dismissed owes the
   * keyboard the button it was opened from — otherwise focus falls to the
   * dialog and the row that was being worked on is lost (2.4.3). The panel
   * cannot do this itself; the row it sits in has to.
   */
  it.each([
    ['rename', renameButton, 'New name for “Fabrics”'],
    ['delete', deleteButton, 'Delete “Fabrics”?'],
  ] as const)(
    'hands focus back to the %s button when Escape dismisses its panel',
    async (_mode, button, shown) => {
      await saveLink('https://shop.example/one', { category: 'Fabrics' });

      await renderDialog('category');
      await screen.findByText('Fabrics');

      fireEvent.click(button('Fabrics'));
      fireEvent.keyDown(screen.getByText(shown), { key: 'Escape' });

      expect(screen.queryByText(shown)).toBeNull();
      expect(document.activeElement).toBe(button('Fabrics'));
    },
  );

  it('says whether a row has something open', async () => {
    await saveLink('https://shop.example/one', { category: 'Fabrics' });

    await renderDialog('category');
    await screen.findByText('Fabrics');

    expect(renameButton('Fabrics').getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(renameButton('Fabrics'));

    expect(renameButton('Fabrics').getAttribute('aria-expanded')).toBe('true');
  });
});
