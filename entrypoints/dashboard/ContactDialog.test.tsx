// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { CATALOGS } from '@/src/i18n/messages';
import { TranslationProvider } from '@/src/i18n/TranslationProvider';
import { ContactDialog } from './ContactDialog';

/** The catalog is typed as an open record, so a lookup has to survive a miss. */
const en = (key: string) => CATALOGS.en[key] ?? '';

/**
 * What the dialog holds. Being a modal at all is `Dialog`'s business and is
 * tested there.
 */
function renderDialog() {
  render(
    <TranslationProvider>
      <ContactDialog isOpen onClose={() => {}} />
    </TranslationProvider>,
  );
}

describe('ContactDialog', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    Object.defineProperty(navigator, 'language', { configurable: true, get: () => 'en-US' });
  });

  afterEach(cleanup);

  it('invites a message and says what happens to it', async () => {
    renderDialog();

    expect(await screen.findByText(en('contact.intro'))).toBeTruthy();
    expect(screen.getByText(en('contact.privacy'))).toBeTruthy();
  });

  /*
   * The address is the link text rather than a word like "write to us": a mail
   * client that never opens leaves the reader with nothing to copy otherwise.
   */
  it('offers the address as a mail link, subject already filled in', async () => {
    renderDialog();

    const link = await screen.findByRole('link');

    expect(link.textContent).toBe('angelika@kebhart.net');
    expect(link.getAttribute('href')).toBe(
      `mailto:angelika@kebhart.net?subject=${encodeURIComponent(en('contact.mailSubject'))}`,
    );
  });
});
