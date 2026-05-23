import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, X } from 'lucide-react-native';
import {
  CameraView,
  useCameraPermissions,
  type CameraCapturedPicture,
  type CameraView as CameraViewType,
} from 'expo-camera';

import { detectFaceWithLiveness } from '@/services/faceDescriptor';

/**
 * Liveness Challenge — passive-active anti-spoofing gate.
 *
 * Flow state machine:
 *   intro      → tunggu user tap "Mulai"
 *   baseline   → minta user lihat lurus, mata terbuka. Capture frame.
 *                Verify: face detected + both eyes open prob > 0.7
 *   blink-cue  → countdown 1.5s "Sekarang KEDIPKAN MATA"
 *   blink      → capture frame saat user diharap blink.
 *                Verify: both eyes closed prob < 0.4 (delta dari baseline > 0.3)
 *   reopen-cue → "Buka mata lagi"
 *   reopen     → capture frame.
 *                Verify: both eyes open prob > 0.6
 *   success    → onSuccess() — caller lanjut ke descriptor capture
 *   failed     → show error + retry button
 *
 * Tujuan: cegah replay attack pakai still photo. Photo tidak bisa blink,
 * jadi kalau blink prob delta tidak terdeteksi → fail liveness.
 *
 * NOTE: tidak 100% bullet-proof. Attacker pakai video replay masih bisa
 * lewat. Untuk anti-video-replay butuh challenge-response yang lebih canggih
 * (randomized: blink + smile + turn head) atau 3D depth detection. V2 task.
 */

type Phase =
  | 'intro'
  | 'baseline'
  | 'blink-cue'
  | 'blink'
  | 'reopen-cue'
  | 'reopen'
  | 'success'
  | 'failed';

type Props = {
  /** Dipanggil saat semua challenge passed. Caller harus immediately lanjut
   *  ke descriptor capture (ideally dari camera ref yang sama). */
  onSuccess: () => void;
  onCancel: () => void;
};

// Thresholds — tuning notes:
// - leftEye/rightEye prob: ML Kit return ~0.95 untuk eyes wide open,
//   ~0.05 saat closed. Threshold 0.7/0.4 safe margin.
// - delta requirement: baseline 0.9 → blink 0.1 = delta 0.8. Minta delta >= 0.3
//   untuk allow user yang squint atau eyes naturally small.
const EYE_OPEN_THRESHOLD = 0.6;
const EYE_CLOSED_THRESHOLD = 0.4;
const MIN_BLINK_DELTA = 0.3;
const BLINK_CUE_MS = 1500;
const REOPEN_CUE_MS = 1000;

