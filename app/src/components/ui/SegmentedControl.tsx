import { Pressable, Text, View } from 'react-native';

type Option<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  value: T | '';
  options: Option<T>[];
  onChange: (v: T) => void;
  label?: string;
};

/**
 * Pill-style segmented control — equivalent radio buttons.
 * Untuk gender, tipe bayar, dll dengan opsi terbatas.
 */
export function SegmentedControl<T extends string>({ value, options, onChange, label }: Props<T>) {
  return (
    <View>
      {label ? <Text className="text-xs font-medium text-neutral-600 mb-1">{label}</Text> : null}
      <View className="flex-row gap-2">
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              className={`flex-1 py-2.5 rounded-lg border items-center ${
                selected
                  ? 'bg-brand-500 border-brand-500'
                  : 'bg-white border-neutral-200'
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  selected ? 'text-white' : 'text-neutral-700'
                }`}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
