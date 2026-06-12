import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '.agent', '.agents', '.claude', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }],
      // App code must route through src/utils/logger (silenced in production).
      // Raw console.* would leak logs to end users' devtools in prod.
      'no-console': 'error',
    },
  },
  {
    // The logger wrapper is the single sanctioned place to touch console,
    // and CLI scripts run in Node where console output is the intended UX.
    files: ['src/utils/logger.ts', 'scripts/**/*.{ts,tsx}'],
    rules: {
      'no-console': 'off',
    },
  },
])
