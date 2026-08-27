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
 * is under test here is how the choices behave, which is the same whatever the
 * two switchers put into them. Opening, closing and focus belong to
 * `PopoverButton` and are checked there.
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

  fireEvent.click(screen.getByRole('button', { name: 'Appearance' }));

  return { onChange };
}

afterEach(cleanup);

describe('SettingMenu', () => {
  it('shows the options as one named group', () => {
    renderMenu();

    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('group', { name: 'Appearance' })).toBeTruthy();
  });

  it('marks the option that is currently chosen', () => {
    renderMenu();

    expect(screen.getByRole('radio', { name: 'Light' })).toHaveProperty('checked', true);
  });

  /*
   * Opening with the keyboard has to land somewhere useful, and the chosen
   * option is where the arrow keys can then do their work (WCAG 2.2 AA, 2.4.3).
   */
  it('puts focus on the option that is currently chosen', () => {
    renderMenu();

    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Light' }));
  });

  /*
   * Arrow keys move through a radio group by selecting every option they pass
   * over, so a panel that closed on the first of those picks could not be
   * walked through with the keyboard at all. The browser sends a click along
   * with the arrow press; jsdom does not, so both halves are spelled out here.
   */
  it('reports a pick made with the keyboard and stays open', () => {
    const { onChange } = renderMenu();

    const option = screen.getByRole('radio', { name: 'Dark' });
    fireEvent.keyDown(option, { key: 'ArrowDown' });
    fireEvent.click(option);

    expect(onChange).toHaveBeenCalledWith('dark');
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeTruthy();
  });

  // A click is a finished decision, and leaving the panel standing over the
  // page afterwards means every pick costs a second gesture to dismiss it.
  it('closes the panel when a pick is made with the pointer', () => {
    const { onChange } = renderMenu();

    const option = screen.getByRole('radio', { name: 'Dark' });
    fireEvent.pointerDown(option);
    fireEvent.click(option);

    expect(onChange).toHaveBeenCalledWith('dark');
    expect(screen.queryByRole('radio', { name: 'Dark' })).toBeNull();
  });

  /*
   * The dot alone is a 13px target, well under the 24px minimum (WCAG 2.2 AA,
   * 2.5.8), so the whole row has to answer to a click. It does because each
   * row is a <label> wrapping both — this holds that arrangement in place.
   */
  it('picks the option when the word beside it is clicked', () => {
    const { onChange } = renderMenu();

    const word = screen.getByText('Dark');
    fireEvent.pointerDown(word);
    fireEvent.click(word);

    expect(onChange).toHaveBeenCalledWith('dark');
  });
});
