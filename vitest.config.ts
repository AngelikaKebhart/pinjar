import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

export default defineConfig({
  // WxtVitest applies WXT's aliases and provides an in-memory fake of the
  // extension APIs, so storage logic can be tested without a real browser.
  plugins: [WxtVitest()],
  test: {
    // Both source roots are listed on purpose: a test file placed next to an
    // entrypoint would otherwise be collected by nothing and pass silently.
    include: ['{src,entrypoints}/**/*.test.{ts,tsx}'],
    // Runs before every test file, in whichever environment it asked for; the
    // file itself checks whether it is in a DOM before touching one.
    setupFiles: ['./src/testing/dialog-methods.ts'],
    // The default environment stays Node so the pure logic tests keep starting
    // instantly; the few tests that render React opt into jsdom themselves with
    // a `// @vitest-environment jsdom` comment on their first line.
  },
});
