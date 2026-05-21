import { useEffect } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Printer,
  RotateCcw,
  ShieldAlert,
  UserCheck,
  X,
  Zap,
} from 'lucide-react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';

export type ScanResultKind =
  | { kind: 'success'; namaLengkap: string; fotoUrl?: string | null; walkIn?: boolean; alreadyCheckedIn?: boolean }
  | { kind: 'not_found'; kode: string }
  | { kind: 'forbidden'; message: string }
  | { kind: 'conflict'; message: string }
  | { kind: 'error'; message: string };

export function ScanResultModal({
  result,
  onDismiss,
  onForce,
  onScanAgain,
  onPrint,
  forceLoading,
  printLoading,
  canPrint,
  autoPrint,
}: {
  result: ScanResultKind | null;
  onDismiss: () => void;
  onForce?: () => void;
  onScanAgain: () => void;
  onPrint?: () => void;
  forceLoading?: boolean;
  printLoading?: boolean;
  /** Tampil print button kalau printer connected */
  canPrint?: boolean;
  /** Kalau true, auto-trigger print saat success */
  autoPrint?: boolean;
}) {
  const { t } = useTranslation();
  const visible = result !== null;

  // Auto-dismiss success setelah 2.5s (atau 3.5s kalau auto-print active)
  useEffect(() => {
    if (!visible || !result) return;
    if (result.kind === 'success' && !result.alreadyCheckedIn) {
      // Trigger auto-print kalau enabled + printer connected
      if (autoPrint && canPrint && onPrint) {
        onPrint();
      }
      const tm = setTimeout(
        () => {
          onScanAgain();
        },
        autoPrint ? 3500 : 2500,
      );
      return () => clearTimeout(tm);
    }
  }, [visible, result, onScanAgain, autoPrint, canPrint, onPrint]);

  if (!result) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable
        onPress={onDismiss}
        className="flex-1 bg-black/60 items-center justify-center px-6"
      >
        <Pressable onPress={() => {}} className="bg-white rounded-3xl p-5 w-full max-w-sm">
          {result.kind === 'success' ? (
            <SuccessContent
              namaLengkap={result.namaLengkap}
              fotoUrl={result.fotoUrl}
              walkIn={result.walkIn}
              alreadyCheckedIn={result.alreadyCheckedIn}
            />
          ) : result.kind === 'not_found' ? (
            <NotFoundContent kode={result.kode} />
          ) : result.kind === 'forbidden' ? (
            <ForbiddenContent message={result.message} />
          ) : result.kind === 'conflict' ? (
            <ConflictContent message={result.message} />
          ) : (
            <ErrorContent message={result.message} />
          )}

          {/* Action buttons */}
          <View className="mt-4 gap-2">
            {result.kind === 'conflict' && onForce ? (
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Button
                    label={t('scanner.dismiss')}
                    variant="secondary"
                    onPress={onScanAgain}
                    fullWidth
                    disabled={forceLoading}
                  />
                </View>
                <View className="flex-1">
                  <Button
                    label={t('scanner.force_checkin')}
                    variant="danger"
                    onPress={onForce}
                    loading={forceLoading}
                    leftIcon={<Zap size={14} color="#fff" />}
                    fullWidth
                  />
                </View>
              </View>
            ) : (
              <>
                {/* Print Label button — kalau success + printer connected */}
                {result.kind === 'success' && canPrint && onPrint ? (
                  <Button
                    label={t('scanner.print_label')}
                    variant="secondary"
                    onPress={onPrint}
                    loading={printLoading}
                    leftIcon={<Printer size={14} color="#404040" />}
                    fullWidth
                    size="md"
                  />
                ) : null}
                <Button
                  label={t('scanner.scan_next')}
                  onPress={onScanAgain}
                  leftIcon={<RotateCcw size={14} color="#fff" />}
                  fullWidth
                  size="lg"
                />
              </>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SuccessContent({
  namaLengkap,
  fotoUrl,
  walkIn,
  alreadyCheckedIn,
}: {
  namaLengkap: string;
  fotoUrl?: string | null;
  walkIn?: boolean;
  alreadyCheckedIn?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View className="items-center">
      <View className="relative">
        <Avatar name={namaLengkap} fotoUrl={fotoUrl ?? undefined} size={80} />
        <View
          className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full items-center justify-center border-2 border-white ${
            alreadyCheckedIn ? 'bg-amber-500' : 'bg-emerald-500'
          }`}
        >
          {alreadyCheckedIn ? (
            <Info size={14} color="#fff" />
          ) : (
            <CheckCircle2 size={14} color="#fff" />
          )}
        </View>
      </View>
      <Text className="text-xl font-bold text-neutral-900 mt-3 text-center">
        {namaLengkap}
      </Text>
      <View className="flex-row gap-2 mt-2">
        {alreadyCheckedIn ? (
          <View className="bg-amber-100 px-3 py-1 rounded-full flex-row items-center gap-1">
            <Info size={12} color="#D97706" />
            <Text className="text-xs font-bold text-amber-700">
              {t('scanner.badge_already')}
            </Text>
          </View>
        ) : (
          <View className="bg-emerald-100 px-3 py-1 rounded-full flex-row items-center gap-1">
            <UserCheck size={12} color="#059669" />
            <Text className="text-xs font-bold text-emerald-700">
              {t('scanner.badge_checkin')}
            </Text>
          </View>
        )}
        {walkIn ? (
          <View className="bg-blue-100 px-3 py-1 rounded-full flex-row items-center gap-1">
            <Zap size={12} color="#1d4ed8" />
            <Text className="text-xs font-bold text-blue-700">
              {t('scanner.badge_walkin')}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function NotFoundContent({ kode }: { kode: string }) {
  const { t } = useTranslation();
  return (
    <View className="items-center">
      <View className="w-16 h-16 rounded-2xl bg-red-50 items-center justify-center">
        <X size={32} color="#DC2626" />
      </View>
      <Text className="text-lg font-bold text-neutral-900 mt-3 text-center">
        {t('scanner.error_not_found_title')}
      </Text>
      <Text className="text-sm text-neutral-500 mt-1 text-center">
        {t('scanner.error_not_found_msg', { kode })}
      </Text>
    </View>
  );
}

function ForbiddenContent({ message }: { message: string }) {
  const { t } = useTranslation();
  return (
    <View className="items-center">
      <View className="w-16 h-16 rounded-2xl bg-red-50 items-center justify-center">
        <ShieldAlert size={32} color="#DC2626" />
      </View>
      <Text className="text-lg font-bold text-neutral-900 mt-3 text-center">
        {t('scanner.error_forbidden_title')}
      </Text>
      <Text className="text-sm text-neutral-500 mt-1 text-center leading-relaxed">
        {message}
      </Text>
    </View>
  );
}

function ConflictContent({ message }: { message: string }) {
  const { t } = useTranslation();
  return (
    <View className="items-center">
      <View className="w-16 h-16 rounded-2xl bg-amber-50 items-center justify-center">
        <AlertTriangle size={32} color="#D97706" />
      </View>
      <Text className="text-lg font-bold text-neutral-900 mt-3 text-center">
        {t('scanner.error_conflict_title')}
      </Text>
      <Text className="text-sm text-neutral-500 mt-1 text-center leading-relaxed">
        {message}
      </Text>
      <Text className="text-xs text-amber-700 mt-2 text-center italic">
        {t('scanner.force_hint')}
      </Text>
    </View>
  );
}

function ErrorContent({ message }: { message: string }) {
  const { t } = useTranslation();
  return (
    <View className="items-center">
      <View className="w-16 h-16 rounded-2xl bg-neutral-100 items-center justify-center">
        <AlertTriangle size={32} color="#737373" />
      </View>
      <Text className="text-lg font-bold text-neutral-900 mt-3 text-center">
        {t('scanner.error_generic_title')}
      </Text>
      <Text className="text-sm text-neutral-500 mt-1 text-center">{message}</Text>
    </View>
  );
}
