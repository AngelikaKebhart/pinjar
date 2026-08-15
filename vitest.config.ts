import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

export default defineConfig({
  // WxtVitest applies WXT's aliases and provides an in-memory fake of the
  // extension APIs, so storage logic can be tested without a real browser.
  plugins: [WxtVitest()],
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
