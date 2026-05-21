/**
 * Face Descriptor Service — Native TFLite + MobileFaceNet (v2 stack).
 *
 * Replaces v1 WebView + face-api.js approach (yang hang >60s di production).
 *
 * Pipeline:
 *   1. Image URI dari camera
 *   2. ML Kit native face detection → bounding box + score
 *   3. expo-image-manipulator crop face region + resize 112x112
 *   4. Convert pixel data → Float32Array tensor (normalize -1..1)
 *   5. react-native-fast-tflite run MobileFaceNet → 192-dim descriptor
 *
 * Model file: app/assets/ml/mobilefacenet.tflite (~5MB). Loaded sekali via
 * loadTensorflowModel() di provider, retained di memory selama app lifecycle.
 *
 * Lazy-loaded library imports — supaya Metro web build (yang ga punya native
 * modules) tidak crash. Native build (iOS/Android) load normally.
 */
import { Platform } from 'react-native';
import {
  manipulateAsync,
  SaveFormat,
  type ImageResult,
} from 'expo-image-manipulator';

import { FACE_DESCRIPTOR_DIM } from '@/types/auth';

export type ComputeResult =
  | { ok: true; descriptor: number[] }
  | {
      ok: false;
      reason:
        | 'no_face'
        | 'multiple_faces'
        | 'low_quality'
        | 'model_not_loaded'
        | 'error';
      message?: string;
    };

// Model ref di-set oleh FaceDescriptorProvider via setModel()
type TFLiteModel = {
  runSync: (inputs: Float32Array[]) => Float32Array[];
};

let model: TFLiteModel | null = null;
let modelLoading = false;

export function setModel(m: TFLiteModel | null) {
  model = m;
}

export function isFaceDescriptorReady(): boolean {
  return model !== null;
}

export function isModelLoading(): boolean {
  return modelLoading;
}

export function setModelLoading(v: boolean) {
  modelLoading = v;
}

/**
 * Compute 192-dim MobileFaceNet descriptor dari image URI.
 *
 * Async pipeline:
 * - ML Kit detect single largest face → bounding box
 * - Crop face region + resize to 112x112 (MobileFaceNet input)
 * - Convert to normalized Float32Array (-1..1 range)
 * - Run TFLite inference → output Float32Array length 192
 */
