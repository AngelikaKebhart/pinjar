// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { CATALOGS } from '@/src/i18n/messages';
import { TranslationProvider } from '@/src/i18n/TranslationProvider';
import { DataDialog } from './DataDialog';

const en = CATALOGS.en;

/**
 * What is checked here is the dialog around the three actions: that it follows
 * the prop that opens it, and that every way out reaches the caller — which is
 * what lets the menu open it a second time. Everything the actions themselves
 * do is covered by DataSection.test.tsx and is not repeated, and the entry that
 * opens it belongs to ManageMenu.test.tsx.
 *
 * The focus trap, Escape and the backdrop are not tested, and could not be:
 * they come from the browser's own `showModal()`, which jsdom does not have
 * (see src/testing/dialog-methods.ts). Using them instead of rebuilding them
 * is the reason this component is a `<dialog>` at all.
 */
async function renderDialog(isOpen: boolean, onClose = vi.fn()) {
  const { rerender } = render(
    <TranslationProvider>
      <DataDialog isOpen={isOpen} onClose={onClose} />
    </TranslationProvider>,
  );

  // Nothing renders until the provider has read the stored language, and the
  // dialog is opened by an effect a moment later — both have to be waited for,
  // or the assertions below race them.
  await (isOpen ? screen.findByRole('dialog') : screen.findByRole('dialog', { hidden: true }));

  return {
    onClose,
    setOpen: (nextIsOpen: boolean) =>
      rerender(
        <TranslationProvider>
          <DataDialog isOpen={nextIsOpen} onClose={onClose} />
        </TranslationProvider>,
      ),
  };
}

describe('DataDialog', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    Object.defineProperty(navigator, 'language', { configurable: true, get: () => 'en-US' });
  });

  afterEach(cleanup);

  it('keeps the data actions out of the way until it is opened', async () => {
    await renderDialog(false);

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('button', { name: en['data.export.action'] })).toBeNull();
  });

  it('opens under its own heading', async () => {
    await renderDialog(true);

    expect(screen.getByRole('dialog', { name: en['data.heading'] })).toBeTruthy();
    expect(await screen.findByRole('button', { name: en['data.export.action'] })).toBeTruthy();
  });

  it('opens as a modal, so the page behind it cannot be used', async () => {
    const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal');

    await renderDialog(true);

    expect(showModal).toHaveBeenCalled();
  });

  it('reports the close button rather than closing behind the caller', async () => {
    const { onClose } = await renderDialog(true);

    fireEvent.click(screen.getByRole('button', { name: en['dialog.close'] }));

    expect(onClose).toHaveBeenCalled();
  });

  /*
   * Escape is the browser's own doing and never passes through React. Without
   * hearing about it, the menu would still believe the dialog is open and its
   * entry would do nothing the second time.
   */
  it('reports the ways the browser closes it on its own', async () => {
    const { onClose } = await renderDialog(true);

    screen.getByRole('dialog').dispatchEvent(new Event('close'));

    expect(onClose).toHaveBeenCalled();
  });

  it('closes again when the caller says so', async () => {
    const { setOpen } = await renderDialog(true);

    setOpen(false);

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
