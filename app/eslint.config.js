// ESLint 9 flat config — Expo + TypeScript
const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*', 'ios/Pods/*', 'android/build/*'],
  },
  {
    rules: {
      'react/no-unescaped-entities': 'off',
      // built-in no-unused-vars (works for both JS and TS via expo preset)
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
];