export async function computeFaceDescriptor(imageUri: string): Promise<ComputeResult> {
  if (Platform.OS === 'web') {
    return {
      ok: false,
      reason: 'error',
      message: 'Web tidak support TFLite native',
    };
  }
  if (!model) {
    return { ok: false, reason: 'model_not_loaded' };
  }

  try {
    // 1. Detect face dengan ML Kit
    const FaceDetection = await loadMlKit();
    if (!FaceDetection) {
      return { ok: false, reason: 'error', message: 'ML Kit module unavailable' };
    }

    const faces = await FaceDetection.detect(imageUri, {
      performanceMode: 'fast',
      landmarkMode: 'none',
      classificationMode: 'none',
      contourMode: 'none',
      minFaceSize: 0.2,
    });

    if (!faces || faces.length === 0) {
      return { ok: false, reason: 'no_face' };
    }
    if (faces.length > 1) {
      return { ok: false, reason: 'multiple_faces' };
    }

    const face = faces[0];
    const { frame } = face;
    if (!frame || frame.width < 50 || frame.height < 50) {
      return { ok: false, reason: 'low_quality', message: 'face frame too small' };
    }

    // 2. Crop face region + resize 112x112
    // ML Kit gives frame in image coordinates: {left, top, width, height}
    const cropped: ImageResult = await manipulateAsync(
      imageUri,
      [
        {
          crop: {
            originX: Math.max(0, Math.floor(frame.left)),
            originY: Math.max(0, Math.floor(frame.top)),
            width: Math.floor(frame.width),
            height: Math.floor(frame.height),
          },
        },
        { resize: { width: 112, height: 112 } },
      ],
      { format: SaveFormat.PNG, base64: true },
    );

    if (!cropped.base64) {
      return { ok: false, reason: 'error', message: 'crop/resize failed' };
    }

    // 3. Convert PNG base64 → Float32Array (112*112*3 channels, normalized)
    const tensor = await pngBase64ToTensor(cropped.base64);
    if (!tensor) {
      return { ok: false, reason: 'error', message: 'tensor conversion failed' };
    }

    // 4. Run TFLite
    const outputs = model.runSync([tensor]);
    if (!outputs || outputs.length === 0) {
      return { ok: false, reason: 'error', message: 'model output empty' };
    }
    const raw = outputs[0];
    if (raw.length !== FACE_DESCRIPTOR_DIM) {
      return {
        ok: false,
        reason: 'error',
        message: `Descriptor dim mismatch: ${raw.length} (expected ${FACE_DESCRIPTOR_DIM})`,
      };
    }

    // 5. L2-normalize descriptor untuk cosine similarity di server.
    // BE side compute cosine antar normalized vectors = dot product langsung.
    const normalized = l2Normalize(raw);
    return { ok: true, descriptor: Array.from(normalized) };
  } catch (e) {
    return {
      ok: false,
      reason: 'error',
      message: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Lazy-load ML Kit module — tidak available di Expo Go. */
type MlKitFaceDetectionModule = {
  detect: (
    uri: string,
    opts: {
      performanceMode?: 'fast' | 'accurate';
      landmarkMode?: 'none' | 'all';
      classificationMode?: 'none' | 'all';
      contourMode?: 'none' | 'all';
      minFaceSize?: number;
    },
  ) => Promise<Array<{ frame: { left: number; top: number; width: number; height: number } }>>;
};

let cachedMlKit: MlKitFaceDetectionModule | null | undefined = undefined;

async function loadMlKit(): Promise<MlKitFaceDetectionModule | null> {
  if (cachedMlKit !== undefined) return cachedMlKit;
  try {
    const mod = (await import('@react-native-ml-kit/face-detection')) as unknown as
      | { default: MlKitFaceDetectionModule }
      | MlKitFaceDetectionModule;
    cachedMlKit =
      (mod as { default?: MlKitFaceDetectionModule }).default ??
      (mod as MlKitFaceDetectionModule);
    return cachedMlKit;
  } catch (e) {
    if (__DEV__) console.warn('[faceDescriptor] ML Kit load failed:', e);
    cachedMlKit = null;
    return null;
  }
}

/**
 * Convert PNG base64 → Float32Array tensor untuk MobileFaceNet input.
 *
 * MobileFaceNet expects:
 * - Shape: [1, 112, 112, 3] (batch, h, w, channels) atau flat 112*112*3
 * - Channels: RGB
 * - Normalization: (pixel - 127.5) / 127.5 → range -1..1
 *
 * Note: native TFLite library biasanya accept Float32Array flat.
 * PNG decoding di JS pakai library kecil — kalau perlu di-bundle, pakai
 * pngjs atau upng-js. Untuk performance lebih baik, prefer native decoder
 * via react-native-fast-tflite resize utility kalau ada.
 *
 * TODO: implement actual PNG decoding. Saat ini placeholder — Ari perlu add
 * PNG decoder library + this function di-completer.
 */
async function pngBase64ToTensor(_base64: string): Promise<Float32Array | null> {
  // Placeholder: actual implementation needs PNG decoder
  // Recommended: install `upng-js` (small, pure JS, ~10KB)
  // Atau pakai expo-gl untuk GPU-accelerated path.
  if (__DEV__) {
    console.warn(
      '[faceDescriptor] pngBase64ToTensor not yet implemented. ' +
        'Install upng-js + implement PNG → Float32Array conversion.',
    );
  }
  return null;
}

function l2Normalize(v: Float32Array): Float32Array {
  let mag = 0;
  for (let i = 0; i < v.length; i++) mag += v[i] * v[i];
  mag = Math.sqrt(mag);
  if (mag === 0) return v;
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i] / mag;
  return out;
}
