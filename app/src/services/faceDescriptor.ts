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

/** Detected face with optional classification + euler angle data (when ML Kit
 *  detect dipanggil dengan classificationMode/landmarkMode = 'all'). */
export type DetectedFace = {
  frame: { left: number; top: number; width: number; height: number };
  /** Probability mata kiri terbuka (0..1). undefined kalau classificationMode='none'. */
  leftEyeOpenProbability?: number;
  rightEyeOpenProbability?: number;
  smilingProbability?: number;
  /** Head rotation angles (degrees). undefined kalau landmarkMode='none' di ML Kit Android,
   *  tapi typically returned regardless di iOS. */
  headEulerAngleX?: number; // pitch (look up/down)
  headEulerAngleY?: number; // yaw (look left/right)
  headEulerAngleZ?: number; // roll (tilt head sideways)
};

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
  ) => Promise<DetectedFace[]>;
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
 * Detect face dengan full classification + euler angles. Dipakai oleh
 * LivenessChallenge untuk verify eye-open probability + head pose.
 *
 * Returns single face (largest) atau null kalau tidak ada / multiple faces.
 */
export async function detectFaceWithLiveness(
  imageUri: string,
): Promise<{ ok: true; face: DetectedFace } | { ok: false; reason: 'no_face' | 'multiple_faces' | 'error'; message?: string }> {
  if (Platform.OS === 'web') {
    return { ok: false, reason: 'error', message: 'Web tidak support ML Kit' };
  }
  try {
    const FaceDetection = await loadMlKit();
    if (!FaceDetection) {
      return { ok: false, reason: 'error', message: 'ML Kit unavailable' };
    }
    // Mode 'all' supaya dapat eyeOpenProbability + euler angles.
    // performanceMode 'fast' karena kita butuh latency rendah untuk
    // sequence multi-frame liveness (3-4 captures back-to-back).
    const faces = await FaceDetection.detect(imageUri, {
      performanceMode: 'fast',
      landmarkMode: 'all',
      classificationMode: 'all',
      contourMode: 'none',
      minFaceSize: 0.2,
    });
    if (!faces || faces.length === 0) return { ok: false, reason: 'no_face' };
    if (faces.length > 1) return { ok: false, reason: 'multiple_faces' };
    return { ok: true, face: faces[0] };
  } catch (e) {
    return {
      ok: false,
      reason: 'error',
      message: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Convert PNG base64 → Float32Array tensor untuk MobileFaceNet input.
 *
 * MobileFaceNet expects:
 * - Shape: [1, 112, 112, 3] (batch, h, w, channels) — flat = 37,632 floats
 * - Channels: RGB (drop alpha kalau ada)
 * - Normalization: (pixel - 127.5) / 127.5 → range -1..1
 *
 * Implementation:
 * - upng-js decode PNG → RGBA Uint8Array
 * - convert RGBA → RGB + normalize per pixel
 *
 * upng-js works di RN (pure JS, no native binding). atob polyfill di RN
 * available via global (react-native polyfill).
 */
async function pngBase64ToTensor(base64: string): Promise<Float32Array | null> {
  try {
    // Lazy import — upng-js bisa ga ada kalau dev belum npm install
    const upng = (await import('upng-js')) as unknown as {
      default?: UpngModule;
    } & UpngModule;
    const UPNG: UpngModule = (upng.default ?? upng) as UpngModule;
    if (!UPNG || typeof UPNG.decode !== 'function' || typeof UPNG.toRGBA8 !== 'function') {
      if (__DEV__) console.warn('[faceDescriptor] upng-js decode/toRGBA8 unavailable');
      return null;
    }

    // base64 → Uint8Array (RN polyfills global.atob, fallback Buffer kalau ada)
    const binary = base64ToUint8Array(base64);
    const img = UPNG.decode(binary.buffer as ArrayBuffer);

    // Verify dimension match MobileFaceNet input
    if (img.width !== 112 || img.height !== 112) {
      if (__DEV__) {
        console.warn(
          '[faceDescriptor] PNG dim mismatch: ' + img.width + 'x' + img.height + ' (expected 112x112)',
        );
      }
      return null;
    }

    // UPNG.decode() return raw IDAT chunk data — NOT decoded pixels.
    // Must call UPNG.toRGBA8(img) untuk actually decode PNG → RGBA8 buffer.
    // Returns ArrayBuffer[] (1 frame untuk static PNG, multi-frame untuk APNG).
    // First frame index 0; convert ke Uint8Array length width*height*4.
    const frames = UPNG.toRGBA8(img);
    if (!frames || frames.length === 0) {
      if (__DEV__) console.warn('[faceDescriptor] UPNG.toRGBA8 returned no frames');
      return null;
    }
    const rgba = new Uint8Array(frames[0]);
    const expectedRGBA = img.width * img.height * 4;
    if (rgba.length !== expectedRGBA) {
      if (__DEV__) {
        console.warn(
          '[faceDescriptor] unexpected RGBA length: ' +
            rgba.length +
            ' (expected ' + expectedRGBA + ')',
        );
      }
      return null;
    }

    return rgbaToNormalizedTensor(rgba);
  } catch (e) {
    if (__DEV__) console.warn('[faceDescriptor] PNG decode error:', e);
    return null;
  }
}

type UpngModule = {
  decode: (buf: ArrayBuffer) => UpngImage;
  toRGBA8: (img: UpngImage) => ArrayBuffer[];
};

type UpngImage = {
  width: number;
  height: number;
  depth: number;
  ctype: number;
  data: Uint8Array;
};

/** Convert base64 string → Uint8Array. RN polyfill atob (kalau available)
 *  atau fallback manual decoder. */
function base64ToUint8Array(base64: string): Uint8Array {
  // Strip data URL prefix kalau ada
  const clean = base64.includes(',') ? base64.split(',')[1] : base64;
  // React Native polyfill global.atob
  const binStr = globalThis.atob ? globalThis.atob(clean) : decodeBase64Manual(clean);
  const len = binStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binStr.charCodeAt(i);
  return bytes;
}

// Minimal manual base64 decoder (fallback kalau atob ga ada di env)
const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function decodeBase64Manual(input: string): string {
  let str = input.replace(/=+$/, '');
  let output = '';
  for (
    let bc = 0, bs = 0, buffer: number, i = 0;
    (buffer = str.charCodeAt(i++)) !== undefined;
  ) {
    buffer = B64_CHARS.indexOf(String.fromCharCode(buffer));
    if (buffer === -1) continue;
    bs = bc % 4 ? bs * 64 + buffer : buffer;
    if (bc++ % 4) output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
  }
  return output;
}

/** RGBA Uint8Array (length 4N) → Float32Array RGB normalized (length 3N). */
function rgbaToNormalizedTensor(rgba: Uint8Array): Float32Array {
  const pixelCount = rgba.length / 4;
  const out = new Float32Array(pixelCount * 3);
  for (let i = 0; i < pixelCount; i++) {
    const srcOffset = i * 4;
    const dstOffset = i * 3;
    // Drop alpha at srcOffset+3, normalize each channel
    out[dstOffset] = (rgba[srcOffset] - 127.5) / 127.5;
    out[dstOffset + 1] = (rgba[srcOffset + 1] - 127.5) / 127.5;
    out[dstOffset + 2] = (rgba[srcOffset + 2] - 127.5) / 127.5;
  }
  return out;
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
