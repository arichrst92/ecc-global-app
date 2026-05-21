import { useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTranslation } from 'react-i18next';
import { Camera as CameraIcon, Keyboard } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';

/**
 * Reusable scanner camera dengan frame overlay + scan-line UI.
 * Debounce 1.5s antar scan supaya tidak double-fire.
 *
 * Props:
 * - paused: pause scanning (mis. saat result modal open)
 * - onScan: called dengan normalized kode (8 char alphanumeric upper)
 * - onManualInput: tap tombol manual input
 */
export function ScannerCamera({
  paused,
  onScan,
  onManualInput,
}: {
  paused: boolean;
  onScan: (kode: string) => void;
  onManualInput: () => void;
}) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const lastScanRef = useRef<{ kode: string; ts: number } | null>(null);

  function handleBarcode({ data }: { data: string }) {
    if (paused) return;
    const kode = data.trim().toUpperCase();
    // Normalize: BE expect 8-char alphanumeric uppercase
    if (!/^[A-Z0-9]{8}$/.test(kode)) return;
    // Debounce: same kode within 800ms = ignore (cegah double-fire dari
    // multiple frame). Lebih pendek dari sebelumnya supaya user bisa
    // re-scan QR yang sama dengan cepat untuk re-print label (antisipasi
    // kesalahan manusia, mis. label hilang/rusak).
    const now = Date.now();
    if (
      lastScanRef.current &&
      lastScanRef.current.kode === kode &&
      now - lastScanRef.current.ts < 800
    ) {
      return;
    }
    lastScanRef.current = { kode, ts: now };
    onScan(kode);
  }

  if (!permission) {
    return <View className="flex-1 bg-black" />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-neutral-900 items-center justify-center px-8">
        <View className="w-20 h-20 rounded-2xl bg-white/10 items-center justify-center mb-4">
          <CameraIcon size={32} color="#F97316" />
        </View>
        <Text className="text-white text-lg font-bold text-center">
          {t('scanner.camera_permission_title')}
        </Text>
        <Text className="text-white/70 text-sm text-center mt-1 mb-4">
          {t('scanner.camera_permission_msg')}
        </Text>
        <Button
          label={t('scanner.allow_camera')}
          onPress={requestPermission}
          size="md"
          fullWidth={false}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={paused ? undefined : handleBarcode}
      />

      {/* Frame overlay */}
      <View
        className="absolute inset-0 items-center justify-center"
        pointerEvents="box-none"
      >
        <View
          className={`border-2 rounded-2xl ${
            paused ? 'border-amber-400/70' : 'border-emerald-400/80'
          }`}
          style={{ width: 260, height: 260 }}
        />
        <Text className="text-white text-sm mt-4 px-8 text-center">
          {paused ? t('scanner.paused_hint') : t('scanner.scan_hint')}
        </Text>
      </View>

      {/* Manual input fab bottom */}
      <View
        className="absolute bottom-8 left-0 right-0 items-center"
        pointerEvents="box-none"
      >
        <Pressable
          onPress={onManualInput}
          className="bg-white/95 rounded-full px-5 py-3 flex-row items-center gap-2 shadow-lg"
        >
          <Keyboard size={16} color="#171717" />
          <Text className="text-sm font-semibold text-neutral-900">
            {t('scanner.manual_input')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
