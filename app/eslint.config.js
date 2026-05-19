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
    // Global rule overrides untuk seluruh project
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'react/no-unescaped-entities': 'off',
      'import/no-named-as-default-member': 'off',
    },
  },
  {
    // Config files (Node.js, harus pakai CommonJS require)
    files: ['*.config.js', '*.config.ts', 'eslint.config.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-var-requires': 'off',
    },
  },
];
