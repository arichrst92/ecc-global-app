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
import { appAlert } from '@/components/ui/AppDialog';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Baby, LogIn, LogOut, ListChecks } from 'lucide-react-native';

import { useToast } from '@/components/ui/Toast';
import { JemaatSearchModal } from '@/components/scanner/JemaatSearchModal';
import { ScanResultModal, type ScanResultKind } from '@/components/scanner/ScanResultModal';
import { ScannerCamera } from '@/components/scanner/ScannerCamera';
import { ScanListModal, type ScanListTab } from '@/components/scanner/ScanListModal';
import { ScannerInfoPanel } from '@/components/scanner/ScannerInfoPanel';
import { WalkInGuestModal } from '@/components/tamu/WalkInGuestModal';
import { PickupInputModal } from '@/components/scanner/PickupInputModal';
import {
  useIbadahCheckinStats,
  usePickupReservasi,
  useScannerIbadah,
  useWalkInReservasi,
} from '@/hooks/useScanner';
import { ApiError } from '@/types/api';
import { todayIso } from '@/utils/date';
import { goBack } from '@/utils/nav';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';

type ScannerMode = 'checkin' | 'checkout' | 'pickup';

export default function ScannerIbadahScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id, tanggal } = useLocalSearchParams<{ id: string; tanggal?: string }>();
  const showToast = useToast((s) => s.show);

  // Tanpa ?tanggal → server memakai "hari ini" zona cabang (sama dengan tanggal
  // yang dicatat saat scan), bukan tanggal HP. Tanggal efektif diambil dari stats.
  const statsQuery = useIbadahCheckinStats(id, tanggal || null);
  const tanggalIbadah = tanggal || statsQuery.data?.tanggalIbadah || todayIso();

  const ibadahQuery = useScannerIbadah();
  const ibadahMeta = ibadahQuery.data?.find((i) => i.ibadahId === id);

  // Feature flags dari ibadah metadata (BE-provided), cadangan dari stats
  // (admin kehadiran yang bukan petugas tidak punya ibadahMeta).
  const requiresCheckout =
    (ibadahMeta?.requiresCheckout ?? statsQuery.data?.ibadah?.requiresCheckout) === true;
  const isKidsIbadah = (ibadahMeta?.isKidsIbadah ?? statsQuery.data?.ibadah?.isKidsIbadah) === true;

  const pickupMutation = usePickupReservasi(id, tanggalIbadah);
  // Walk-in universal (BE endpoint live 2026-08-03 dgn kode alternate).
  // 1 endpoint untuk semua mode: checkin + checkout + pickup.
  const walkInMutation = useWalkInReservasi(id, tanggalIbadah);

  const [mode, setMode] = useState<ScannerMode>('checkin');
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [listTab, setListTab] = useState<ScanListTab>('petugas');
  const openList = (tab: ScanListTab) => {
    setListTab(tab);
    setListOpen(true);
  };
  const [manualOpen, setManualOpen] = useState(false);
  const [pickupOpen, setPickupOpen] = useState(false);
  const [result, setResult] = useState<ScanResultKind | null>(null);
  const [pendingKode, setPendingKode] = useState<string | null>(null);

  const anyMutationPending = pickupMutation.isPending || walkInMutation.isPending;

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
        onSuccess: ({ data, meta }) => {
          setManualOpen(false);
          if (!data?.jemaat) {
            setResult({ kind: 'error', message: t('error.generic') });
            return;
          }
          // Server 2026-11 kirim meta.alreadyDone. Server lama: anggap "sudah"
          // bila waktu tercatatnya lebih dari 20 detik lalu (bukan scan barusan).
          const old = (iso?: string | null) =>
            !!iso && Date.now() - new Date(iso).getTime() > 20_000;
          const r = data.reservasi;
          const alreadyDone =
            meta?.alreadyDone ??
            ((action === 'checkin' && old(r?.joinedAt)) ||
              (action === 'checkout' && old(r?.checkedOutAt)) ||
              (action === 'pickup' && old(r?.pickedUpAt)));
          setResult({
            kind: 'success',
            namaLengkap: data.jemaat.namaLengkap,
            fotoUrl: data.jemaat.fotoUrl,
            // Badge Walk-in hanya untuk yang datang tanpa reservasi.
            walkIn: action === 'checkin' && meta?.walkIn === true,
            alreadyCheckedIn: alreadyDone,
            tamu: data.tamu ?? null,
          });
          // Kids ibadah + checkin → show toast prominent dgn kode jemput
          if (action === 'checkin' && isKidsIbadah && data.pickupCode) {
            showToast(t('scanner.pickup_code_generated', { code: data.pickupCode }), 'success');
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
          appAlert(
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
              appAlert(t('scanner.pickup_error_multi_title'), err.message);
            } else if (err.code === 'NOT_FOUND') {
              appAlert(
                t('scanner.pickup_error_notfound_title'),
                t('scanner.pickup_error_notfound_msg'),
              );
            } else {
              appAlert(t('common.error'), err.message);
            }
          } else {
            appAlert(t('common.error'), t('error.network'));
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
    // Ulangi dengan mode yang SAMA (dulu selalu 'checkin' — salah saat mode checkout/pickup).
    runWalkIn(pendingKode, mode);
  }

  const stats = statsQuery.data;
  // Mode pickup: allow scan QR anak (walk-in) ATAU 6-digit input. Kamera aktif
  // di kedua mode. Pause hanya saat modal/result open atau mutation in-flight.
  const isPaused = result !== null || manualOpen || pickupOpen || anyMutationPending;

  // Mode-based colors
  const modeColor = mode === 'checkin' ? '#3b82f6' : mode === 'checkout' ? '#F59E0B' : '#F97316';

  // Ibadah umum tanpa checkout → hanya Check-in, pilihan mode tidak perlu ditampilkan.
  const hasModeChoice = requiresCheckout || isKidsIbadah;

  const scannerFooter = (
    <>
      {/* Instruction card kalau mode pickup */}
      {mode === 'pickup' ? (
        <Pressable
          onPress={() => setPickupOpen(true)}
          {...gx('bg-brand-500 rounded-2xl p-4 mb-3 flex-row items-center gap-3 active:opacity-80')}
        >
          <View className="w-11 h-11 rounded-xl bg-white/20 items-center justify-center">
            <Baby size={22} color="#fff" />
          </View>
          <View className="flex-1">
            <Text className="text-white text-sm font-bold">{t('scanner.pickup_cta_title')}</Text>
            <Text className="text-white/80 text-xs mt-0.5">{t('scanner.pickup_cta_sub')}</Text>
          </View>
        </Pressable>
      ) : null}

      {/* Mode toggle — hanya bila ada lebih dari satu mode */}
      {hasModeChoice ? (
        <View className="flex-row bg-black/60 rounded-2xl p-1">
          <ModeChip
            active={mode === 'checkin'}
            activeColor="#3b82f6"
            icon={<LogIn size={14} color={mode === 'checkin' ? '#fff' : nc('#a3a3a3')} />}
            label={t('scanner.mode_checkin')}
            onPress={() => setMode('checkin')}
          />
          {requiresCheckout ? (
            <ModeChip
              active={mode === 'checkout'}
              activeColor="#F59E0B"
              icon={<LogOut size={14} color={mode === 'checkout' ? '#fff' : nc('#a3a3a3')} />}
              label={t('scanner.mode_checkout')}
              onPress={() => setMode('checkout')}
            />
          ) : null}
          {isKidsIbadah ? (
            <ModeChip
              active={mode === 'pickup'}
              activeColor="#F97316"
              icon={<Baby size={14} color={mode === 'pickup' ? '#fff' : nc('#a3a3a3')} />}
              label={t('scanner.mode_pickup')}
              onPress={() => setMode('pickup')}
            />
          ) : null}
        </View>
      ) : null}
    </>
  );

  return (
    <View className="flex-1 bg-black">
      <ScannerCamera
        paused={isPaused || walkInOpen || listOpen}
        onScan={handleScan}
        // Tunggu data ibadah termuat — ibadah anak tidak menerima tamu walk-in.
        onWalkInGuest={
          (ibadahMeta || statsQuery.data?.ibadah) && !isKidsIbadah && mode === 'checkin'
            ? () => setWalkInOpen(true)
            : undefined
        }
        onManualInput={() => {
          if (mode === 'pickup') setPickupOpen(true);
          else setManualOpen(true);
        }}
        footer={hasModeChoice || mode === 'pickup' ? scannerFooter : undefined}
      />

      {/* Floating header */}
      <SafeAreaView edges={['top']} className="absolute top-0 left-0 right-0">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable
            onPress={() => goBack(router)}
            className="w-10 h-10 rounded-full bg-black/40 items-center justify-center"
          >
            <ArrowLeft size={20} color="#fff" />
          </Pressable>
          <View className="flex-1 ml-2">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-white font-bold text-sm" numberOfLines={1}>
                {ibadahMeta?.nama ?? statsQuery.data?.ibadah?.nama ?? t('scanner.title')}
              </Text>
              {isKidsIbadah ? (
                <View {...gx('bg-brand-500/80 px-1.5 py-0.5 rounded')}>
                  <Text className="text-white text-[10px] font-bold">🧒 KIDS</Text>
                </View>
              ) : null}
            </View>
            <Text className="text-white/70 text-[10px]">{tanggalIbadah}</Text>
          </View>
          {/* Jumlah hadir — ketuk untuk lihat daftar jemaat yang sudah discan */}
          <Pressable
            onPress={() => openList('petugas')}
            accessibilityLabel={t('scanner.list_open')}
            className="bg-black/50 px-3 py-1.5 rounded-full flex-row items-center gap-1.5 active:opacity-70"
          >
            <View className="w-2 h-2 rounded-full bg-emerald-400" />
            {stats ? (
              <Text className="text-white text-xs font-bold">
                {stats.hadir ?? 0}
                {stats.total > 0 ? `/${stats.total}` : ''}
              </Text>
            ) : null}
            <ListChecks size={14} color="#fff" />
          </Pressable>
        </View>
        <ScannerInfoPanel
          info={
            stats?.ibadah ??
            (ibadahMeta
              ? {
                  jamMulai: ibadahMeta.jamMulai,
                  jamSelesai: ibadahMeta.jamSelesai,
                  lokasi: ibadahMeta.lokasi,
                  cabangNama: null,
                  timezone: null,
                }
              : null)
          }
          window={stats?.scanWindow}
          showWindow={mode === 'checkin'}
          onOpenList={openList}
          counts={[
            {
              key: 'hadir',
              label: t('scanner.c_hadir'),
              value: stats?.belumHadir != null ? stats.hadir : undefined,
              tab: 'semua',
              tone: 'green',
            },
            {
              key: 'belum',
              label: t('scanner.c_belum'),
              value: stats?.belumHadir,
              tab: 'belum',
              tone: 'amber',
            },
            {
              key: 'walkin',
              label: t('scanner.c_walkin'),
              value: stats?.walkIn || undefined,
              tab: 'petugas',
              tone: 'violet',
            },
            {
              key: 'late',
              label: t('scanner.c_late'),
              value: stats?.late || undefined,
              tab: 'petugas',
              tone: 'amber',
            },
            {
              key: 'self',
              label: t('scanner.c_self'),
              value: stats?.self || undefined,
              tab: 'semua',
              tone: 'sky',
            },
            {
              key: 'me',
              label: t('scanner.c_me'),
              value: stats?.byMe != null ? stats.byMe : undefined,
              tab: 'petugas',
            },
            ...(requiresCheckout
              ? [
                  {
                    key: 'out',
                    label: t('scanner.c_checkout'),
                    value: stats?.checkedOut,
                    tab: 'semua' as const,
                  },
                ]
              : []),
            ...(isKidsIbadah
              ? [
                  {
                    key: 'pick',
                    label: t('scanner.c_picked'),
                    value: stats?.pickedUp,
                    tab: 'semua' as const,
                  },
                ]
              : []),
          ]}
        />
      </SafeAreaView>

      <ScanListModal
        visible={listOpen}
        onClose={() => setListOpen(false)}
        target={{ kind: 'ibadah', ibadahId: id, tanggalIbadah }}
        initialTab={listTab}
      />

      <WalkInGuestModal
        visible={walkInOpen}
        target={{ kind: 'ibadah', ibadahId: id, tanggalIbadah }}
        onClose={() => setWalkInOpen(false)}
        onDone={() => statsQuery.refetch()}
      />

      <JemaatSearchModal
        purpose="checkin"
        visible={manualOpen}
        onClose={() => setManualOpen(false)}
        onSubmit={(kode) => runWalkIn(kode, mode === 'pickup' ? 'pickup' : mode)}
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
        forceLoading={walkInMutation.isPending}
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
      <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-neutral-400'}`}>
        {label}
      </Text>
    </Pressable>
  );
}
