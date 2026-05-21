import { useEffect } from 'react';
import { Platform } from 'react-native';

import { setModel, setModelLoading } from '@/services/faceDescriptor';

/**
 * MobileFaceNet TFLite model loader.
 *
 * Mount sekali di root layout. Load model dari `app/assets/ml/mobilefacenet.tflite`
 * (~5MB) ke memory pakai react-native-fast-tflite. Setelah loaded, expose ke
 * faceDescriptor service via setModel().
 *
 * Model load ~200ms-1s tergantung device. Setelah loaded, retained di memory
 * selama app lifecycle (no per-request load overhead).
 *
 * Web platform: skip — TFLite tidak available.
 */

export function FaceDescriptorProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    let cancelled = false;
    setModelLoading(true);

    (async () => {
      try {
        // Lazy import — supaya Metro web build tidak crash kalau native module
        // unavailable di Expo Go (TFLite butuh prebuild / EAS Build).
        const tflite = (await import('react-native-fast-tflite')) as unknown as {
          loadTensorflowModel: (
            source: number | { url: string },
          ) => Promise<{ runSync: (inputs: Float32Array[]) => Float32Array[] }>;
        };
        // Bundle model sebagai require asset — Metro asset registry handle .tflite
        // via metro.config.js assetExts.
        const model = await tflite.loadTensorflowModel(
          require('../../../assets/ml/mobilefacenet.tflite'),
        );
        if (cancelled) return;
        setModel(model);
        if (__DEV__) console.log('[FaceDescriptor] MobileFaceNet loaded');
      } catch (e) {
        if (__DEV__) {
          console.warn('[FaceDescriptor] model load failed:', e);
          console.warn(
            '[FaceDescriptor] ensure: (1) react-native-fast-tflite installed, ' +
              '(2) mobilefacenet.tflite present di app/assets/ml/, ' +
              '(3) metro.config.js tflite di assetExts, (4) prebuild done.',
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
