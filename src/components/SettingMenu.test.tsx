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

  it('reports a pick and stays open while doing it', () => {
    const { onChange } = renderMenu();

    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));

    expect(onChange).toHaveBeenCalledWith('dark');
    // Arrow keys move through radios by selecting them, so a panel that closed
    // on the first pick could not be walked through with the keyboard at all.
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeTruthy();
  });

  /*
   * The dot alone is a 13px target, well under the 24px minimum (WCAG 2.2 AA,
   * 2.5.8), so the whole row has to answer to a click. It does because each
   * row is a <label> wrapping both — this holds that arrangement in place.
   */
  it('picks the option when the word beside it is clicked', () => {
    const { onChange } = renderMenu();

    fireEvent.click(screen.getByText('Dark'));

    expect(onChange).toHaveBeenCalledWith('dark');
  });
});
