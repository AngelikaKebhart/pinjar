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

/** The one option value the form uses to mean "something that does not exist yet". */
const NEW = 'new';

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

  it('lets a new one be added', async () => {
    const { onSave } = await renderForm();

    choose('Category', NEW);
    type('New category', 'Patterns');
    submit();

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ category: 'Patterns' }));
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

  // The form hands over exactly what was entered and lets the model clean it
  // up, so an untouched field for new tags contributes one empty entry rather
  // than the form second-guessing it.
  it('leaves normalizing the empty field to the model', async () => {
    const { onSave } = await renderForm(aLink({ tags: ['jersey'] }));

    submit();

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ tags: ['jersey', ''] }));
  });

  it('adds new ones alongside the ticked ones', async () => {
    await addSavedLink({ url: 'https://shop.example/a', tags: ['jersey'] });
    const { onSave } = await renderForm(aLink({ tags: ['jersey'] }));
    await screen.findByLabelText('jersey');

    type('New tags', 'wool, striped');
    submit();

    // Trimming and de-duplicating is the model's job, so the raw split is
    // what this layer is expected to produce.
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['jersey', 'wool', ' striped'] }),
    );
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

  it('lets a new one be added', async () => {
    const { onSave } = await renderForm();

    choose('Status', NEW);
    type('New status', 'Ordered');
    submit();

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ status: { kind: 'custom', label: 'Ordered' } }),
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

  // The checkboxes and the field for new ones only make sense together.
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

  // The field appears in response to the choice, so that is where the user is
  // already looking.
  it('moves focus to the field a new entry needs', async () => {
    await renderForm();

    choose('Category', NEW);

    expect(document.activeElement).toBe(screen.getByLabelText('New category'));
  });

  it('explains the comma rule instead of leaving it to be guessed', async () => {
    await renderForm();

    const newTags = screen.getByLabelText('New tags');
    const hintId = newTags.getAttribute('aria-describedby');

    expect(document.getElementById(hintId ?? '')?.textContent).toBe(
      'Separate several new tags with commas.',
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
