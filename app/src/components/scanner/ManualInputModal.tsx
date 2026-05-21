import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Keyboard, X } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';

export function ManualInputModal({
  visible,
  onClose,
  onSubmit,
  loading,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (kode: string) => void;
  loading?: boolean;
}) {
  const { t } = useTranslation();
  const [kode, setKode] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    setError(null);
    const normalized = kode.trim().toUpperCase();
    if (!/^[A-Z0-9]{8}$/.test(normalized)) {
      setError(t('scanner.manual_invalid'));
      return;
    }
    onSubmit(normalized);
    setKode('');
  }

  function handleClose() {
    setKode('');
    setError(null);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-black/60 justify-end"
      >
        <Pressable onPress={handleClose} className="flex-1" />
        <View className="bg-white rounded-t-3xl p-5">
          <View className="items-center mb-2">
            <View className="w-10 h-1 bg-neutral-300 rounded-full" />
          </View>
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <Keyboard size={18} color="#525252" />
              <Text className="text-lg font-bold text-neutral-900">
                {t('scanner.manual_title')}
              </Text>
            </View>
            <Pressable onPress={handleClose} className="w-8 h-8 items-center justify-center">
              <X size={18} color="#737373" />
            </Pressable>
          </View>
          <Text className="text-xs text-neutral-500 mb-3 leading-relaxed">
            {t('scanner.manual_hint')}
          </Text>

          <TextInput
            value={kode}
            onChangeText={(v) => {
              setKode(v.toUpperCase());
              setError(null);
            }}
            placeholder="ABC23XYZ"
            placeholderTextColor="#A3A3A3"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
            editable={!loading}
            className={`px-4 py-3 border-2 rounded-xl text-2xl font-mono font-bold text-center tracking-widest text-neutral-900 ${
              error ? 'border-red-400' : 'border-neutral-200'
            }`}
            style={Platform.OS === 'android' ? { includeFontPadding: false } : undefined}
          />
          {error ? (
            <Text className="text-xs text-red-600 mt-1.5">{error}</Text>
          ) : (
            <Text className="text-xs text-neutral-500 mt-1.5">
              {t('scanner.manual_format')}
            </Text>
          )}

          <View className="mt-4 mb-2">
            <Button
              label={t('scanner.manual_submit')}
              onPress={handleSubmit}
              loading={loading}
              disabled={kode.length < 8}
              fullWidth
              size="lg"
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
