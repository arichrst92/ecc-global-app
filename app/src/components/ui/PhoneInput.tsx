import { Platform, TextInput, View, Text } from 'react-native';

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

/**
 * Indonesia phone input dengan +62 prefix.
 * Value disimpan sebagai string mentah (user typed). Normalize ke E.164 sebelum kirim API.
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
  return (
    <View>
      {label ? (
        <Text className="text-sm font-medium text-neutral-700 mb-2">{label}</Text>
      ) : null}
      <View
        className="flex-row items-center border border-neutral-300 rounded-xl bg-white"
        style={{ height: 52 }}
      >
        <View
          className="flex-row items-center gap-2 px-3 border-r border-neutral-200 h-full"
        >
          <Text style={{ fontSize: 18, lineHeight: 22 }}>🇮🇩</Text>
          <Text className="text-sm font-medium text-neutral-700">+62</Text>
        </View>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          keyboardType="phone-pad"
          autoFocus={autoFocus}
          editable={editable}
          maxLength={15}
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
    </View>
  );
}
