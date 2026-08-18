// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

beforeEach(() => {
  fakeBrowser.reset();
  Object.defineProperty(navigator, 'language', { configurable: true, get: () => 'en-US' });
});

afterEach(() => {
  cleanup();
});

describe('the fields', () => {
  it('starts out showing what the link already holds', async () => {
    await renderForm(
      aLink({
        title: 'Jersey fabric',
        category: 'Fabrics',
        tags: ['jersey', 'blue'],
        note: 'Two metres',
      }),
    );

    expect(screen.getByLabelText('Title')).toHaveProperty('value', 'Jersey fabric');
    expect(screen.getByLabelText('Category')).toHaveProperty('value', 'Fabrics');
    expect(screen.getByLabelText('Tags')).toHaveProperty('value', 'jersey, blue');
    expect(screen.getByLabelText('Note')).toHaveProperty('value', 'Two metres');
  });

  it('hands the changed values back on save', async () => {
    const { onSave } = await renderForm();

    type('Title', 'Blue jersey');
    type('Category', 'Fabrics');
    type('Note', 'Two metres are enough');
    submit();

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Blue jersey',
        category: 'Fabrics',
        note: 'Two metres are enough',
      }),
    );
  });

  it('splits tags on commas', async () => {
    const { onSave } = await renderForm();

    type('Tags', 'jersey, blue , cotton');
    submit();

    // Trimming and de-duplicating is the model's job, so the raw split is
    // what this layer is expected to produce.
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['jersey', ' blue ', ' cotton'] }),
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

describe('suggestions', () => {
  it('offers the categories used before', async () => {
    await addSavedLink({ url: 'https://shop.example/a', category: 'Fabrics' });
    await addSavedLink({ url: 'https://shop.example/b', category: 'Patterns' });

    await renderForm();

    await waitFor(() => {
      const options = screen.getByLabelText('Category').getAttribute('list');
      expect(document.querySelectorAll(`#${CSS.escape(options ?? '')} option`)).toHaveLength(2);
    });
  });
});

describe('the status', () => {
  it('offers the built-in status translated', async () => {
    await renderForm();

    expect(screen.getByRole('option', { name: 'Saved' })).toBeTruthy();
  });

  it('offers the statuses the user created before', async () => {
    await addSavedLink({
      url: 'https://shop.example/a',
      status: { kind: 'custom', label: 'Bought' },
    });

    await renderForm();

    expect(await screen.findByRole('option', { name: 'Bought' })).toBeTruthy();
  });

  // The suggestions are stored separately, so they could lag behind the link.
  it('offers the status this link carries even when it is not among the suggestions', async () => {
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

  it('lets the user define a new status', async () => {
    const { onSave } = await renderForm();

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'new' } });
    type('New status', 'Ordered');
    submit();

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ status: { kind: 'custom', label: 'Ordered' } }),
    );
  });

  it('switches back to the built-in status', async () => {
    const { onSave } = await renderForm(aLink({ status: { kind: 'custom', label: 'Bought' } }));

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'builtin' } });
    submit();

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ status: DEFAULT_STATUS }));
  });

  // A user's own status literally named like the built-in key must not be
  // mistaken for it (docs/concept.md §4).
  it('keeps a custom status named "builtin" custom', async () => {
    const { onSave } = await renderForm(aLink({ status: { kind: 'custom', label: 'builtin' } }));

    submit();

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ status: { kind: 'custom', label: 'builtin' } }),
    );
  });
});

describe('accessibility', () => {
  it('gives every field a real label', async () => {
    await renderForm();

    for (const label of ['Title', 'Category', 'Tags', 'Status', 'Note']) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
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

    const tags = screen.getByLabelText('Tags');
    const hintId = tags.getAttribute('aria-describedby');

    expect(document.getElementById(hintId ?? '')?.textContent).toBe(
      'Separate several tags with commas.',
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
    expect(screen.getByLabelText('Schlagwörter')).toBeTruthy();
  });
});
