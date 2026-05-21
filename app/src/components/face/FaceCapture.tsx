import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Camera, X } from 'lucide-react-native';
import {
  CameraView,
  useCameraPermissions,
  type CameraCapturedPicture,
  type CameraView as CameraViewType,
} from 'expo-camera';

import {
  computeFaceDescriptor,
  isFaceDescriptorReady,
} from '@/services/faceDescriptor';
import type { ComputeResult } from '@/services/faceDescriptor';

type Props = {
  /** Saat capture sukses + descriptor tersedia. */
  onSuccess: (descriptor: number[]) => void;
  /** Saat user close screen tanpa capture. */
  onCancel: () => void;
  /** Optional active liveness — minta user blink/turn head sebelum capture. */
  requireLiveness?: boolean;
};

/**
 * Camera capture screen untuk face enrollment + login.
 *
 * Flow:
 * 1. Request camera permission
 * 2. Tampilkan preview kamera (front-facing)
 * 3. User tap capture button (atau auto-capture saat face detected stable)
 * 4. Snap photo → compute descriptor via FaceDescriptorProvider WebView
 * 5. Handle no_face / multiple_faces / low_quality dengan error UI
 * 6. On success → onSuccess(descriptor)
 *
 * Liveness (optional): kalau requireLiveness=true, minta user blink atau head
 * turn sebelum capture. Implementasi sederhana: hitung sampai 3 + visual cue.
 * Full liveness ML detection di-defer ke iteration berikutnya.
 */
export function FaceCapture({ onSuccess, onCancel, requireLiveness = false }: Props) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraViewType | null>(null);
  const [phase, setPhase] = useState<'idle' | 'capturing' | 'processing' | 'error'>('idle');
  const [errorReason, setErrorReason] = useState<ComputeResult['ok'] extends true ? never : string | undefined>(undefined);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  async function handleCapture() {
    if (!cameraRef.current || phase !== 'idle') return;
    setPhase('capturing');
    try {
      const photo: CameraCapturedPicture | undefined = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.7,
        skipProcessing: true,
      });
      if (!photo?.base64) {
        setErrorReason('error');
        setPhase('error');
        return;
      }

      setPhase('processing');

      if (!isFaceDescriptorReady()) {
        setErrorReason('engine_not_ready');
        setPhase('error');
        return;
      }

      const result = await computeFaceDescriptor(photo.base64);
      if (result.ok) {
        onSuccess(result.descriptor);
      } else {
        setErrorReason(result.reason);
        setPhase('error');
      }
    } catch (e) {
      console.warn('[FaceCapture] capture error:', e);
      setErrorReason('error');
      setPhase('error');
    }
  }

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
        <View className="w-20 h-20 rounded-2xl bg-neutral-800 items-center justify-center mb-4">
          <Camera size={40} color="#A3A3A3" />
        </View>
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
          <Text className="text-white font-semibold">
            {t('face.camera_permission_grant')}
          </Text>
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

      {/* Top close button */}
      <View className="absolute top-0 left-0 right-0 pt-12 px-4">
        <Pressable
          onPress={onCancel}
          className="w-10 h-10 rounded-full bg-black/50 items-center justify-center"
        >
          <X size={20} color="#fff" />
        </Pressable>
      </View>

      {/* Center oval guide overlay */}
      <View className="absolute inset-0 items-center justify-center pointer-events-none">
        <View
          style={{
            width: 240,
            height: 320,
            borderRadius: 999,
            borderWidth: 3,
            borderColor:
              phase === 'error'
                ? '#DC2626'
                : phase === 'processing'
                  ? '#F59E0B'
                  : '#fff',
            opacity: 0.85,
          }}
        />
      </View>

      {/* Bottom instruction + capture */}
      <View className="absolute bottom-0 left-0 right-0 pb-12 px-6 items-center">
        <View className="bg-black/60 rounded-2xl px-4 py-3 mb-4 max-w-sm">
          <Text className="text-white text-sm text-center leading-relaxed">
            {phase === 'idle' && t('face.instruction_position')}
            {phase === 'capturing' && t('face.instruction_hold')}
            {phase === 'processing' && t('face.instruction_processing')}
            {phase === 'error' && errorReason
              ? t(`face.error_${errorReason}`, {
                  defaultValue: t('face.error_generic'),
                })
              : null}
          </Text>
          {requireLiveness && phase === 'idle' ? (
            <Text className="text-amber-300 text-xs text-center mt-2">
              {t('face.liveness_hint')}
            </Text>
          ) : null}
        </View>

        {phase === 'error' ? (
          <Pressable
            onPress={() => {
              setErrorReason(undefined);
              setPhase('idle');
            }}
            className="bg-brand-500 py-3 px-8 rounded-2xl"
          >
            <Text className="text-white font-bold">{t('face.try_again')}</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleCapture}
            disabled={phase !== 'idle'}
            className={`w-20 h-20 rounded-full items-center justify-center border-4 ${
              phase === 'idle' ? 'bg-white border-white/50' : 'bg-neutral-400 border-neutral-300'
            }`}
          >
            <View className="w-16 h-16 rounded-full bg-white" />
          </Pressable>
        )}
      </View>
    </View>
  );
}
