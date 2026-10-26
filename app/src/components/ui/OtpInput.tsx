import { useEffect, useRef, useState } from 'react';
import { Platform, TextInput } from 'react-native';
import { nc } from '@/theme/ThemeRoot';

type Props = {
  length?: number;
  onComplete?: (code: string) => void;
  onChange?: (code: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
};

const SPACING = 10;

/**
 * Input OTP satu kolom, teks di tengah.
 *  - iOS: textContentType="oneTimeCode" → kode dari SMS/Messages muncul di
 *    bar saran keyboard, sekali ketuk langsung terisi.
 *  - Android: autoComplete="sms-otp" → saran kode dari SMS (Gboard/Autofill).
 *  - Tempel (paste) teks berisi kode juga diterima; non-angka dibuang.
 *  - onComplete dipanggil sekali tiap kali kode lengkap (length digit).
 */
export function OtpInput({ length = 6, onComplete, onChange, autoFocus = true, disabled = false }: Props) {
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(false);
  const lastFired = useRef<string | null>(null);
  const ref = useRef<TextInput>(null);

  // Android kadang mengabaikan autoFocus di layar yang baru dibuka.
  useEffect(() => {
    if (!autoFocus) return;
    const id = setTimeout(() => ref.current?.focus(), 250);
    return () => clearTimeout(id);
  }, [autoFocus]);

  function handle(v: string) {
    const next = v.replace(/[^0-9]/g, '').slice(0, length);
    setCode(next);
    onChange?.(next);
    if (next.length === length) {
      if (lastFired.current !== next) {
        lastFired.current = next;
        onComplete?.(next);
      }
    } else {
      lastFired.current = null;
    }
  }

  const active = focused || code.length > 0;
  return (
    <TextInput
      ref={ref}
      value={code}
      onChangeText={handle}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      keyboardType="number-pad"
      inputMode="numeric"
      textContentType="oneTimeCode"
      autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
      importantForAutofill="yes"
      autoCorrect={false}
      maxLength={length}
      autoFocus={autoFocus}
      editable={!disabled}
      placeholder={'•'.repeat(length)}
      placeholderTextColor={nc('#D4D4D4')}
      textAlign="center"
      selectionColor="#EA580C"
      accessibilityLabel="Kode OTP"
      style={{
        height: 60,
        fontSize: 26,
        fontWeight: '700',
        letterSpacing: SPACING,
        // letterSpacing menambah spasi di belakang huruf terakhir → imbangi kiri
        paddingLeft: SPACING,
        paddingRight: 0,
        color: nc('#171717'),
        textAlign: 'center',
        opacity: disabled ? 0.6 : 1,
        ...(Platform.OS === 'android' ? { includeFontPadding: false, paddingVertical: 0, textAlignVertical: 'center' } : {}),
        ...(Platform.OS === 'ios' ? { paddingTop: 0, paddingBottom: 0 } : {}),
      }}
      className={`w-full rounded-2xl border-2 ${active ? 'border-brand-500 bg-brand-50' : 'border-neutral-200 bg-card'}`}
    />
  );
}
