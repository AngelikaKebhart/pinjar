// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { CATALOGS } from '@/src/i18n/messages';
import { TranslationProvider } from '@/src/i18n/TranslationProvider';
import { DataDialog } from './DataDialog';

const en = CATALOGS.en;

/**
 * What is checked here is the wrapper: the button, the dialog around it, and
 * the way out again. Everything the three actions themselves do is covered by
 * DataSection.test.tsx and is not repeated.
 *
 * The focus trap, Escape and the backdrop are not tested, and could not be:
 * they come from the browser's own `showModal()`, which jsdom does not have
 * (see src/testing/dialog-methods.ts). Using them instead of rebuilding them
 * is the reason this component is a `<dialog>` at all.
 */
function renderDialog() {
  render(
    <TranslationProvider>
      <DataDialog />
    </TranslationProvider>,
  );

  return screen.findByRole('button', { name: en['data.heading'] });
}

describe('DataDialog', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    Object.defineProperty(navigator, 'language', { configurable: true, get: () => 'en-US' });
  });

  afterEach(cleanup);

  it('keeps the data actions out of the way until they are asked for', async () => {
    await renderDialog();

    expect(screen.queryByRole('button', { name: en['data.export.action'] })).toBeNull();
  });

  // A button that opens a dialog says so, so that a screen reader user is not
  // surprised by where they end up (WCAG 2.2 AA, 4.1.2).
  it('announces that it opens a dialog', async () => {
    const button = await renderDialog();

    expect(button.getAttribute('aria-haspopup')).toBe('dialog');
  });

  it('opens the dialog under its own heading', async () => {
    fireEvent.click(await renderDialog());

    const dialog = screen.getByRole('dialog', { name: en['data.heading'] });

    expect(await screen.findByRole('button', { name: en['data.export.action'] })).toBeTruthy();
    expect(dialog.getAttribute('open')).not.toBeNull();
  });

  it('opens it as a modal, so the page behind it cannot be used', async () => {
    const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal');

    fireEvent.click(await renderDialog());

    expect(showModal).toHaveBeenCalled();
  });

  it('closes again on the close button', async () => {
    fireEvent.click(await renderDialog());
    fireEvent.click(screen.getByRole('button', { name: en['data.close'] }));

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  /*
   * Escape is the browser's own doing and never passes through React. Without
   * hearing about it, the component would still believe the dialog is open and
   * the button would do nothing the second time.
   */
  it('notices when the browser closes it', async () => {
    const button = await renderDialog();

    fireEvent.click(button);
    const dialog = screen.getByRole('dialog');
    dialog.dispatchEvent(new Event('close'));

    fireEvent.click(button);

    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});
