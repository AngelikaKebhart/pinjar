// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { TranslationProvider } from '@/src/i18n/TranslationProvider';
import { DEFAULT_STATUS, type LinkStatus, type SavedLinkEdits } from '@/src/lib/saved-link';
import { addSavedLink } from '@/src/lib/storage';
import { SavedLinkForm } from './SavedLinkForm';

interface EditableLink {
  title: string;
  category: string | null;
  tags: string[];
  status: LinkStatus;
  note: string;
}

function aLink(overrides: Partial<EditableLink> = {}): EditableLink {
  return {
    title: 'Jersey fabric',
    category: null,
    tags: [],
    status: DEFAULT_STATUS,
    note: '',
    ...overrides,
  };
}

/** Renders the form and hands back what a submit would save. */
async function renderForm(link: EditableLink = aLink()) {
  const onSave = vi.fn<(edits: SavedLinkEdits) => void>();
  const onCancel = vi.fn();

  render(
    <TranslationProvider>
      <SavedLinkForm link={link} onSave={onSave} onCancel={onCancel} />
    </TranslationProvider>,
  );

  await screen.findByLabelText('Title');

  return { onSave, onCancel };
}

function submit(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
}

function type(label: string, value: string): void {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function choose(label: string, value: string): void {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function pressEnter(label: string): void {
  fireEvent.keyDown(screen.getByLabelText(label), { key: 'Enter' });
}

/**
 * Adds a value through the in-place field: pick "add a new one", type, Enter.
 * The field carries the same label as the dropdown it replaced.
 */
function addNew(label: string, value: string): void {
  choose(label, 'new');
  type(label, value);
  pressEnter(label);
}

beforeEach(() => {
  fakeBrowser.reset();
  Object.defineProperty(navigator, 'language', { configurable: true, get: () => 'en-US' });
});

afterEach(() => {
  cleanup();
});

describe('the plain fields', () => {
  it('starts out showing what the link already holds', async () => {
    await renderForm(aLink({ title: 'Jersey fabric', note: 'Two metres' }));

    expect(screen.getByLabelText('Title')).toHaveProperty('value', 'Jersey fabric');
    expect(screen.getByLabelText('Note')).toHaveProperty('value', 'Two metres');
  });

  it('hands the changed values back on save', async () => {
    const { onSave } = await renderForm();

    type('Title', 'Blue jersey');
    type('Note', 'Two metres are enough');
    submit();

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Blue jersey', note: 'Two metres are enough' }),
    );
  });

  it('does not offer the URL for editing, because it identifies the link', async () => {
    await renderForm();

    expect(screen.queryByLabelText(/url|address/i)).toBeNull();
  });

  it('leaves the form without saving when cancelled', async () => {
    const { onSave, onCancel } = await renderForm();

    type('Title', 'Something else');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe('adding something new in place', () => {
  it('turns the dropdown into a field instead of opening one below it', async () => {
    await renderForm();

    choose('Category', 'new');

    const field = screen.getByLabelText('Category');
    expect(field.tagName).toBe('INPUT');
    // Exactly one control carries the label, so nothing appeared underneath.
    expect(screen.getAllByLabelText('Category')).toHaveLength(1);
  });

  it('puts the caret straight into it', async () => {
    await renderForm();

    choose('Category', 'new');

    expect(document.activeElement).toBe(screen.getByLabelText('Category'));
  });

  it('takes the entry on Enter and goes back to the dropdown', async () => {
    await renderForm();

    addNew('Category', 'Patterns');

    const field = screen.getByLabelText('Category');
    expect(field.tagName).toBe('SELECT');
    expect(field).toHaveProperty('value', 'known:Patterns');
  });

  // Enter is the confirmation for this one entry, never for the whole form.
  it('does not save the form on Enter', async () => {
    const { onSave } = await renderForm();

    addNew('Category', 'Patterns');

    expect(onSave).not.toHaveBeenCalled();
  });

  it('abandons the entry on Escape', async () => {
    const { onSave } = await renderForm(aLink({ category: 'Fabrics' }));

    choose('Category', 'new');
    type('Category', 'Patterns');
    fireEvent.keyDown(screen.getByLabelText('Category'), { key: 'Escape' });
    submit();

    expect(screen.getByLabelText('Category').tagName).toBe('SELECT');
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ category: 'Fabrics' }));
  });

  // Typing a name and clicking elsewhere must not silently discard it.
  it('takes the entry when the field is left', async () => {
    const { onSave } = await renderForm();

    choose('Category', 'new');
    type('Category', 'Patterns');
    fireEvent.blur(screen.getByLabelText('Category'));
    submit();

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ category: 'Patterns' }));
  });

  it('keeps the previous choice when nothing was typed', async () => {
    const { onSave } = await renderForm(aLink({ category: 'Fabrics' }));

    choose('Category', 'new');
    fireEvent.blur(screen.getByLabelText('Category'));
    submit();

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ category: 'Fabrics' }));
  });

  it('hands focus back to the dropdown afterwards', async () => {
    await renderForm();

    addNew('Category', 'Patterns');

    expect(document.activeElement).toBe(screen.getByLabelText('Category'));
  });

  it('explains the two keys rather than leaving them to be guessed', async () => {
    await renderForm();

    choose('Category', 'new');

    const hintId = screen.getByLabelText('Category').getAttribute('aria-describedby');
    expect(document.getElementById(hintId ?? '')?.textContent).toBe(
      'Press Enter to confirm, Escape to cancel.',
    );
  });

  it('works the same way for the status', async () => {
    const { onSave } = await renderForm();

    addNew('Status', 'Ordered');
    submit();

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ status: { kind: 'custom', label: 'Ordered' } }),
    );
  });
});