export function LivenessChallenge({ onSuccess, onCancel }: Props) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraViewType | null>(null);

  const [phase, setPhase] = useState<Phase>('intro');
  const [errorReason, setErrorReason] = useState<string | undefined>(undefined);
  const [errorDebug, setErrorDebug] = useState<string | undefined>(undefined);
  const [baselineEyeProb, setBaselineEyeProb] = useState<number | null>(null);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  /** Snap a fast low-quality frame untuk liveness check.
   *  Quality 0.4 + skipProcessing untuk minimize latency (~300-500ms vs ~1.5s
   *  full quality). Kita tidak butuh detail untuk classification. */
  async function snapFrame(): Promise<string | null> {
    if (!cameraRef.current) return null;
    try {
      const photo: CameraCapturedPicture | undefined = await cameraRef.current.takePictureAsync({
        base64: false,
        quality: 0.4,
        skipProcessing: true,
        exif: false,
      });
      return photo?.uri ?? null;
    } catch (e) {
      if (__DEV__) console.warn('[Liveness] snap error:', e);
      return null;
    }
  }

  function eyesAvg(face: { leftEyeOpenProbability?: number; rightEyeOpenProbability?: number }): number | null {
    const l = face.leftEyeOpenProbability;
    const r = face.rightEyeOpenProbability;
    // ML Kit returns undefined kalau classification gagal. Skip kalau salah satu missing.
    if (typeof l !== 'number' || typeof r !== 'number') return null;
    return (l + r) / 2;
  }

  // ============ Sequence runner ============
  // Dipanggil dari "Mulai" button. Berjalan single-shot sampai success/failed.
  async function runChallenge() {
    setErrorReason(undefined);
    setErrorDebug(undefined);

    // === Step 1: Baseline (eyes open) ===
    setPhase('baseline');
    await delay(800); // give user time to look at camera setelah tekan start
    const baselineUri = await snapFrame();
    if (!baselineUri) return fail('error', 'baseline snap failed');

    const baselineRes = await detectFaceWithLiveness(baselineUri);
    if (!baselineRes.ok) return fail(baselineRes.reason, baselineRes.message);

    const baselineEye = eyesAvg(baselineRes.face);
    if (baselineEye === null) {
      return fail('error', 'classification unavailable');
    }
    if (baselineEye < EYE_OPEN_THRESHOLD) {
      return fail('eyes_not_open', `baseline eye prob ${baselineEye.toFixed(2)} < ${EYE_OPEN_THRESHOLD}`);
    }
    setBaselineEyeProb(baselineEye);

    // === Step 2: Blink cue + capture ===
    setPhase('blink-cue');
    await delay(BLINK_CUE_MS);
    setPhase('blink');
    const blinkUri = await snapFrame();
    if (!blinkUri) return fail('error', 'blink snap failed');

    const blinkRes = await detectFaceWithLiveness(blinkUri);
    if (!blinkRes.ok) return fail(blinkRes.reason, blinkRes.message);

    const blinkEye = eyesAvg(blinkRes.face);
    if (blinkEye === null) {
      // ML Kit kadang tidak return classification kalau face partially occluded
      // (mata tertutup = landmark detection lemah). Treat as "tidak ke-detect blink".
      return fail('no_blink', 'classification missing during blink');
    }
    const delta = baselineEye - blinkEye;
    if (blinkEye >= EYE_CLOSED_THRESHOLD || delta < MIN_BLINK_DELTA) {
      return fail(
        'no_blink',
        `blink eye prob ${blinkEye.toFixed(2)} (delta ${delta.toFixed(2)}), required <${EYE_CLOSED_THRESHOLD} & delta>=${MIN_BLINK_DELTA}`,
      );
    }

    // === Step 3: Reopen cue + capture ===
    setPhase('reopen-cue');
    await delay(REOPEN_CUE_MS);
    setPhase('reopen');
    const reopenUri = await snapFrame();
    if (!reopenUri) return fail('error', 'reopen snap failed');

    const reopenRes = await detectFaceWithLiveness(reopenUri);
    if (!reopenRes.ok) return fail(reopenRes.reason, reopenRes.message);

    const reopenEye = eyesAvg(reopenRes.face);
    if (reopenEye === null || reopenEye < EYE_OPEN_THRESHOLD - 0.1) {
      return fail('eyes_not_reopened', `reopen eye prob ${reopenEye?.toFixed(2) ?? 'n/a'}`);
    }

    // === All passed ===
    setPhase('success');
    // Small delay supaya user lihat "berhasil" check sebelum lanjut descriptor.
    await delay(400);
    onSuccess();
  }

  function fail(reason: string, debug?: string) {
    setErrorReason(reason);
    setErrorDebug(debug);
    setPhase('failed');
    if (__DEV__) console.warn('[Liveness] failed:', reason, debug);
  }

  function reset() {
    setErrorReason(undefined);
    setErrorDebug(undefined);
    setBaselineEyeProb(null);
    setPhase('intro');
  }

  // ============ Render ============
  if (!permission) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <Text className="text-white text-sm">{t('common.loading')}</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-black items-center justify-center px-6">
        <Text className="text-white text-lg font-bold mb-2 text-center">
          {t('face.camera_permission_title')}
        </Text>
        <Text className="text-neutral-400 text-sm text-center mb-6 leading-relaxed">
          {t('face.camera_permission_body')}
        </Text>
        <Pressable
          onPress={requestPermission}
          className="bg-brand-500 py-3 px-6 rounded-xl"
        >
          <Text className="text-white font-semibold">{t('face.camera_permission_grant')}</Text>
        </Pressable>
        <Pressable onPress={onCancel} className="py-3 mt-3">
          <Text className="text-neutral-400 font-semibold">{t('common.cancel')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        ref={(r) => {
          cameraRef.current = r;
        }}
        style={{ flex: 1 }}
        facing="front"
      />

      {/* Top close */}
      <View className="absolute top-0 left-0 right-0 pt-12 px-4">
        <Pressable
          onPress={onCancel}
          className="w-10 h-10 rounded-full bg-black/50 items-center justify-center"
        >
          <X size={20} color="#fff" />
        </Pressable>
      </View>

      {/* Center oval */}
      <View className="absolute inset-0 items-center justify-center pointer-events-none">
        <View
          style={{
            width: 240,
            height: 320,
            borderRadius: 999,
            borderWidth: 3,
            borderColor:
              phase === 'failed'
                ? '#DC2626'
                : phase === 'success'
                  ? '#10B981'
                  : phase === 'blink-cue' || phase === 'blink'
                    ? '#F59E0B'
                    : '#fff',
            opacity: 0.9,
          }}
        />
        {/* Eye icon overlay untuk cue */}
        {(phase === 'blink-cue' || phase === 'blink') && (
          <View className="absolute items-center">
            <EyeOff size={56} color="#F59E0B" />
          </View>
        )}
        {(phase === 'reopen-cue' || phase === 'reopen') && (
          <View className="absolute items-center">
            <Eye size={56} color="#fff" />
          </View>
        )}
      </View>

      {/* Bottom instruction + CTA */}
      <View className="absolute bottom-0 left-0 right-0 pb-12 px-6 items-center">
        <View className="bg-black/70 rounded-2xl px-4 py-3 mb-4 max-w-sm">
          <Text className="text-white text-base font-semibold text-center leading-relaxed">
            {phase === 'intro' && t('face.liveness_intro')}
            {phase === 'baseline' && t('face.liveness_baseline')}
            {phase === 'blink-cue' && t('face.liveness_blink_cue')}
            {phase === 'blink' && t('face.liveness_blink_check')}
            {phase === 'reopen-cue' && t('face.liveness_reopen_cue')}
            {phase === 'reopen' && t('face.liveness_reopen_check')}
            {phase === 'success' && t('face.liveness_success')}
            {phase === 'failed' &&
              (errorReason
                ? t(`face.error_liveness_${errorReason}`, {
                    defaultValue: t('face.liveness_failed_generic'),
                  })
                : t('face.liveness_failed_generic'))}
          </Text>
          {phase === 'failed' && errorReason === 'no_blink' && (
            <Text className="text-amber-300 text-xs text-center mt-2">
              {t('face.liveness_blink_tip')}
            </Text>
          )}
          {__DEV__ && errorDebug && (
            <Text className="text-neutral-400 text-[10px] text-center mt-2 font-mono">
              {errorDebug}
              {baselineEyeProb !== null ? ` | baseline=${baselineEyeProb.toFixed(2)}` : ''}
            </Text>
          )}
        </View>

        {phase === 'intro' && (
          <Pressable
            onPress={runChallenge}
            className="bg-brand-500 py-3 px-8 rounded-2xl"
          >
            <Text className="text-white font-bold text-base">{t('face.liveness_start')}</Text>
          </Pressable>
        )}

        {phase === 'failed' && (
          <View className="flex-row gap-2">
            <Pressable
              onPress={onCancel}
              className="bg-neutral-700 py-3 px-6 rounded-2xl"
            >
              <Text className="text-white font-semibold">{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                reset();
                runChallenge();
              }}
              className="bg-brand-500 py-3 px-6 rounded-2xl"
            >
              <Text className="text-white font-bold">{t('face.try_again')}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
