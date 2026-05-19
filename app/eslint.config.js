// ESLint 9 flat config — Expo + TypeScript
const expoConfig = require('eslint-config-expo/flat');
const tsEslint = require('typescript-eslint');

module.exports = [
  ...expoConfig,
  ...tsEslint.configs.recommended,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*', 'ios/Pods/*', 'android/build/*'],
  },
  {
    rules: {
      // Built-in no-unused-vars OFF — replaced by TS-aware version below
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'react/no-unescaped-entities': 'off',
      // i18next.use() collision with named export — false positive
      'import/no-named-as-default-member': 'off',
    },
  },
];
