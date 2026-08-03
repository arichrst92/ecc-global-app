/**
 * Scanner Ibadah screen — mode toggle Check-in / Checkout / Pickup.
 *
 * Modes:
 * - CHECKIN (always available): scan QR 8-char → POST /admin/ibadah/:id/checkin
 * - CHECKOUT (only kalau ibadah.requiresCheckout=true): scan QR 8-char →
 *   POST /admin/reservasi/checkout. Symmetric flow dgn check-in.
 *   Per BE notice Modul 26 2026-08-01.
 * - PICKUP (only kalau ibadah.isKidsIbadah=true): input kode jemput 6-digit
 *   → POST /admin/reservasi/pickup. Modal khusus (bukan QR scan) karena
 *   kode 6-digit lebih pendek + parent umumnya tunjukkan display code.
 *   Per BE notice Modul 27 2026-08-01.
 */
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Baby, LogIn, LogOut } from 'lucide-react-native';

import { useToast } from '@/components/ui/Toast';
import { ManualInputModal } from '@/components/scanner/ManualInputModal';
import { ScanResultModal, type ScanResultKind } from '@/components/scanner/ScanResultModal';
import { ScannerCamera } from '@/components/scanner/ScannerCamera';
import { PickupInputModal } from '@/components/scanner/PickupInputModal';
import {
  useIbadahCheckinStats,
  usePickupReservasi,
  useScannerIbadah,
  useWalkInReservasi,
} from '@/hooks/useScanner';
import { usePrinterStore } from '@/stores/printer.store';
import { printerService, PrinterError } from '@/services/printer';
import { ApiError } from '@/types/api';
import { todayIso, formatDate } from '@/utils/date';

type ScannerMode = 'checkin' | 'checkout' | 'pickup';

