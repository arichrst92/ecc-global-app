import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Construction } from 'lucide-react-native';

type Props = {
  title: string;
  milestone?: string;
  msg?: string;
};

/**
 * Placeholder untuk tab/screen yang belum di-implement.
 * Pakai sementara M2-M9 dibangun bertahap.
 */
export function PlaceholderScreen({ title, milestone, msg }: Props) {
  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <View className="flex-1 items-center justify-center px-8">
        <View className="w-16 h-16 rounded-2xl bg-amber-50 items-center justify-center mb-4">
          <Construction size={28} color="#D97706" />
        </View>
        <Text className="text-xl font-bold text-neutral-900 text-center">{title}</Text>
        {milestone ? (
          <Text className="text-xs font-semibold text-brand-600 uppercase tracking-wider mt-1">
            {milestone}
          </Text>
        ) : null}
        {msg ? (
          <Text className="text-sm text-neutral-500 text-center mt-3 leading-relaxed max-w-xs">
            {msg}
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
