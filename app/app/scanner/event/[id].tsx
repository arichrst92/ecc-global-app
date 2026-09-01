import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react-native';

import { ManualInputModal } from '@/components/scanner/ManualInputModal';
import { ScanResultModal, type ScanResultKind } from '@/components/scanner/ScanResultModal';
import { ScannerCamera } from '@/components/scanner/ScannerCamera';
import {
  useCheckinEvent,
  useEventCheckinStats,
  useScannerEvents,
} from '@/hooks/useScanner';
import { ApiError } from '@/types/api';

export default function ScannerEventScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const eventsQuery = useScannerEvents();
  const eventMeta = eventsQuery.data?.find((e) => e.eventId === id);

  const checkinMutation = useCheckinEvent(id);
  const statsQuery = useEventCheckinStats(id);

  const [manualOpen, setManualOpen] = useState(false);
  const [result, setResult] = useState<ScanResultKind | null>(null);
  const [pendingKode, setPendingKode] = useState<string | null>(null);

  function runCheckin(kode: string, force = false) {
    setPendingKode(kode);
    checkinMutation.mutate(
      { kode, force },
      {
        onSuccess: ({ data, meta }) => {
          setManualOpen(false);
          setResult({
            kind: 'success',
            namaLengkap: data.jemaat.namaLengkap,
            fotoUrl: data.jemaat.fotoUrl,
            alreadyCheckedIn: meta.alreadyCheckedIn,
          });
          statsQuery.refetch();
        },
        onError: (err) => {
          setManualOpen(false);
          if (err instanceof ApiError) {
            if (err.code === 'NOT_FOUND') {
              setResult({ kind: 'not_found', kode });
            } else if (err.code === 'FORBIDDEN') {
              setResult({ kind: 'forbidden', message: err.message });
            } else if (err.code === 'CONFLICT') {
              setResult({ kind: 'conflict', message: err.message });
            } else {
              setResult({ kind: 'error', message: err.message });
            }
          } else {
            setResult({ kind: 'error', message: t('error.network') });
          }
        },
      },
    );
  }

  function dismissResult() {
    setResult(null);
    setPendingKode(null);
  }

  function handleForce() {
    if (!pendingKode) return;
    runCheckin(pendingKode, true);
  }

  const stats = statsQuery.data;
  const isPaused = result !== null || manualOpen || checkinMutation.isPending;

  return (
    <View className="flex-1 bg-black">
      <ScannerCamera
        paused={isPaused}
        onScan={(kode) => runCheckin(kode)}
        onManualInput={() => setManualOpen(true)}
      />

      <SafeAreaView edges={['top']} className="absolute top-0 left-0 right-0">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-black/40 items-center justify-center"
          >
            <ArrowLeft size={20} color="#fff" />
          </Pressable>
          <View className="flex-1 ml-2">
            <Text className="text-white font-bold text-sm" numberOfLines={1}>
              {eventMeta?.judul ?? t('scanner.title')}
            </Text>
            <Text className="text-white/70 text-[10px]" numberOfLines={1}>
              {eventMeta?.lokasi ?? ''}
            </Text>
          </View>
          {stats ? (
            <View className="bg-black/50 px-3 py-1.5 rounded-full flex-row items-center gap-1.5">
              <View className="w-2 h-2 rounded-full bg-emerald-400" />
              <Text className="text-white text-xs font-bold">
                {stats.hadir}
                {stats.quotaPeserta ? `/${stats.quotaPeserta}` : `/${stats.total}`}
              </Text>
            </View>
          ) : null}
        </View>
      </SafeAreaView>

      <ManualInputModal
        visible={manualOpen}
        onClose={() => setManualOpen(false)}
        onSubmit={(kode) => runCheckin(kode)}
        loading={checkinMutation.isPending}
      />

      <ScanResultModal
        result={result}
        onDismiss={dismissResult}
        onForce={result?.kind === 'conflict' ? handleForce : undefined}
        onScanAgain={dismissResult}
        forceLoading={checkinMutation.isPending}
      />
    </View>
  );
}
