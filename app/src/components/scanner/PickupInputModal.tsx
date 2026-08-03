/**
 * Modal input kode jemput 6-digit numeric untuk pickup anak.
 * Per BE notice Modul 27 2026-08-01.
 *
 * Beda dgn ManualInputModal (yg untuk 8-char alphanumeric reservation code):
 * - Format: 6-digit numeric only
 * - Autofocus + auto-submit saat 6-digit terisi lengkap
 * - Pink accent (konsisten dgn CKids brand)
 */
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
import { Baby, X } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';

export function PickupInputModal({
  visible,
  onClose,
  onSubmit,
  loading,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (pickupCode: string) => void;
  loading?: boolean;
}) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    setError(null);
    const normalized = code.trim();
    if (!/^\d{6}$/.test(normalized)) {
      setError(t('scanner.pickup_error_format'));
      return;
    }
    onSubmit(normalized);
    setCode('');
  }

  function handleClose() {
    setCode('');
    setError(null);
    onClose();
  }

  function handleChange(v: string) {
    // Strip non-digit
    const digitsOnly = v.replace(/\D/g, '').slice(0, 6);
    setCode(digitsOnly);
    setError(null);
    // Auto-submit saat lengkap 6-digit (opt-in UX untuk speed di stall antrian)
    if (digitsOnly.length === 6 && !loading) {
      // Small delay supaya user sempat visual confirm
      setTimeout(() => {
        onSubmit(digitsOnly);
        setCode('');
      }, 200);
    }
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
              <Baby size={20} color="#F97316" />
              <Text className="text-lg font-bold text-neutral-900">
                {t('scanner.pickup_modal_title')}
              </Text>
            </View>
            <Pressable onPress={handleClose} className="w-8 h-8 items-center justify-center">
              <X size={18} color="#737373" />
            </Pressable>
          </View>
          <Text className="text-xs text-neutral-500 mb-3 leading-relaxed">
            {t('scanner.pickup_modal_hint')}
          </Text>

          <TextInput
            value={code}
            onChangeText={handleChange}
            placeholder="000000"
            placeholderTextColor="#D4D4D4"
            keyboardType="number-pad"
            autoFocus
            maxLength={6}
            editable={!loading}
            className={`px-4 py-4 border-2 rounded-xl text-4xl font-bold text-center tracking-widest text-neutral-900 ${
              error ? 'border-red-400' : 'border-brand-300'
            }`}
            style={Platform.OS === 'android' ? { includeFontPadding: false } : undefined}
          />
          {error ? (
            <Text className="text-xs text-red-600 mt-1.5">{error}</Text>
          ) : (
            <Text className="text-xs text-neutral-500 mt-1.5">
              {t('scanner.pickup_modal_format')}
            </Text>
          )}

          <View className="mt-4 mb-2">
            <Button
              label={t('scanner.pickup_modal_submit')}
              onPress={handleSubmit}
              loading={loading}
              disabled={code.length < 6}
              fullWidth
              size="lg"
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