describe('the category', () => {
  it('offers the categories used before', async () => {
    await addSavedLink({ url: 'https://shop.example/a', category: 'Fabrics' });
    await addSavedLink({ url: 'https://shop.example/b', category: 'Patterns' });

    await renderForm();

    expect(await screen.findByRole('option', { name: 'Fabrics' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Patterns' })).toBeTruthy();
  });

  // The point of the whole exercise: a category is typed once, then picked.
  it('takes one of them without retyping it', async () => {
    await addSavedLink({ url: 'https://shop.example/a', category: 'Fabrics' });
    const { onSave } = await renderForm();
    await screen.findByRole('option', { name: 'Fabrics' });

    choose('Category', 'known:Fabrics');
    submit();

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ category: 'Fabrics' }));
  });

  it('starts on the category the link already has', async () => {
    const { onSave } = await renderForm(aLink({ category: 'Fabrics' }));

    submit();

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ category: 'Fabrics' }));
  });

  it('can be cleared again', async () => {
    const { onSave } = await renderForm(aLink({ category: 'Fabrics' }));

    choose('Category', 'none');
    submit();

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ category: null }));
  });

  // The suggestions are stored separately, so they could lag behind the link.
  it('offers the category this link carries even when the suggestions lost it', async () => {
    await renderForm(aLink({ category: 'Ordered elsewhere' }));

    expect(await screen.findByRole('option', { name: 'Ordered elsewhere' })).toBeTruthy();
  });

  // A category literally named like one of the option sentinels must survive.
  it.each(['none', 'new', 'builtin'])('keeps a category named "%s" intact', async (name) => {
    const { onSave } = await renderForm(aLink({ category: name }));

    submit();

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ category: name }));
  });
});

describe('the tags', () => {
  it('says so when there is nothing to pick from yet', async () => {
    await renderForm();

    expect(await screen.findByText('You have not used any tags yet.')).toBeTruthy();
  });

  it('offers the tags used before', async () => {
    await addSavedLink({ url: 'https://shop.example/a', tags: ['jersey', 'blue'] });

    await renderForm();

    expect(await screen.findByLabelText('jersey')).toBeTruthy();
    expect(screen.getByLabelText('blue')).toBeTruthy();
  });

  it('ticks the ones this link already carries', async () => {
    await addSavedLink({ url: 'https://shop.example/a', tags: ['jersey', 'blue'] });

    await renderForm(aLink({ tags: ['jersey'] }));

    expect(await screen.findByLabelText('jersey')).toHaveProperty('checked', true);
    expect(screen.getByLabelText('blue')).toHaveProperty('checked', false);
  });

  it('takes several of them without retyping', async () => {
    await addSavedLink({ url: 'https://shop.example/a', tags: ['jersey', 'blue', 'cotton'] });
    const { onSave } = await renderForm();
    await screen.findByLabelText('jersey');

    fireEvent.click(screen.getByLabelText('jersey'));
    fireEvent.click(screen.getByLabelText('cotton'));
    submit();

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ tags: expect.arrayContaining(['jersey', 'cotton']) }),
    );
  });

  it('drops one that is unticked', async () => {
    await addSavedLink({ url: 'https://shop.example/a', tags: ['jersey', 'blue'] });
    const { onSave } = await renderForm(aLink({ tags: ['jersey', 'blue'] }));
    await screen.findByLabelText('jersey');

    fireEvent.click(screen.getByLabelText('blue'));
    submit();

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ tags: expect.not.arrayContaining(['blue']) }),
    );
  });

  // Same key, same meaning as in the category field.
  it('turns what was typed into ticked boxes on Enter', async () => {
    await renderForm();

    type('New tags', 'wool, striped');
    pressEnter('New tags');

    expect(screen.getByLabelText('wool')).toHaveProperty('checked', true);
    expect(screen.getByLabelText('striped')).toHaveProperty('checked', true);
    // Emptied, ready for the next one.
    expect(screen.getByLabelText('New tags')).toHaveProperty('value', '');
  });

  it('does not save the form on Enter', async () => {
    const { onSave } = await renderForm();

    type('New tags', 'wool');
    pressEnter('New tags');

    expect(onSave).not.toHaveBeenCalled();
  });

  // Typing a tag and pressing Save straight away must not lose it.
  it('takes along what is still sitting in the field', async () => {
    const { onSave } = await renderForm(aLink({ tags: ['jersey'] }));

    type('New tags', 'wool, striped');
    submit();

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['jersey', 'wool', 'striped'] }),
    );
  });

  it('adds nothing when the field is left empty', async () => {
    const { onSave } = await renderForm(aLink({ tags: ['jersey'] }));

    submit();

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ tags: ['jersey'] }));
  });

  it('keeps a tag this link carries even when the suggestions lost it', async () => {
    await renderForm(aLink({ tags: ['handmade'] }));

    expect(await screen.findByLabelText('handmade')).toHaveProperty('checked', true);
  });
});

