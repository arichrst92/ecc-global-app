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

// HP lipat: buka/tutup layar mengubah smallestScreenSize/density. Tanpa ini
// Activity dibuat ulang dan app kembali ke awal; dengan ini RN cukup menyesuaikan ukuran.
const EXTRA_CONFIG_CHANGES = ['smallestScreenSize', 'density'];

module.exports = function withOptionalScreenFeatures(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    for (const act of manifest.application?.[0]?.activity ?? []) {
      if (act.$?.['android:name'] !== '.MainActivity') continue;
      const cur = (act.$['android:configChanges'] ?? '').split('|').filter(Boolean);
      for (const c of EXTRA_CONFIG_CHANGES) if (!cur.includes(c)) cur.push(c);
      act.$['android:configChanges'] = cur.join('|');
    }
    // Android 16 (targetSdk 36) mengabaikan kunci portrait di layar ≥ 600 dp (layar
    // dalam HP lipat, tablet). Tata letak app dirancang tegak → tetap tegak (bila HP
    // dimiringkan, app tampil tegak di tengah). Hanya berlaku di targetSdk 36.
    const app = manifest.application?.[0];
    if (app) {
      app.property = app.property ?? [];
      const PROP = 'android.window.PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY';
      if (!app.property.some((p) => p.$?.['android:name'] === PROP)) {
        app.property.push({ $: { 'android:name': PROP, 'android:value': 'true' } });
      }
    }
    manifest['uses-feature'] = manifest['uses-feature'] ?? [];
    for (const name of FEATURES) {
      const existing = manifest['uses-feature'].find((f) => f.$?.['android:name'] === name);
      if (existing) existing.$['android:required'] = 'false';
      else manifest['uses-feature'].push({ $: { 'android:name': name, 'android:required': 'false' } });
    }
    return cfg;
  });
};