export default function ScannerIbadahScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const router = useRouter();
  const { id, tanggal } = useLocalSearchParams<{ id: string; tanggal?: string }>();
  const tanggalIbadah = tanggal || todayIso();
  const showToast = useToast((s) => s.show);

  const ibadahQuery = useScannerIbadah();
  const ibadahMeta = ibadahQuery.data?.find((i) => i.ibadahId === id);

  // Feature flags dari ibadah metadata (BE-provided).
  // Kalau field belum ada di response (BE lama), default false.
  const requiresCheckout = ibadahMeta?.requiresCheckout === true;
  const isKidsIbadah = ibadahMeta?.isKidsIbadah === true;

  const pickupMutation = usePickupReservasi(id, tanggalIbadah);
  const statsQuery = useIbadahCheckinStats(id, tanggalIbadah);
  // Walk-in universal (BE endpoint live 2026-08-03 dgn kode alternate).
  // 1 endpoint untuk semua mode: checkin + checkout + pickup.
  const walkInMutation = useWalkInReservasi(id, tanggalIbadah);

  const isPrinterConnected = usePrinterStore((s) => s.isConnected);
  const paperSize = usePrinterStore((s) => s.paperSize);
  const autoPrint = usePrinterStore((s) => s.autoPrint);

  const [mode, setMode] = useState<ScannerMode>('checkin');
  const [manualOpen, setManualOpen] = useState(false);
  const [pickupOpen, setPickupOpen] = useState(false);
  const [result, setResult] = useState<ScanResultKind | null>(null);
  const [pendingKode, setPendingKode] = useState<string | null>(null);
  const [printLoading, setPrintLoading] = useState(false);

  const anyMutationPending = pickupMutation.isPending || walkInMutation.isPending;

  async function handlePrint() {
    if (!result || result.kind !== 'success') return;
    setPrintLoading(true);
    try {
      const statusLabel =
        mode === 'checkout' ? 'CHECKOUT' : result.walkIn ? 'WALK-IN' : 'JOIN';
      await printerService.printLabel(
        {
          header: ibadahMeta?.nama ? `ECC · ${ibadahMeta.nama}` : 'ECC Ibadah',
          namaLengkap: result.namaLengkap,
          kode: pendingKode ?? '',
          detail: formatDate(tanggalIbadah, lang),
          status: statusLabel,
        },
        paperSize,
      );
      showToast(t('printer.test_print_sent'), 'success');
    } catch (err) {
      if (err instanceof PrinterError) {
        showToast(err.message, 'error');
      } else {
        showToast(t('error.network'), 'error');
      }
    } finally {
      setPrintLoading(false);
    }
  }

  /**
   * Unified walk-in flow untuk semua mode. Post BE deploy 2026-08-03:
   * walk-in endpoint accept `kode` alternate (backend-request-walkin-accept-
   * kode.md → RESOLVED). Mobile scanner scan QR profile jemaat (8-char kode)
   * + kirim ke walk-in endpoint dgn action sesuai mode.
   *
   * Response include jemaat info + reservasi (id, kode, status, pickupCode).
   * Untuk kids ibadah + checkin, response include pickupCode → show toast
   * prominent untuk parent.
   */
  function runWalkIn(kode: string, action: 'checkin' | 'checkout' | 'pickup') {
    setPendingKode(kode);
    walkInMutation.mutate(
      { kode, ibadahId: id, tanggalIbadah, action },
      {
        onSuccess: (data) => {
          setManualOpen(false);
          const alreadyDone =
            (action === 'checkin' && data.reservasi.status === 'JOIN' && !!data.reservasi.joinedAt) ||
            (action === 'checkout' &&
              data.reservasi.status === 'COMPLETED' &&
              !!data.reservasi.checkedOutAt) ||
            (action === 'pickup' && !!data.reservasi.pickedUpAt);
          setResult({
            kind: 'success',
            namaLengkap: data.jemaat.namaLengkap,
            fotoUrl: data.jemaat.fotoUrl,
            walkIn: action === 'checkin',
            alreadyCheckedIn: alreadyDone,
          });
          // Kids ibadah + checkin → show toast prominent dgn kode jemput
          if (action === 'checkin' && isKidsIbadah && data.pickupCode) {
            showToast(
              t('scanner.pickup_code_generated', { code: data.pickupCode }),
              'success',
            );
          }
          statsQuery.refetch();
        },
        onError: (err) => {
          setManualOpen(false);
          handleScanError(err, kode);
        },
      },
    );
  }

  function runPickup(pickupCode: string) {
    pickupMutation.mutate(
      { pickupCode },
      {
        onSuccess: (data) => {
          setPickupOpen(false);
          Alert.alert(
            t('scanner.pickup_success_title'),
            t('scanner.pickup_success_msg', {
              nama: data.anak.namaLengkap,
              ibadah: data.ibadahNama,
            }),
          );
          statsQuery.refetch();
        },
        onError: (err) => {
          if (err instanceof ApiError) {
            if (err.code === 'BAD_REQUEST') {
              Alert.alert(
                t('scanner.pickup_error_multi_title'),
                err.message,
              );
            } else if (err.code === 'NOT_FOUND') {
              Alert.alert(
                t('scanner.pickup_error_notfound_title'),
                t('scanner.pickup_error_notfound_msg'),
              );
            } else {
              Alert.alert(t('common.error'), err.message);
            }
          } else {
            Alert.alert(t('common.error'), t('error.network'));
          }
        },
      },
    );
  }

  function handleScanError(err: unknown, kode: string) {
    if (err instanceof ApiError) {
      if (err.code === 'NOT_FOUND') {
        setResult({ kind: 'not_found', kode });
      } else if (err.code === 'FORBIDDEN') {
        setResult({ kind: 'forbidden', message: err.message });
      } else if (err.code === 'CONFLICT') {
        setResult({ kind: 'conflict', message: err.message });
      } else if (err.code === 'BAD_REQUEST') {
        setResult({ kind: 'error', message: err.message });
      } else {
        setResult({ kind: 'error', message: err.message });
      }
    } else {
      setResult({ kind: 'error', message: t('error.network') });
    }
  }

  function handleScan(kode: string) {
    // Semua mode pakai walk-in endpoint (BE support kode alternate live 2026-08-03).
    // Mode pickup ALSO accept scan QR anak — walk-in resolve via jemaat kode +
    // auto-detect kids reservasi. Alternative parent-driven: input 6-digit kode
    // via PickupInputModal.
    if (mode === 'checkout') runWalkIn(kode, 'checkout');
    else if (mode === 'checkin') runWalkIn(kode, 'checkin');
    else if (mode === 'pickup') runWalkIn(kode, 'pickup');
  }

  function dismissResult() {
    setResult(null);
    setPendingKode(null);
  }

  function handleForce() {
    if (!pendingKode) return;
    // Force retry walk-in checkin (mis. conflict override).
    // BE walk-in idempotent — retry same kode = no-op kalau sudah check-in.
    runWalkIn(pendingKode, 'checkin');
  }

  const stats = statsQuery.data;
  // Mode pickup: allow scan QR anak (walk-in) ATAU 6-digit input. Kamera aktif
  // di kedua mode. Pause hanya saat modal/result open atau mutation in-flight.
  const isPaused = result !== null || manualOpen || pickupOpen || anyMutationPending;

  // Mode-based colors
  const modeColor =
    mode === 'checkin' ? '#3b82f6' : mode === 'checkout' ? '#F59E0B' : '#F97316';

  return (
    <View className="flex-1 bg-black">
      <ScannerCamera
        paused={isPaused}
        onScan={handleScan}
        onManualInput={() => {
          if (mode === 'pickup') setPickupOpen(true);
          else setManualOpen(true);
        }}
      />

      {/* Floating header */}
      <SafeAreaView edges={['top']} className="absolute top-0 left-0 right-0">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-black/40 items-center justify-center"
          >
            <ArrowLeft size={20} color="#fff" />
          </Pressable>
          <View className="flex-1 ml-2">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-white font-bold text-sm" numberOfLines={1}>
                {ibadahMeta?.nama ?? t('scanner.title')}
              </Text>
              {isKidsIbadah ? (
                <View className="bg-brand-500/80 px-1.5 py-0.5 rounded">
                  <Text className="text-white text-[10px] font-bold">🧒 KIDS</Text>
                </View>
              ) : null}
            </View>
            <Text className="text-white/70 text-[10px]">{tanggalIbadah}</Text>
          </View>
          {stats ? (
            <View className="bg-black/50 px-3 py-1.5 rounded-full flex-row items-center gap-1.5">
              <View className="w-2 h-2 rounded-full bg-emerald-400" />
              <Text className="text-white text-xs font-bold">
                {stats.hadir}
                {stats.total > 0 ? `/${stats.total}` : ''}
              </Text>
            </View>
          ) : null}
        </View>
      </SafeAreaView>

      {/* Bottom overlay — mode toggle + pickup CTA */}
      <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-0 right-0">
        <View className="px-4 pb-3">
          {/* Instruction card kalau mode pickup */}
          {mode === 'pickup' ? (
            <Pressable
              onPress={() => setPickupOpen(true)}
              className="bg-brand-500 rounded-2xl p-4 mb-3 flex-row items-center gap-3 active:opacity-80"
            >
              <View className="w-11 h-11 rounded-xl bg-white/20 items-center justify-center">
                <Baby size={22} color="#fff" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-sm font-bold">
                  {t('scanner.pickup_cta_title')}
                </Text>
                <Text className="text-white/80 text-xs mt-0.5">
                  {t('scanner.pickup_cta_sub')}
                </Text>
              </View>
            </Pressable>
          ) : null}

          {/* Mode toggle segmented */}
          <View className="flex-row bg-black/60 rounded-2xl p-1">
            <ModeChip
              active={mode === 'checkin'}
              activeColor="#3b82f6"
              icon={<LogIn size={14} color={mode === 'checkin' ? '#fff' : '#a3a3a3'} />}
              label={t('scanner.mode_checkin')}
              onPress={() => setMode('checkin')}
            />
            {requiresCheckout ? (
              <ModeChip
                active={mode === 'checkout'}
                activeColor="#F59E0B"
                icon={
                  <LogOut size={14} color={mode === 'checkout' ? '#fff' : '#a3a3a3'} />
                }
                label={t('scanner.mode_checkout')}
                onPress={() => setMode('checkout')}
              />
            ) : null}
            {isKidsIbadah ? (
              <ModeChip
                active={mode === 'pickup'}
                activeColor="#F97316"
                icon={<Baby size={14} color={mode === 'pickup' ? '#fff' : '#a3a3a3'} />}
                label={t('scanner.mode_pickup')}
                onPress={() => setMode('pickup')}
              />
            ) : null}
          </View>
        </View>
      </SafeAreaView>

      <ManualInputModal
        visible={manualOpen}
        onClose={() => setManualOpen(false)}
        onSubmit={(kode) =>
          runWalkIn(kode, mode === 'pickup' ? 'pickup' : mode)
        }
        loading={walkInMutation.isPending}
      />

      <PickupInputModal
        visible={pickupOpen}
        onClose={() => setPickupOpen(false)}
        onSubmit={runPickup}
        loading={pickupMutation.isPending}
      />

      <ScanResultModal
        result={result}
        onDismiss={dismissResult}
        onForce={result?.kind === 'conflict' ? handleForce : undefined}
        onScanAgain={dismissResult}
        onPrint={handlePrint}
        canPrint={isPrinterConnected}
        autoPrint={autoPrint && isPrinterConnected}
        forceLoading={walkInMutation.isPending}
        printLoading={printLoading}
      />
    </View>
  );
}

function ModeChip({
  active,
  activeColor,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  activeColor: string;
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl"
      style={active ? { backgroundColor: activeColor } : undefined}
    >
      {icon}
      <Text
        className={`text-xs font-bold ${active ? 'text-white' : 'text-neutral-400'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
