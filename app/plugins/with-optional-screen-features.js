/**
 * Config plugin: tandai fitur layar sebagai OPSIONAL di AndroidManifest.
 *
 * App dikunci portrait ("orientation": "portrait") → Android otomatis menganggap
 * `android.hardware.screen.portrait` WAJIB, sehingga Google Play menolak/membatasi
 * pemasangan di tablet, Chromebook, dan perangkat XR. Dengan `required=false` app
 * tetap tampil portrait, tetapi bisa dipasang di semua perangkat.
 *
 * Bukan modul native — hanya mengubah manifest saat prebuild (EAS build).
 */
const { withAndroidManifest } = require('expo/config-plugins');

const FEATURES = ['android.hardware.screen.portrait', 'android.hardware.screen.landscape'];

module.exports = function withOptionalScreenFeatures(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest['uses-feature'] = manifest['uses-feature'] ?? [];
    for (const name of FEATURES) {
      const existing = manifest['uses-feature'].find((f) => f.$?.['android:name'] === name);
      if (existing) existing.$['android:required'] = 'false';
      else manifest['uses-feature'].push({ $: { 'android:name': name, 'android:required': 'false' } });
    }
    return cfg;
  });
};
