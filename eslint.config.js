import { FlatCompat } from '@eslint/eslintrc';
import path from 'path';

const compat = new FlatCompat();

export default [
  ...compat.config({
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint', 'react', 'react-hooks'],
    extends: [
      'eslint:recommended',
      'plugin:react/recommended',
      'plugin:react-hooks/recommended',
      'plugin:@typescript-eslint/recommended',
      'next/core-web-vitals', // Intègre les règles Next.js strictes
      'prettier' // Supprime les conflits avec Prettier
    ],
    env: {
      es6: true,
      browser: true,
      jest: true,
      node: true
    },
    settings: {
      react: {
        version: 'detect'
      }
    },
    rules: {
      'no-console': 'warn', // Avertissement pour `console.log`
      'no-debugger': 'warn', // Avertissement pour `debugger`
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-empty-function': [
        'error',
        {
          allow: ['arrowFunctions', 'functions', 'methods']
        }
      ],
      'react/react-in-jsx-scope': 'off', // Désactivé car Next.js n'en a pas besoin.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn'
    }
  }),

  // Ignorer certains fichiers ou dossiers
  {
    ignores: ['node_modules', '.next', 'dist']
  }
];