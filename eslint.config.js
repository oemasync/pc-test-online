import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'

export default [
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'playwright-report/**', 'test-results/**', '.eslintignore'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    files: ['**/*.ts', '**/*.vue'],
    rules: {
      'no-undef': 'off',
    },
  },
  {
    files: ['scripts/**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: globals.node,
    },
  },
]
