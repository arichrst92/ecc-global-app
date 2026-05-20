import { useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, ChevronDown, X } from 'lucide-react-native';

export type PickerOption = {
  value: string;
  label: string;
  sub?: string;
};

type Props = {
  label: string;
  placeholder?: string;
  value: string;
  options: PickerOption[];
  onChange: (v: string) => void;
  error?: string;
  helper?: string;
  modalTitle?: string;
};

/**
 * Pressable yang buka modal full-screen dengan list selection.
 * Untuk cabang picker, homecell picker, dll.
 */
export function Picker({
  label,
  placeholder = 'Pilih...',
  value,
  options,
  onChange,
  error,
  helper,
  modalTitle,
}: Props) {
  const [visible, setVisible] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View>
      <Text className="text-xs font-medium text-neutral-600 mb-1">{label}</Text>
      <Pressable
        onPress={() => setVisible(true)}
        className={`px-3 py-2.5 border rounded-lg bg-white flex-row items-center ${
          error ? 'border-red-400' : 'border-neutral-200'
        }`}
      >
        <Text className={`flex-1 text-sm ${selected ? 'text-neutral-900' : 'text-neutral-400'}`}>
          {selected?.label ?? placeholder}
        </Text>
        <ChevronDown size={16} color="#737373" />
      </Pressable>
      {error ? (
        <Text className="text-xs text-red-600 mt-1">{error}</Text>
      ) : helper ? (
        <Text className="text-xs text-neutral-500 mt-1">{helper}</Text>
      ) : null}

      <Modal visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center px-5 py-3 border-b border-neutral-100">
            <Text className="flex-1 text-lg font-bold text-neutral-900">{modalTitle ?? label}</Text>
            <Pressable onPress={() => setVisible(false)} className="w-9 h-9 items-center justify-center">
              <X size={20} color="#171717" />
            </Pressable>
          </View>
          <FlatList
            data={options}
            keyExtractor={(o) => o.value}
            renderItem={({ item }) => {
              const isSelected = item.value === value;
              return (
                <Pressable
                  onPress={() => {
                    onChange(item.value);
                    setVisible(false);
                  }}
                  className="px-5 py-4 border-b border-neutral-100 flex-row items-center"
                >
                  <View className="flex-1">
                    <Text className="text-base font-medium text-neutral-900">{item.label}</Text>
                    {item.sub ? (
                      <Text className="text-xs text-neutral-500 mt-0.5">{item.sub}</Text>
                    ) : null}
                  </View>
                  {isSelected ? <Check size={20} color="#F97316" /> : null}
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}
