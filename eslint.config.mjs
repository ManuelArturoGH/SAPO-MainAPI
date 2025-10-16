// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      // Disallow importing the vulnerable validator package directly
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'validator',
              message:
                'Do not import validator directly due to GHSA-9965-vmph-33xx. Use safe utilities or the WHATWG URL API instead.',
            },
          ],
          patterns: ['validator/*'],
        },
      ],
      // Prevent introducing the specific vulnerable API
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Identifier[name="isURL"]',
          message:
            'Avoid using validator.isURL (GHSA-9965-vmph-33xx). Use a safer URL parser/validator.',
        },
        {
          selector: 'Identifier[name="IsUrl"]',
          message:
            'Avoid using @IsUrl from class-validator (uses validator.isURL under the hood). Prefer custom validation.',
        },
      ],
    },
  },
);