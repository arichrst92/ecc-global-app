/**
 * Face Descriptor Service.
 *
 * Bridge antara RN (camera) dan face-api.js (di hidden WebView) untuk compute
 * 128-dim FaceNet descriptor yang compatible dengan BE.
 *
 * Why WebView: face-api.js native untuk web/Node.js, ga ada port RN yang
 * maintain weight compatibility. WebView running face-api.js guarantees
 * descriptor space identical dengan BE (yang juga pakai face-api.js / FaceNet).
 *
 * Architecture:
 *   FaceCapture screen ─[image base64]→ this service
 *                                           ↓ postMessage
 *                                       hidden WebView (face-api.js)
 *                                           ↓ onMessage
 *                                       descriptor (128 float)
 *
 * Hidden WebView di-mount sekali di root layout (FaceDescriptorProvider).
 * Service singleton-style — `setBridge()` dipanggil oleh provider.
 *
 * Trade-off: ~1s init time untuk load face-api.js model (CDN saat ini, bundle
 * sebagai asset di production untuk offline support).
 */

import { FACE_DESCRIPTOR_DIM } from '@/types/auth';

export type ComputeResult =
  | { ok: true; descriptor: number[] }
  | { ok: false; reason: 'no_face' | 'multiple_faces' | 'low_quality' | 'timeout' | 'error'; message?: string };

type Bridge = {
  /** Post message ke WebView. WebView callback resolve via onMessage. */
  request: (imageBase64: string) => Promise<ComputeResult>;
  isReady: () => boolean;
};

let bridge: Bridge | null = null;

export function setFaceDescriptorBridge(b: Bridge | null) {
  bridge = b;
}

export function isFaceDescriptorReady(): boolean {
  return bridge?.isReady() ?? false;
}

/**
 * Compute descriptor dari image base64 (JPEG/PNG data URL or raw base64).
 *
 * Returns ComputeResult — handle no_face / multiple_faces / low_quality
 * di UI dengan tampilkan guidance ("posisikan wajah di tengah", dll).
 */
export async function computeFaceDescriptor(imageBase64: string): Promise<ComputeResult> {
  if (!bridge) {
    return { ok: false, reason: 'error', message: 'Face engine belum siap' };
  }
  try {
    const result = await bridge.request(imageBase64);
    if (result.ok && result.descriptor.length !== FACE_DESCRIPTOR_DIM) {
      return {
        ok: false,
        reason: 'error',
        message: `Descriptor dim mismatch: ${result.descriptor.length} (expected ${FACE_DESCRIPTOR_DIM})`,
      };
    }
    return result;
  } catch (e) {
    return {
      ok: false,
      reason: 'error',
      message: e instanceof Error ? e.message : String(e),
    };
  }
}
