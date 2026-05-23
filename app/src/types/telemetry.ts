/**
 * Face login telemetry event types.
 *
 * Mirrors proposal di docs/backend-request-face-confidence-threshold-and-telemetry.md
 * — payload schema yang mobile push ke POST /auth/face/telemetry (kalau BE
 * sudah implement) atau silent drop kalau 404 (V1: BE belum implement).
 */

/** Event names. Beberapa event punya `flow` field karena di-share antara
 *  login dan enroll (mis. liveness check + descriptor compute). */
export type FaceTelemetryEvent =
  | 'face_login_attempt'           // User tap face login button
  | 'face_login_server_response'   // /auth/face/login response (success or error)
  | 'face_enroll_attempt'          // User tap enroll/update di settings
  | 'face_enroll_complete'         // enrollFace/updateFaceProfile success
  | 'face_enroll_fail'             // enrollFace/updateFaceProfile error
  | 'face_liveness_pass'           // LivenessChallenge all-pass (with flow field)
  | 'face_liveness_fail'           // LivenessChallenge fail (with flow + reason)
  | 'face_descriptor_compute'      // computeFaceDescriptor done (success or fail)
  | 'face_nonce_request';          // requestLivenessNonce done

/** Flow context untuk shared events (liveness, descriptor, nonce). */
export type FaceTelemetryFlow = 'login' | 'enroll';

export type FaceTelemetryOutcome = 'success' | 'failure';

export type FaceTelemetryDevice = {
  platform: 'ios' | 'android' | 'web';
  appVersion: string;
  modelVersion: string;
  osVersion?: string;
};

export type FaceTelemetryDurations = {
  /** Total time dari intro tap sampai liveness pass (LivenessChallenge). */
  livenessTotal?: number;
  /** computeFaceDescriptor() execution time (ML Kit + crop + TFLite). */
  descriptorCompute?: number;
  /** /auth/face/login fetch roundtrip. */
  serverRoundtrip?: number;
  /** /auth/face/liveness-nonce fetch roundtrip. */
  nonceRoundtrip?: number;
};

export type FaceTelemetryPayload = {
  /** Random ID minted on flow start (face screen open) untuk correlate
   *  multiple events dari single user attempt. Tidak persist; baru tiap open. */
  sessionId: string;
  /** User noHp kalau available — optional, drop kalau privacy concern. */
  noHp?: string;
  event: FaceTelemetryEvent;
  outcome: FaceTelemetryOutcome;
  /** Flow context: login | enroll. Wajib untuk liveness/descriptor/nonce. */
  flow?: FaceTelemetryFlow;
  /** Error code (uppercase) atau reason string. Hanya kalau outcome=failure. */
  failureReason?: string;
  /** Cosine confidence dari /face/login response. Hanya kalau outcome=success
   *  pada event=face_login_server_response. */
  confidence?: number;
  durationMs?: FaceTelemetryDurations;
  /** Device meta auto-filled by service. */
  device?: FaceTelemetryDevice;
  /** ISO timestamp auto-filled by service. */
  timestamp?: string;
};
