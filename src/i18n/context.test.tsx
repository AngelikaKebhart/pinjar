// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useTranslation } from './context';

describe('useTranslation', () => {
  it('fails loudly when used outside a TranslationProvider', () => {
    // Without the guard the hook would hand back null and every component using
    // it would fail somewhere further down with an unrelated message.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      expect(() => renderHook(() => useTranslation())).toThrow(/TranslationProvider/);
    } finally {
      consoleError.mockRestore();
    }
  });
});
