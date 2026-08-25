// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PopoverButton } from './PopoverButton';

/**
 * The panel's behaviour, checked once here rather than again in every component
 * that opens one.
 */
function renderPopover() {
  render(
    <PopoverButton label="Appearance" icon={<span />}>
      {(close) => (
        <button type="button" onClick={close}>
          Done
        </button>
      )}
    </PopoverButton>,
  );

  return screen.getByRole('button', { name: 'Appearance' });
}

afterEach(cleanup);

describe('PopoverButton', () => {
  it('starts closed and says so', () => {
    const button = renderPopover();

    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('button', { name: 'Done' })).toBeNull();
  });

  it('shows the panel and marks the button as expanded', () => {
    const button = renderPopover();

    fireEvent.click(button);

    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: 'Done' })).toBeTruthy();
  });

  // Escape is the way out of anything that opened over the page (WCAG 2.1.2),
  // and focus has to come back with it, or a keyboard user is dropped at the
  // top of the document.
  it('closes on Escape and hands focus back to the button', () => {
    const button = renderPopover();

    fireEvent.click(button);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('button', { name: 'Done' })).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it('closes when the button is pressed again', () => {
    const button = renderPopover();

    fireEvent.click(button);
    fireEvent.click(button);

    expect(screen.queryByRole('button', { name: 'Done' })).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it('closes when something outside is pressed', () => {
    const button = renderPopover();

    fireEvent.click(button);
    fireEvent.pointerDown(document.body);

    expect(screen.queryByRole('button', { name: 'Done' })).toBeNull();
  });

  it('lets its own content close it', () => {
    const button = renderPopover();

    fireEvent.click(button);
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));

    expect(screen.queryByRole('button', { name: 'Done' })).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  // Tabbing past the last control leaves the panel behind; it would otherwise
  // stay open over content the user has already moved on from.
  it('closes when focus moves to something outside', () => {
    const button = renderPopover();
    const elsewhere = document.createElement('button');
    document.body.append(elsewhere);

    fireEvent.click(button);
    fireEvent.blur(screen.getByRole('button', { name: 'Done' }), { relatedTarget: elsewhere });

    expect(screen.queryByRole('button', { name: 'Done' })).toBeNull();
  });

  /*
   * Pressing the mouse on a word inside the panel blurs whatever had focus
   * before the click has done anything, and with nothing to hand focus to yet.
   * Closing on that took the target out of the document before the click could
   * land on it — which is what made a label in the panel unclickable except on
   * the control itself.
   */
  it('stays open when focus leaves without landing anywhere', () => {
    const button = renderPopover();

    fireEvent.click(button);
    fireEvent.blur(screen.getByRole('button', { name: 'Done' }), { relatedTarget: null });

    expect(screen.getByRole('button', { name: 'Done' })).toBeTruthy();
  });
});
