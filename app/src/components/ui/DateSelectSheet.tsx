/**
 * Pemilih tanggal Android: tiga kolom Tanggal · Bulan · Tahun (ketuk untuk memilih).
 *
 * Dialog kalender bawaan Android menyembunyikan pilihan tahun di judul dialog,
 * dan di sebagian HP (OEM) tahun tidak bisa diganti sama sekali → tanggal lahir
 * & penanggalan lain sulit diubah. Kolom tahun di sini selalu terlihat.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Modal } from '@/components/ui/Modal';
import { SheetNavSpacer } from '@/components/ui/SheetNavSpacer';
import { nc } from '@/theme/ThemeRoot';

const ROW = 40;
const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const daysIn = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

function Column({
  items,
  selected,
  onSelect,
  flex,
}: {
  items: { key: number; label: string; disabled?: boolean }[];
  selected: number;
  onSelect: (k: number) => void;
  flex: number;
}) {
  const ref = useRef<ScrollView>(null);
  const idx = Math.max(0, items.findIndex((i) => i.key === selected));
  // Tampilkan pilihan di tengah saat dibuka.
  useEffect(() => {
    const id = setTimeout(() => ref.current?.scrollTo({ y: Math.max(0, idx * ROW - ROW * 2), animated: false }), 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <ScrollView ref={ref} style={{ flex, height: ROW * 5 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
      {items.map((it) => {
        const on = it.key === selected;
        return (
          <Pressable
            key={it.key}
            disabled={it.disabled}
            onPress={() => onSelect(it.key)}
            style={{ height: ROW }}
            className={`items-center justify-center rounded-lg mx-1 ${on ? 'bg-brand-500' : ''}`}
          >
            <Text
              className={`text-[15px] ${on ? 'text-white font-bold' : it.disabled ? 'text-neutral-300' : 'text-neutral-800'}`}
              numberOfLines={1}
            >
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function DateSelectSheet({
  value,
  onChange,
  onClose,
  minimumDate = new Date(1900, 0, 1),
  maximumDate = new Date(),
}: {
  value: Date;
  onChange: (d: Date) => void;
  onClose: () => void;
  minimumDate?: Date;
  maximumDate?: Date;
}) {
  const { t, i18n } = useTranslation();
  const months = i18n.language?.startsWith('en') ? MONTHS_EN : MONTHS_ID;
  const clamp = (d: Date) => (d < minimumDate ? minimumDate : d > maximumDate ? maximumDate : d);
  const init = clamp(value);
  const [y, setY] = useState(init.getFullYear());
  const [m, setM] = useState(init.getMonth());
  const [d, setD] = useState(init.getDate());

  const minY = minimumDate.getFullYear();
  const maxY = maximumDate.getFullYear();
  // Tahun terbaru di atas (tanggal lahir umumnya dicari dari tahun sekarang ke bawah).
  const years = useMemo(() => Array.from({ length: maxY - minY + 1 }, (_, i) => maxY - i).map((k) => ({ key: k, label: String(k) })), [minY, maxY]);
  const monthItems = months.map((label, k) => {
    const first = new Date(y, k, 1);
    const last = new Date(y, k, daysIn(y, k));
    return { key: k, label, disabled: last < minimumDate || first > maximumDate };
  });
  const dayCount = daysIn(y, m);
  const dayItems = Array.from({ length: dayCount }, (_, i) => i + 1).map((k) => {
    const dt = new Date(y, m, k);
    return { key: k, label: String(k), disabled: dt < new Date(minimumDate.toDateString()) || dt > maximumDate };
  });

  // Hari melebihi jumlah hari bulan / di luar batas → sesuaikan.
  const safeD = Math.min(d, dayCount);
  const picked = clamp(new Date(y, m, safeD));

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 bg-black/50 justify-end">
        <Pressable onPress={() => {}} className="bg-card rounded-t-3xl pt-4 px-4">
          <View className="flex-row items-center justify-between mb-1">
            <Pressable onPress={onClose} hitSlop={8}>
              <Text className="text-sm text-neutral-500 px-2 py-1">{t('common.cancel')}</Text>
            </Pressable>
            <Text className="text-base font-bold text-neutral-900">
              {picked.getDate()} {months[picked.getMonth()]} {picked.getFullYear()}
            </Text>
            <Pressable
              onPress={() => {
                onChange(picked);
                onClose();
              }}
              hitSlop={8}
            >
              <Text className="text-sm font-bold text-brand-600 px-2 py-1">{t('common.confirm')}</Text>
            </Pressable>
          </View>
          <View className="flex-row mt-2 mb-1">
            <Text className="text-[11px] font-semibold text-neutral-400 text-center" style={{ flex: 2 }}>{t('date_picker.day')}</Text>
            <Text className="text-[11px] font-semibold text-neutral-400 text-center" style={{ flex: 4 }}>{t('date_picker.month')}</Text>
            <Text className="text-[11px] font-semibold text-neutral-400 text-center" style={{ flex: 3 }}>{t('date_picker.year')}</Text>
          </View>
          <View className="flex-row border-t border-b border-neutral-100 py-1" style={{ borderColor: nc('#F5F5F5') }}>
            <Column items={dayItems} selected={safeD} onSelect={setD} flex={2} />
            <Column items={monthItems} selected={m} onSelect={setM} flex={4} />
            <Column items={years} selected={y} onSelect={setY} flex={3} />
          </View>
          <SheetNavSpacer />
          <View style={{ height: 16 }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
