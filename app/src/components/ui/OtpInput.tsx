import { useRef, useState } from 'react';
import { Platform, TextInput, View } from 'react-native';

type Props = {
  length?: number;
  onComplete?: (code: string) => void;
  onChange?: (code: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
};

/**
 * 6-digit OTP input dengan auto-advance dan auto-backspace.
 * Auto-complete: call onComplete saat semua box terisi.
 */
export function OtpInput({
  length = 6,
  onComplete,
  onChange,
  autoFocus = true,
  disabled = false,
}: Props) {
  const [digits, setDigits] = useState<string[]>(() => Array(length).fill(''));
  const refs = useRef<(TextInput | null)[]>([]);

  function setAt(i: number, val: string) {
    // Strip non-numeric, ambil char terakhir saja
    const cleaned = val.replace(/[^0-9]/g, '').slice(-1);
    const next = [...digits];
    next[i] = cleaned;
    setDigits(next);
    const code = next.join('');
    onChange?.(code);

    if (cleaned && i < length - 1) {
      refs.current[i + 1]?.focus();
    }

    if (next.every((d) => d !== '')) {
      onComplete?.(code);
    }
  }

  function handleKeyPress(i: number, key: string) {
    if (key === 'Backspace' && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  }

  return (
    <View className="flex-row justify-center gap-2">
      {digits.map((d, i) => (
        <TextInput
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          onChangeText={(v) => setAt(i, v)}
          onKeyPress={(e) => handleKeyPress(i, e.nativeEvent.key)}
          keyboardType="number-pad"
          maxLength={1}
          textAlign="center"
          textAlignVertical="center"
          autoFocus={autoFocus && i === 0}
          editable={!disabled}
          selectTextOnFocus
          // Inline style untuk centering reliable di kedua platform
          style={{
            width: 48,
            height: 56,
            fontSize: 22,
            fontWeight: '600',
            color: '#171717',
            textAlign: 'center',
            // Android: hilangkan font padding extra yang bikin off-center
            ...(Platform.OS === 'android' ? { includeFontPadding: false, paddingVertical: 0 } : {}),
            // iOS: paddingTop=0 untuk vertical center
            ...(Platform.OS === 'ios' ? { paddingTop: 0, paddingBottom: 0 } : {}),
          }}
          className={`rounded-xl border ${
            d ? 'border-brand-500 bg-brand-50' : 'border-neutral-300 bg-white'
          }`}
        />
      ))}
    </View>
  );
}
