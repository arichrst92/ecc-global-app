import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';

type Props = {
  label: string;
  /** ISO date string "YYYY-MM-DD" or empty */
  value: string;
  onChange: (isoDate: string) => void;
  placeholder?: string;
  error?: string;
  helper?: string;
  /** Default: today */
  maximumDate?: Date;
  /** Default: 1900-01-01 */
  minimumDate?: Date;
};

const DEFAULT_MIN = new Date(1900, 0, 1);

function formatDateDisplay(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  // Display format: 15 Mar 1995
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function toIsoDate(d: Date): string {
  // YYYY-MM-DD format — pakai local components (bukan UTC) supaya tanggal benar
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Native date picker field. Pakai @react-native-community/datetimepicker.
 * Modal di iOS spinner mode, dialog di Android.
 */
export function DateField({
  label,
  value,
  onChange,
  placeholder = 'Pilih tanggal',
  error,
  helper,
  maximumDate,
  minimumDate = DEFAULT_MIN,
}: Props) {
  const [show, setShow] = useState(false);
  const today = new Date();
  const maxDate = maximumDate ?? today;

  // Parse current value, fallback ke 25 tahun lalu kalau kosong
  const currentDate = (() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d;
    }
    const d = new Date(today);
    d.setFullYear(d.getFullYear() - 25);
    return d;
  })();

  function handleChange(_event: DateTimePickerEvent, selected?: Date) {
    // Android: dialog auto-close. iOS: tetap show, user close via tombol.
    if (Platform.OS === 'android') {
      setShow(false);
    }
    if (selected) {
      onChange(toIsoDate(selected));
    }
  }

  const displayText = value ? formatDateDisplay(value) : '';

  return (
    <View>
      <Text className="text-xs font-medium text-neutral-600 mb-1">{label}</Text>
      <Pressable
        onPress={() => setShow(true)}
        className={`px-3 py-2.5 border rounded-lg bg-white flex-row items-center gap-2 ${
          error ? 'border-red-400' : 'border-neutral-200'
        }`}
      >
        <Calendar size={16} color="#737373" />
        <Text className={`flex-1 text-sm ${displayText ? 'text-neutral-900' : 'text-neutral-400'}`}>
          {displayText || placeholder}
        </Text>
      </Pressable>
      {error ? (
        <Text className="text-xs text-red-600 mt-1">{error}</Text>
      ) : helper ? (
        <Text className="text-xs text-neutral-500 mt-1">{helper}</Text>
      ) : null}

      {/* iOS: render in modal-like inline. Android: native dialog. */}
      {show && Platform.OS === 'ios' ? (
        <View className="bg-white border border-neutral-200 rounded-lg mt-2 overflow-hidden">
          <DateTimePicker
            value={currentDate}
            mode="date"
            display="spinner"
            maximumDate={maxDate}
            minimumDate={minimumDate}
            onChange={handleChange}
          />
          <Pressable
            onPress={() => setShow(false)}
            className="border-t border-neutral-200 py-2.5 items-center bg-neutral-50"
          >
            <Text className="text-brand-600 font-semibold text-sm">Selesai</Text>
          </Pressable>
        </View>
      ) : null}

      {show && Platform.OS === 'android' ? (
        <DateTimePicker
          value={currentDate}
          mode="date"
          display="default"
          maximumDate={maxDate}
          minimumDate={minimumDate}
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}
