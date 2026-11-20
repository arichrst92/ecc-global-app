/**
 * Pemilih tanggal (tanggal lahir) — native spinner/dialog atau input tanggal
 * browser di web. Disalin dari onboarding untuk dipakai bersama.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Modal } from '@/components/ui/Modal';
import { useTranslation } from 'react-i18next';

import { WebDatePickerModal } from '@/components/ui/WebDatePickerModal';
import { nc, isDark } from '@/theme/ThemeRoot';
import { SheetNavSpacer } from '@/components/ui/SheetNavSpacer';

export function DatePickerModal({
  value,
  onChange,
  onClose,
}: {
  value: Date;
  onChange: (d: Date) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [DateTimePicker, setMod] = useState<React.ComponentType<{
    value: Date;
    mode: 'date';
    display: 'spinner' | 'default';
    maximumDate?: Date;
    minimumDate?: Date;
    textColor?: string;
    themeVariant?: 'light' | 'dark';
    onChange: (event: unknown, date?: Date) => void;
  }> | null>(null);

  useEffect(() => {
    // Web: ditangani WebDatePickerModal (input tanggal browser).
    if (Platform.OS === 'web') return;
    (async () => {
      try {
        const mod = (await import('@react-native-community/datetimepicker')) as unknown as {
          default: React.ComponentType<{
            value: Date;
            mode: 'date';
            display: 'spinner' | 'default';
            maximumDate?: Date;
            minimumDate?: Date;
            textColor?: string;
            themeVariant?: 'light' | 'dark';
            onChange: (event: unknown, date?: Date) => void;
          }>;
        };
        setMod(() => mod.default);
      } catch {
        onClose();
      }
    })();
  }, [onClose]);
  const android = useAndroidDateHandler(onChange, onClose);

  if (Platform.OS === 'web') {
    return <WebDatePickerModal value={value} onChange={onChange} onClose={onClose} />;
  }
  if (!DateTimePicker) return null;

  if (Platform.OS === 'android') {
    return (
      <DateTimePicker
        themeVariant={isDark() ? 'dark' : 'light'}
        value={value}
        mode="date"
        display="default"
        maximumDate={android.maxDate}
        minimumDate={ANDROID_MIN_DATE}
        onChange={android.onChange}
      />
    );
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 bg-black/50 items-center justify-end">
        <Pressable
          onPress={() => {}}
          className="bg-card w-full rounded-t-3xl pt-4 pb-8 px-4"
        >
          <View className="flex-row items-center justify-between mb-2">
            <Pressable onPress={onClose}>
              <Text className="text-sm text-neutral-500 px-2 py-1">{t('common.cancel')}</Text>
            </Pressable>
            <Pressable onPress={onClose}>
              <Text className="text-sm font-bold text-brand-600 px-2 py-1">
                {t('common.confirm')}
              </Text>
            </Pressable>
          </View>
          <DateTimePicker
            value={value}
            mode="date"
            display="spinner"
            maximumDate={new Date()}
            minimumDate={new Date(1900, 0, 1)}
            textColor={nc('#171717')}
            themeVariant="light"
            onChange={(_e, d) => {
              if (d) onChange(d);
            }}
          />
          <SheetNavSpacer />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * Handler dialog tanggal Android yang aman:
 *  - identitas stabil — komponen picker Android membuka ulang dialog setiap prop
 *    onChange berganti, yang bisa membuat tanggal terpilih tertimpa;
 *  - hanya event "set" yang mengubah tanggal (batal/tutup tidak menimpa nilai).
 */
export const ANDROID_MIN_DATE = new Date(1900, 0, 1);
export function useAndroidDateHandler(onChange: (d: Date) => void, onClose: () => void) {
  const latest = useRef({ onChange, onClose });
  latest.current = { onChange, onClose };
  const [maxDate] = useState(() => new Date());
  const handler = useCallback((e: unknown, d?: Date) => {
    const type = (e as { type?: string } | null)?.type;
    if (d && (type === undefined || type === 'set')) latest.current.onChange(d);
    latest.current.onClose();
  }, []);
  return { onChange: handler, maxDate };
}
