/**
 * Pemilih tanggal (tanggal lahir) — native spinner/dialog atau input tanggal
 * browser di web. Disalin dari onboarding untuk dipakai bersama.
 */
import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { WebDatePickerModal } from '@/components/ui/WebDatePickerModal';
import { nc, isDark } from '@/theme/ThemeRoot';

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
        maximumDate={new Date()}
        minimumDate={new Date(1900, 0, 1)}
        onChange={(_e, d) => {
          if (d) onChange(d);
          onClose();
        }}
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
        </Pressable>
      </Pressable>
    </Modal>
  );
}
