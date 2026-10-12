module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          jsxImportSource: 'nativewind',
          // Web: zustand v5 ESM (middleware.mjs) pakai `import.meta.env`.
          // Bundle web Metro bukan ES module → "Cannot use 'import.meta'
          // outside a module" → layar putih. Opsi ini polyfill import.meta
          // saat transform (default hanya aktif untuk server).
          unstable_transformImportMeta: true,
        },
      ],
      'nativewind/babel',
    ],
    plugins: [
      // react-native-reanimated/plugin HARUS terakhir
      'react-native-reanimated/plugin',
    ],
  };
};
