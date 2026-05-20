import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';

type Slide = {
  emoji: string;
  titleKey: string;
  bodyKey: string;
};

const SLIDES: Slide[] = [
  { emoji: '⛪', titleKey: 'onboarding.slide1_title', bodyKey: 'onboarding.slide1_body' },
  { emoji: '📱', titleKey: 'onboarding.slide2_title', bodyKey: 'onboarding.slide2_body' },
  { emoji: '🌱', titleKey: 'onboarding.slide3_title', bodyKey: 'onboarding.slide3_body' },
];

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [index, setIndex] = useState(0);

  function next() {
    if (index < SLIDES.length - 1) {
      setIndex(index + 1);
    } else {
      router.replace('/(auth)/welcome');
    }
  }

  function skip() {
    router.replace('/(auth)/welcome');
  }

  const slide = SLIDES[index];

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Skip button */}
      <View className="flex-row justify-end px-5 pt-2">
        <Pressable onPress={skip}>
          <Text className="text-neutral-500 text-sm font-medium">{t('common.skip')}</Text>
        </Pressable>
      </View>

      {/* Slide content */}
      <View className="flex-1 items-center justify-center px-8">
        <View className="w-48 h-48 rounded-full bg-brand-50 items-center justify-center mb-8">
          <Text className="text-7xl">{slide.emoji}</Text>
        </View>
        <Text className="text-2xl font-bold text-neutral-900 text-center mb-3">
          {t(slide.titleKey)}
        </Text>
        <Text className="text-neutral-500 text-center leading-relaxed">{t(slide.bodyKey)}</Text>
      </View>

      {/* Dots indicator + CTA */}
      <View className="px-8 pb-10">
        <View className="flex-row justify-center gap-2 mb-6">
          {SLIDES.map((_, i) => (
            <View
              key={i}
              className={`h-2 rounded-full ${i === index ? 'w-8 bg-brand-500' : 'w-2 bg-neutral-200'}`}
            />
          ))}
        </View>
        <Button
          label={index < SLIDES.length - 1 ? t('common.next') : t('onboarding.start')}
          onPress={next}
          fullWidth
          size="lg"
          rightIcon={<ArrowRight size={16} color="#fff" />}
        />
      </View>
    </SafeAreaView>
  );
}
