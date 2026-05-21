import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Keyboard,
  UserCheck,
  X,
} from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ManualInputModal } from '@/components/scanner/ManualInputModal';
import { ScannerCamera } from '@/components/scanner/ScannerCamera';
import { useAddHomecellMember, useManagedHomecells } from '@/hooks/useHomecell';
import { ApiError } from '@/types/api';
import type { HomecellMember } from '@/types/homecell';

type AddResult =
  | { kind: 'success'; member: HomecellMember }
  | { kind: 'not_found'; kode: string }
  | { kind: 'duplicate'; message: string }
  | { kind: 'error'; message: string };

export default function HomecellAddMemberScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const homecellsQuery = useManagedHomecells();
  const homecell = homecellsQuery.data?.find((h) => h.id === id);

  const addMutation = useAddHomecellMember(id);
  const [manualOpen, setManualOpen] = useState(false);
  const [result, setResult] = useState<AddResult | null>(null);

  function runAdd(kode: string) {
    addMutation.mutate(kode, {
      onSuccess: (member) => {
        setManualOpen(false);
        setResult({ kind: 'success', member });
      },
      onError: (err) => {
        setManualOpen(false);
        if (err instanceof ApiError) {
          if (err.code === 'NOT_FOUND') {
            setResult({ kind: 'not_found', kode });
          } else if (err.code === 'BAD_REQUEST' || err.code === 'CONFLICT') {
            setResult({ kind: 'duplicate', message: err.message });
          } else {
            setResult({ kind: 'error', message: err.message });
          }
        } else {
          setResult({ kind: 'error', message: t('error.network') });
        }
      },
    });
  }

  function dismissResult() {
    setResult(null);
  }

  const isPaused = result !== null || manualOpen || addMutation.isPending;

  return (
    <View className="flex-1 bg-black">
      <ScannerCamera
        paused={isPaused}
        onScan={(kode) => runAdd(kode)}
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
              {t('homecell.add_member_title')}
            </Text>
            <Text className="text-white/70 text-[10px]" numberOfLines={1}>
              {homecell?.nama ?? ''}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      <ManualInputModal
        visible={manualOpen}
        onClose={() => setManualOpen(false)}
        onSubmit={runAdd}
        loading={addMutation.isPending}
      />

      {/* Result modal */}
      <Modal
        visible={result !== null}
        transparent
        animationType="fade"
        onRequestClose={dismissResult}
      >
        <Pressable
          onPress={dismissResult}
          className="flex-1 bg-black/60 items-center justify-center px-6"
        >
          <Pressable onPress={() => {}} className="bg-white rounded-3xl p-5 w-full max-w-sm">
            {result?.kind === 'success' ? (
              <View className="items-center">
                <View className="relative">
                  <Avatar
                    name={result.member.jemaat.namaLengkap}
                    fotoUrl={result.member.jemaat.fotoUrl ?? undefined}
                    size={80}
                  />
                  <View className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 items-center justify-center border-2 border-white">
                    <CheckCircle2 size={14} color="#fff" />
                  </View>
                </View>
                <Text className="text-xl font-bold text-neutral-900 mt-3 text-center">
                  {result.member.jemaat.namaLengkap}
                </Text>
                <Text className="text-xs text-neutral-500 mt-1 font-mono tracking-widest">
                  {result.member.jemaat.kode}
                </Text>
                <View className="bg-emerald-100 px-3 py-1 rounded-full mt-3 flex-row items-center gap-1">
                  <UserCheck size={12} color="#059669" />
                  <Text className="text-xs font-bold text-emerald-700">
                    {t('homecell.member_added_badge')}
                  </Text>
                </View>
              </View>
            ) : result?.kind === 'not_found' ? (
              <View className="items-center">
                <View className="w-16 h-16 rounded-2xl bg-red-50 items-center justify-center">
                  <X size={32} color="#DC2626" />
                </View>
                <Text className="text-lg font-bold text-neutral-900 mt-3 text-center">
                  {t('homecell.kode_not_found_title')}
                </Text>
                <Text className="text-sm text-neutral-500 mt-1 text-center">
                  {t('homecell.kode_not_found_msg', { kode: result.kode })}
                </Text>
              </View>
            ) : result?.kind === 'duplicate' ? (
              <View className="items-center">
                <View className="w-16 h-16 rounded-2xl bg-amber-50 items-center justify-center">
                  <AlertTriangle size={32} color="#D97706" />
                </View>
                <Text className="text-lg font-bold text-neutral-900 mt-3 text-center">
                  {t('homecell.already_member_title')}
                </Text>
                <Text className="text-sm text-neutral-500 mt-1 text-center">
                  {result.message}
                </Text>
              </View>
            ) : result?.kind === 'error' ? (
              <View className="items-center">
                <View className="w-16 h-16 rounded-2xl bg-neutral-100 items-center justify-center">
                  <AlertTriangle size={32} color="#737373" />
                </View>
                <Text className="text-lg font-bold text-neutral-900 mt-3 text-center">
                  {t('error.generic')}
                </Text>
                <Text className="text-sm text-neutral-500 mt-1 text-center">
                  {result.message}
                </Text>
              </View>
            ) : null}

            <View className="mt-4">
              <Button
                label={t('homecell.scan_next')}
                onPress={dismissResult}
                leftIcon={<Keyboard size={14} color="#fff" />}
                fullWidth
                size="lg"
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
