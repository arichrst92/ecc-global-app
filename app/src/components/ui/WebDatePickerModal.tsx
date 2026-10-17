/**
 * Pemilih tanggal untuk Els App versi web — DateTimePicker native tidak
 * tersedia di browser, jadi pakai <input type="date"> bawaan browser di
 * dalam modal kecil (Batal / OK).
 */
import { createElement, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function WebDatePickerModal({
  value,
  onChange,
  onClose,
  maximumDate = new Date(),
  minimumDate = new Date(1900, 0, 1),
}: {
  value: Date;
  onChange: (d: Date) => void;
  onClose: () => void;
  maximumDate?: Date;
  minimumDate?: Date;
}) {
  const { t } = useTranslation();
  const [v, setV] = useState(ymd(value));

  function ok() {
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const [y, m, d] = v.split('-').map(Number);
      onChange(new Date(y!, m! - 1, d!));
    }
    onClose();
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 bg-black/50 items-center justify-center px-6">
        <Pressable onPress={() => {}} className="bg-white w-full max-w-sm rounded-2xl p-5">
          {createElement('input', {
            type: 'date',
            value: v,
            min: ymd(minimumDate),
            max: ymd(maximumDate),
            autoFocus: true,
            onChange: (e: { target: { value: string } }) => setV(e.target.value),
            style: { width: '100%', padding: 12, borderRadius: 12, border: '1px solid #E5E5E5', fontSize: 16 },
          })}
          <View className="flex-row justify-end gap-2 mt-4">
            <Pressable onPress={onClose} className="px-4 py-2">
              <Text className="text-sm text-neutral-600">{t('common.cancel')}</Text>
            </Pressable>
            <Pressable onPress={ok} className="px-4 py-2 bg-brand-500 rounded-lg">
              <Text className="text-sm font-bold text-white">OK</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
