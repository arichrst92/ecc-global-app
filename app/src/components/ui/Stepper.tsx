import { Text, View } from 'react-native';
import { Check } from 'lucide-react-native';

type Props = {
  current: number; // 1-indexed (1, 2, 3...)
  total: number;
};

/**
 * Horizontal stepper indicator dengan check icon untuk completed steps.
 * Pakai untuk multi-step flow (signup wizard, event registration, dll).
 */
export function Stepper({ current, total }: Props) {
  return (
    <View className="flex-row items-center gap-2 my-3">
      {Array.from({ length: total }, (_, i) => i + 1).map((step) => {
        const isDone = step < current;
        const isActive = step === current;
        const isLast = step === total;
        return (
          <View
            key={step}
            className={`flex-row items-center gap-2 ${isLast ? '' : 'flex-1'}`}
          >
            <View
              className={`w-7 h-7 rounded-full items-center justify-center ${
                isDone || isActive ? 'bg-brand-500' : 'bg-neutral-100'
              }`}
            >
              {isDone ? (
                <Check size={14} color="#fff" strokeWidth={3} />
              ) : (
                <Text
                  className={`text-xs font-semibold ${
                    isActive ? 'text-white' : 'text-neutral-400'
                  }`}
                >
                  {step}
                </Text>
              )}
            </View>
            {!isLast && (
              <View
                className={`flex-1 h-1 rounded-full ${
                  isDone ? 'bg-brand-500' : 'bg-neutral-100'
                }`}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}
