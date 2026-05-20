import { TextInput, Text, View } from 'react-native';
import type { TextInputProps } from 'react-native';

type Props = TextInputProps & {
  label: string;
  error?: string;
  helper?: string;
  multiline?: boolean;
};

/**
 * Form text field dengan label + optional error/helper.
 */
export function TextField({ label, error, helper, multiline, ...inputProps }: Props) {
  return (
    <View>
      <Text className="text-xs font-medium text-neutral-600 mb-1">{label}</Text>
      <TextInput
        {...inputProps}
        multiline={multiline}
        placeholderTextColor="#A3A3A3"
        className={`px-3 py-2.5 border rounded-lg text-sm text-neutral-900 bg-white ${
          error ? 'border-red-400' : 'border-neutral-200'
        } ${multiline ? 'min-h-[72px]' : ''}`}
        style={multiline ? { textAlignVertical: 'top' } : undefined}
      />
      {error ? (
        <Text className="text-xs text-red-600 mt-1">{error}</Text>
      ) : helper ? (
        <Text className="text-xs text-neutral-500 mt-1">{helper}</Text>
      ) : null}
    </View>
  );
}
