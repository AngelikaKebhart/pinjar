import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettierConfig from 'eslint-config-prettier';
import requireCursorPointer from './.eslint-rules/require-cursor-pointer.js';

export default tseslint.config(
  {
    ignores: ['.output/**', '.wxt/**', 'coverage/**', 'public/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Build tooling runs in Node, not in the browser the extension ships to.
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      'cursor-pointer': {
        rules: {
          'require-cursor-pointer': requireCursorPointer,
        },
      },
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      // React 17+ JSX transform: no `import React` needed.
      ...react.configs.flat['jsx-runtime'].rules,
      ...reactHooks.configs.flat.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,

      // Accessibility is a hard project requirement, not a suggestion
      // (see .claude/skills/accessibility-wcag).
      'jsx-a11y/no-autofocus': 'error',
      // Ensure consistent UX feedback via cursor styles on interactive elements
      'cursor-pointer/require-cursor-pointer': 'error',

      // Data extracted from visited pages is untrusted; rendering raw HTML is
      // forbidden (see .claude/skills/privacy-and-security).
      'react/no-danger': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',

      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  // Prettier owns formatting; disable all stylistic rules that would conflict.
  prettierConfig,
);
