// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SettingMenu } from './SettingMenu';

const OPTIONS = [
  { value: 'auto', label: 'Automatic' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const;

/**
 * Rendered with plain strings rather than through a translation provider: what
 * is under test here is the panel's behaviour, which is the same whatever the
 * two switchers put into it.
 */
function renderMenu(onChange = vi.fn()) {
  render(
    <SettingMenu
      icon={<span />}
      label="Appearance"
      options={OPTIONS}
      value="light"
      onChange={onChange}
    />,
  );

  return { button: screen.getByRole('button', { name: 'Appearance' }), onChange };
}

afterEach(cleanup);

describe('SettingMenu', () => {
  it('starts closed and says so', () => {
    const { button } = renderMenu();

    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('radio')).toBeNull();
  });

  it('shows the options under the name of the setting', () => {
    const { button } = renderMenu();

    fireEvent.click(button);

    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getAllByRole('radio', { name: /Automatic|Light|Dark/ })).toHaveLength(3);
    expect(screen.getByRole('group', { name: 'Appearance' })).toBeTruthy();
  });

  /*
   * Opening with the keyboard has to land somewhere useful, and the chosen
   * option is where the arrow keys can then do their work (WCAG 2.2 AA, 2.4.3).
   */
  it('puts focus on the option that is currently chosen', () => {
    const { button } = renderMenu();

    fireEvent.click(button);

    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Light' }));
  });

  it('reports a pick and stays open while doing it', () => {
    const { button, onChange } = renderMenu();

    fireEvent.click(button);
    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));

    expect(onChange).toHaveBeenCalledWith('dark');
    // Arrow keys move through radios by selecting them, so a panel that closed
    // on the first pick could not be walked through with the keyboard at all.
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeTruthy();
  });

  // Escape is the way out of anything that opened over the page (WCAG 2.1.2),
  // and focus has to come back with it, or a keyboard user is dropped at the
  // top of the document.
  it('closes on Escape and hands focus back to the button', () => {
    const { button } = renderMenu();

    fireEvent.click(button);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('radio')).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it('closes when the button is pressed again', () => {
    const { button } = renderMenu();

    fireEvent.click(button);
    fireEvent.click(button);

    expect(screen.queryByRole('radio')).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it('closes when something outside is pressed', () => {
    const { button } = renderMenu();

    fireEvent.click(button);
    fireEvent.pointerDown(document.body);

    expect(screen.queryByRole('radio')).toBeNull();
  });

  // Tabbing past the last option leaves the panel behind; it would otherwise
  // stay open over content the user has already moved on from.
  it('closes when focus leaves it', () => {
    const { button } = renderMenu();
    const elsewhere = document.createElement('button');
    document.body.append(elsewhere);

    fireEvent.click(button);
    fireEvent.blur(screen.getByRole('radio', { name: 'Light' }), { relatedTarget: elsewhere });

    expect(screen.queryByRole('radio')).toBeNull();
  });
});
