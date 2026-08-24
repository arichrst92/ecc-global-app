/**
 * TipeRelasiPicker — granular tipe relasi picker (11-12 opsi dari master data BE).
 * Per notice `backend-notice-family-refactor.md` 2026-08-02.
 *
 * Replace RolePicker (4 opsi broad) → picker granular dgn section header
 * per kategori (Pasangan, Orang Tua, Anak, Saudara, Kakek/Nenek, Cucu, Wali/Lainnya).
 *
 * UI: pressable button trigger → modal bottom sheet dgn scrollable list.
 * Fallback ke RolePicker (broad) kalau master data gagal load — pastikan
 * user selalu bisa add family walaupun BE endpoint down.
 */
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  Baby,
  ChevronDown,
  Heart,
  UserCircle2,
  Users,
  X,
} from 'lucide-react-native';

import { useTipeRelasiGrouped } from '@/hooks/useTipeRelasi';
import type { TipeRelasi, TipeRelasiCategory } from '@/types/tipeRelasi';

type Props = {
  value: TipeRelasi | null;
  onChange: (tipe: TipeRelasi) => void;
  disabled?: boolean;
};

export function TipeRelasiPicker({ value, onChange, disabled }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const grouped = useTipeRelasiGrouped();

  return (
    <View>
      <Text className="text-xs font-medium text-neutral-600 mb-2">
        {t('family.tipe_label')}
      </Text>

      <Pressable
        onPress={() => !disabled && setOpen(true)}
        className={`flex-row items-center justify-between border rounded-2xl px-4 py-3 ${
          value
            ? 'border-brand-500 bg-brand-50'
            : 'border-neutral-200 bg-white'
        } ${disabled ? 'opacity-50' : ''}`}
      >
        <View className="flex-row items-center gap-2 flex-1">
          {value ? (
            <UserCircle2 size={18} color="#EA580C" />
          ) : (
            <Users size={18} color="#A3A3A3" />
          )}
          <Text
            className={`text-sm ${
              value
                ? 'font-semibold text-brand-700'
                : 'text-neutral-500'
            }`}
            numberOfLines={1}
          >
            {value ? value.nama : t('family.tipe_placeholder')}
          </Text>
        </View>
        <ChevronDown size={18} color="#525252" />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/40"
          onPress={() => setOpen(false)}
        >
          <Pressable
            className="mt-auto bg-white rounded-t-3xl"
            style={{ maxHeight: '80%' }}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Sheet header */}
            <View className="flex-row items-center justify-between px-5 pt-4 pb-3 border-b border-neutral-100">
              <Text className="text-base font-bold text-neutral-900">
                {t('family.tipe_picker_title')}
              </Text>
              <Pressable
                onPress={() => setOpen(false)}
                className="w-9 h-9 items-center justify-center rounded-full bg-neutral-100"
                accessibilityLabel={t('common.close')}
              >
                <X size={16} color="#525252" />
              </Pressable>
            </View>

            {/* Body */}
            {grouped.isPending ? (
              <View className="py-16 items-center">
                <ActivityIndicator color="#F97316" />
              </View>
            ) : grouped.isError ? (
              <View className="py-16 px-8 items-center">
                <Text className="text-sm text-red-600 text-center mb-3">
                  {t('family.tipe_load_error')}
                </Text>
                <Pressable onPress={() => grouped.refetch()}>
                  <Text className="text-sm font-bold text-brand-600">
                    {t('common.retry')}
                  </Text>
                </Pressable>
              </View>
            ) : grouped.grouped.length === 0 ? (
              <View className="py-12 px-8 items-center">
                <Text className="text-sm text-neutral-500 text-center">
                  {t('family.tipe_empty')}
                </Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
                {grouped.grouped.map((section) => (
                  <View key={section.kategori} className="mt-3">
                    <Text className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider px-5 mb-1.5">
                      {categoryLabel(section.kategori, t)}
                    </Text>
                    {section.items.map((item, idx) => {
                      const isActive = value?.id === item.id;
                      const isLast = idx === section.items.length - 1;
                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => {
                            onChange(item);
                            setOpen(false);
                          }}
                          className={`px-5 py-3.5 flex-row items-center gap-3 ${
                            !isLast ? 'border-b border-neutral-50' : ''
                          } ${isActive ? 'bg-brand-50' : ''}`}
                        >
                          <View
                            className={`w-9 h-9 rounded-xl items-center justify-center ${categoryBgClass(section.kategori)}`}
                          >
                            <CategoryIcon
                              kategori={section.kategori}
                              color={categoryFgColor(section.kategori)}
                            />
                          </View>
                          <View className="flex-1">
                            <Text
                              className={`text-sm ${
                                isActive
                                  ? 'font-bold text-brand-700'
                                  : 'font-semibold text-neutral-900'
                              }`}
                            >
                              {item.nama}
                            </Text>
                            {item.deskripsi ? (
                              <Text className="text-xs text-neutral-500 mt-0.5">
                                {item.deskripsi}
                              </Text>
                            ) : null}
                          </View>
                          {isActive ? (
                            <View className="w-2 h-2 rounded-full bg-brand-500" />
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/* ==============================================================
 * CATEGORY HELPERS
 * ============================================================== */
function categoryLabel(
  kategori: TipeRelasiCategory,
  t: (k: string) => string,
): string {
  switch (kategori) {
    case 'pasangan':
      return t('family.cat_pasangan');
    case 'orangtua':
      return t('family.cat_orangtua');
    case 'anak':
      return t('family.cat_anak');
    case 'saudara':
      return t('family.cat_saudara');
    case 'kakeknenek':
      return t('family.cat_kakeknenek');
    case 'cucu':
      return t('family.cat_cucu');
    case 'walilain':
      return t('family.cat_walilain');
  }
}

function categoryBgClass(kategori: TipeRelasiCategory): string {
  switch (kategori) {
    case 'pasangan':
      return 'bg-pink-50';
    case 'orangtua':
      return 'bg-brand-50';
    case 'anak':
      return 'bg-emerald-50';
    case 'saudara':
      return 'bg-blue-50';
    case 'kakeknenek':
      return 'bg-purple-50';
    case 'cucu':
      return 'bg-amber-50';
    case 'walilain':
      return 'bg-neutral-100';
  }
}

function categoryFgColor(kategori: TipeRelasiCategory): string {
  switch (kategori) {
    case 'pasangan':
      return '#DB2777';
    case 'orangtua':
      return '#EA580C';
    case 'anak':
      return '#059669';
    case 'saudara':
      return '#1D4ED8';
    case 'kakeknenek':
      return '#7C3AED';
    case 'cucu':
      return '#D97706';
    case 'walilain':
      return '#525252';
  }
}

function CategoryIcon({
  kategori,
  color,
}: {
  kategori: TipeRelasiCategory;
  color: string;
}) {
  switch (kategori) {
    case 'pasangan':
      return <Heart size={16} color={color} />;
    case 'anak':
    case 'cucu':
      return <Baby size={16} color={color} />;
    case 'orangtua':
    case 'saudara':
    case 'kakeknenek':
      return <Users size={16} color={color} />;
    case 'walilain':
      return <UserCircle2 size={16} color={color} />;
  }
}
