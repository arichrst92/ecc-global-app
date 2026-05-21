import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

import { setModel, setModelLoading } from '@/services/faceDescriptor';

/**
 * MobileFaceNet TFLite model loader.
 *
 * Mount sekali di root layout. Load model dari `app/assets/ml/mobilefacenet.tflite`
 * (~5MB) ke memory pakai react-native-fast-tflite. Setelah loaded, expose ke
 * faceDescriptor service via setModel().
 *
 * **TIDAK SUPPORT EXPO GO** — react-native-fast-tflite native module butuh
 * prebuild + native build:
 *   npx expo prebuild --clean
 *   npx expo run:ios   # atau run:android
 *
 * Di Expo Go: skip entirely (provider no-op) — face login UI akan auto-hide
 * karena isFaceDescriptorReady() return false.
 */

function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

export function FaceDescriptorProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (isExpoGo()) {
      if (__DEV__) {
        console.warn(
          '[FaceDescriptor] Skipped: Expo Go tidak support react-native-fast-tflite. ' +
            'Untuk test face login, run native build: ' +
            'npx expo prebuild --clean && npx expo run:ios',
        );
      }
      return;
    }

    let cancelled = false;
    setModelLoading(true);

    (async () => {
      try {
        // Lazy import — Metro tetap bundle, tapi tidak top-level import,
        // jadi error TurboModule baru terjadi saat ini di-call.
        const tflite = (await import('react-native-fast-tflite')) as unknown as {
          loadTensorflowModel: (
            source: number | { url: string },
          ) => Promise<{ runSync: (inputs: Float32Array[]) => Float32Array[] }>;
        };

        // Dynamic require pattern — Metro static analysis tetap track this,
        // jadi pastikan placeholder file ada di assets/ml/ supaya Metro
        // bundle ga error. Runtime fail kalau file invalid TFLite format.
        let modelAsset: number | null = null;
        try {
          modelAsset = require('../../../assets/ml/mobilefacenet.tflite');
        } catch (e) {
          if (__DEV__) {
            console.warn(
              '[FaceDescriptor] mobilefacenet.tflite not bundled. ' +
                'Download model + place at app/assets/ml/mobilefacenet.tflite. ' +
                'See app/assets/ml/README.md',
            );
          }
          return;
        }
        if (!modelAsset) return;

        const model = await tflite.loadTensorflowModel(modelAsset);
        if (cancelled) return;
        setModel(model);
        if (__DEV__) console.log('[FaceDescriptor] MobileFaceNet loaded');
      } catch (e) {
        if (__DEV__) {
          console.warn('[FaceDescriptor] model load failed:', e);
          console.warn(
            '[FaceDescriptor] checklist: ' +
              '(1) react-native-fast-tflite installed, ' +
              '(2) mobilefacenet.tflite present di app/assets/ml/, ' +
              '(3) metro.config.js tflite di assetExts, ' +
              '(4) prebuild done + native run (NOT Expo Go).',
          );
        }
      } finally {
        if (!cancelled) setModelLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      setModel(null);
    };
  }, []);

  return <>{children}</>;
}
