import { useRef, type ReactNode } from 'react';
import { gx } from '@/theme/gradient';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTranslation } from 'react-i18next';
import { Camera as CameraIcon, Keyboard, UserPlus } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { nc } from '@/theme/ThemeRoot';

/**
 * Reusable scanner camera dengan frame overlay + scan-line UI.
 * Debounce 1.5s antar scan supaya tidak double-fire.
 *
 * Props:
 * - paused: pause scanning (mis. saat result modal open)
 * - onScan: called dengan normalized kode (8 char alphanumeric upper)
 * - onManualInput: tap tombol manual input
 * - footer: konten di bawah tombol (mis. pilihan mode Check-in/Check-out),
 *   disusun dalam satu tumpukan supaya tidak saling menimpa.
 */
export function ScannerCamera({
  paused,
  onScan,
  onManualInput,
  onWalkInGuest,
  footer,
}: {
  paused: boolean;
  onScan: (kode: string) => void;
  onManualInput: () => void;
  /** Kalau diisi: tampil tombol "+ Tamu" untuk catat tamu walk-in. */
  onWalkInGuest?: () => void;
  footer?: ReactNode;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const lastScanRef = useRef<{ kode: string; ts: number } | null>(null);

  function handleBarcode({ data }: { data: string }) {
    if (paused) return;
    const kode = data.trim().toUpperCase();
    // Normalize: BE expect 8-char alphanumeric uppercase
    if (!/^[A-Z0-9]{8}$/.test(kode)) return;
    // Debounce: kode yang sama dalam 3 detik = abaikan. Mencegah double-fire
    // dan scan ulang otomatis saat QR masih di depan kamera setelah hasil
    // ditutup (dulu 800 ms → muncul "sudah check-in" berulang).
    const now = Date.now();
    if (
      lastScanRef.current &&
      lastScanRef.current.kode === kode &&
      now - lastScanRef.current.ts < 3000
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
      <View className="flex-1 bg-black items-center justify-center px-8">
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
      <View className="absolute inset-0 items-center justify-center" pointerEvents="box-none">
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

      {/* Tombol bawah (Input Manual, + Tamu) + footer — satu tumpukan, tidak bertumpuk */}
      <View
        className="absolute left-0 right-0 items-center px-4"
        // Jangan ketutup navigation bar / home indicator (edge-to-edge)
        style={{
          bottom: footer ? Math.max(12, insets.bottom + 8) : Math.max(32, insets.bottom + 16),
        }}
        pointerEvents="box-none"
      >
        <View className="flex-row flex-wrap justify-center gap-2">
          <Pressable
            onPress={onManualInput}
            className="bg-card border border-neutral-200 rounded-full px-5 py-3 flex-row items-center gap-2 shadow-lg"
          >
            <Keyboard size={16} color={nc('#171717')} />
            <Text className="text-sm font-semibold text-neutral-900">
              {t('scanner.manual_input')}
            </Text>
          </Pressable>
          {onWalkInGuest ? (
            <Pressable
              onPress={onWalkInGuest}
              {...gx('bg-violet-600 rounded-full px-5 py-3 flex-row items-center gap-2 shadow-lg')}
            >
              <UserPlus size={16} color="#fff" />
              <Text className="text-sm font-semibold text-white">{t('tamu.walkin_short')}</Text>
            </Pressable>
          ) : null}
        </View>
        {footer ? <View className="self-stretch mt-3">{footer}</View> : null}
      </View>
    </View>
  );
}
