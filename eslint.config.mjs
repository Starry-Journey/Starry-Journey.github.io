import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['node_modules/**', 'public/**', 'source/js/vendor/**', 'package-lock.json'],
  },
  js.configs.recommended,
  {
    files: ['source/js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...globals.browser, THREE: 'readonly' },
    },
    rules: {
      'no-unused-vars': ['warn', { args: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-console': 'off',
    },
  },
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { hexo: 'readonly' },
    },
  },
  {
    files: ['scripts/**/*.mjs', 'tests/**/*.js', 'playwright.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },
];