describe('the status', () => {
  it('offers the built-in status translated', async () => {
    await renderForm();

    expect(screen.getByRole('option', { name: 'Saved' })).toBeTruthy();
  });

  it('offers the statuses created before', async () => {
    await addSavedLink({
      url: 'https://shop.example/a',
      status: { kind: 'custom', label: 'Bought' },
    });

    await renderForm();

    expect(await screen.findByRole('option', { name: 'Bought' })).toBeTruthy();
  });

  it('offers the status this link carries even when the suggestions lost it', async () => {
    await renderForm(aLink({ status: { kind: 'custom', label: 'Ordered' } }));

    expect(await screen.findByRole('option', { name: 'Ordered' })).toBeTruthy();
  });

  it('keeps a custom status when nothing is changed', async () => {
    const { onSave } = await renderForm(aLink({ status: { kind: 'custom', label: 'Bought' } }));

    submit();

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ status: { kind: 'custom', label: 'Bought' } }),
    );
  });

  it('switches back to the built-in status', async () => {
    const { onSave } = await renderForm(aLink({ status: { kind: 'custom', label: 'Bought' } }));

    choose('Status', 'builtin');
    submit();

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ status: DEFAULT_STATUS }));
  });

  // A user's own status named like a sentinel must not be mistaken for it
  // (docs/concept.md §4).
  it.each(['builtin', 'new', 'none'])('keeps a custom status named "%s" custom', async (name) => {
    const { onSave } = await renderForm(aLink({ status: { kind: 'custom', label: name } }));

    submit();

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ status: { kind: 'custom', label: name } }),
    );
  });
});

describe('accessibility', () => {
  it('gives every control a real label', async () => {
    await renderForm();

    for (const label of ['Title', 'Category', 'Status', 'New tags', 'Note']) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
  });

  // The tick boxes and the field for new ones only make sense together.
  it('groups the tag controls under one name', async () => {
    await renderForm();

    expect(screen.getByRole('group', { name: 'Tags' })).toBeTruthy();
  });

  it('names the form after the link it edits', async () => {
    await renderForm(aLink({ title: 'Jersey fabric' }));

    expect(screen.getByRole('form', { name: 'Edit “Jersey fabric”' })).toBeTruthy();
  });

  // Opening the form replaces the button that was focused.
  it('moves focus into the form', async () => {
    await renderForm();

    expect(document.activeElement).toBe(screen.getByLabelText('Title'));
  });

  it('explains the comma rule instead of leaving it to be guessed', async () => {
    await renderForm();

    const hintId = screen.getByLabelText('New tags').getAttribute('aria-describedby');

    expect(document.getElementById(hintId ?? '')?.textContent).toBe(
      'Separate several with commas, then press Enter to add them.',
    );
  });

  it('keeps its labels in German', async () => {
    Object.defineProperty(navigator, 'language', { configurable: true, get: () => 'de-DE' });

    render(
      <TranslationProvider>
        <SavedLinkForm link={aLink()} onSave={vi.fn()} onCancel={vi.fn()} />
      </TranslationProvider>,
    );

    expect(await screen.findByLabelText('Titel')).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Schlagwörter' })).toBeTruthy();
    expect(screen.getByLabelText('Neue Schlagwörter')).toBeTruthy();
  });
});
