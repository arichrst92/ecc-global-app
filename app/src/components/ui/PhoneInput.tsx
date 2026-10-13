import { useState } from 'react';
import { FlatList, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { ChevronDown, X } from 'lucide-react-native';

import { COUNTRIES, DEFAULT_COUNTRY, countryFromE164, type Country } from '@/utils/phone';

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  helper?: string;
  autoFocus?: boolean;
  editable?: boolean;
};

/** Pisahkan nilai awal "+65 9123…" → negara + nomor lokal untuk ditampilkan. */
function splitInitial(value: string): { country: Country; local: string } {
  const v = value.trim();
  if (v.startsWith('+')) {
    const compact = v.replace(/[\s\-().]/g, '');
    const c = countryFromE164(compact);
    if (c) return { country: c, local: compact.slice(c.dial.length) };
  }
  return { country: DEFAULT_COUNTRY, local: v };
}

/**
 * Input no HP dengan pemilih kode negara (default 🇮🇩 +62).
 *
 * `onChangeText` menerima nomor lengkap berkode negara ("+65 91234567"),
 * atau string kosong kalau field dikosongkan. Untuk Indonesia, nilai tetap
 * diawali "+62 " — `normalizePhone()` mengubahnya ke E.164 sebelum kirim API.
 * User juga boleh langsung mengetik "+65…" di field; kode negara di depan
 * akan diabaikan dan nomor dipakai apa adanya.
 *
 * Sizing notes:
 * - Container height fixed 52px supaya prefix dan input alignment konsisten.
 * - TextInput pakai `textAlignVertical: center` (Android) + iOS-specific padding
 *   reset untuk prevent text "melenceng" karena default vertical alignment beda
 *   antar platform.
 */
export function PhoneInput({
  value,
  onChangeText,
  placeholder = '821 1234 5678',
  label,
  error,
  helper,
  autoFocus,
  editable = true,
}: Props) {
  const [initial] = useState(() => splitInitial(value));
  const [country, setCountry] = useState<Country>(initial.country);
  const [local, setLocal] = useState(initial.local);
  const [pickerOpen, setPickerOpen] = useState(false);

  function emit(c: Country, l: string) {
    const t = l.trim();
    if (!t) return onChangeText('');
    // User mengetik nomor internasional lengkap → pakai apa adanya.
    if (t.startsWith('+') || t.startsWith('00')) return onChangeText(t);
    onChangeText(`${c.dial} ${t.replace(/^0+/, '')}`);
  }

  return (
    <View>
      {label ? (
        <Text className="text-sm font-medium text-neutral-700 mb-2">{label}</Text>
      ) : null}
      <View
        className="flex-row items-center border border-neutral-300 rounded-xl bg-white"
        style={{ height: 52 }}
      >
        <Pressable
          onPress={() => editable && setPickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Kode negara ${country.name} ${country.dial}`}
          className="flex-row items-center gap-1.5 px-3 border-r border-neutral-200 h-full"
        >
          <Text style={{ fontSize: 18, lineHeight: 22 }}>{country.flag}</Text>
          <Text className="text-sm font-medium text-neutral-700">{country.dial}</Text>
          <ChevronDown size={14} color="#A3A3A3" />
        </Pressable>
        <TextInput
          value={local}
          onChangeText={(t) => {
            setLocal(t);
            emit(country, t);
          }}
          placeholder={country.iso === 'ID' ? placeholder : '9123 4567'}
          keyboardType="phone-pad"
          autoFocus={autoFocus}
          editable={editable}
          maxLength={18}
          className="flex-1 px-3 text-base text-neutral-900"
          style={{
            height: '100%',
            textAlignVertical: 'center',
            ...(Platform.OS === 'ios' ? { paddingTop: 0, paddingBottom: 0 } : {}),
            ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
          }}
          placeholderTextColor="#A3A3A3"
        />
      </View>
      {error ? (
        <Text className="text-xs text-red-600 mt-1.5">{error}</Text>
      ) : helper ? (
        <Text className="text-xs text-neutral-500 mt-1.5">{helper}</Text>
      ) : null}

      <Modal
        visible={pickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable className="flex-1 bg-black/40" onPress={() => setPickerOpen(false)} />
        <View className="bg-white rounded-t-2xl pb-6" style={{ maxHeight: '70%' }}>
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-100">
            <Text className="text-base font-bold text-neutral-900">Pilih kode negara</Text>
            <Pressable onPress={() => setPickerOpen(false)} hitSlop={10}>
              <X size={20} color="#525252" />
            </Pressable>
          </View>
          <FlatList
            data={COUNTRIES}
            keyExtractor={(c) => c.iso}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setCountry(item);
                  setPickerOpen(false);
                  emit(item, local);
                }}
                className={`flex-row items-center gap-3 px-5 py-3 ${
                  item.iso === country.iso ? 'bg-brand-50' : ''
                }`}
              >
                <Text style={{ fontSize: 20 }}>{item.flag}</Text>
                <Text className="flex-1 text-sm text-neutral-900">{item.name}</Text>
                <Text className="text-sm font-medium text-neutral-500">{item.dial}</Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}
