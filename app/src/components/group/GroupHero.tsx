/**
 * Hero image group. Kalau belum ada gambar → banner emoji jenis group.
 * Hanya PIC (atau fulltimer bila group belum punya PIC) yang bisa ganti/hapus.
 */
import { Alert, ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { Camera, Lock, Trash2 } from 'lucide-react-native';

import { env } from '@/config/env';
import { useToast } from '@/components/ui/Toast';
import { useDeleteGroupHero, useUploadGroupHero } from '@/hooks/useGroupContent';
import { ApiError } from '@/types/api';

export const groupImageHref = (u: string) => (u.startsWith('http') ? u : `${env.apiBaseUrl}${u}`);

export function GroupHero({
  groupId,
  nama,
  emoji,
  isPublic,
  heroImageUrl,
  canEdit,
}: {
  groupId: string;
  nama: string;
  emoji: string;
  isPublic: boolean;
  heroImageUrl?: string | null;
  canEdit: boolean;
}) {
  const { t } = useTranslation();
  const showToast = useToast((s) => s.show);
  const uploadMut = useUploadGroupHero(groupId);
  const deleteMut = useDeleteGroupHero(groupId);
  const busy = uploadMut.isPending || deleteMut.isPending;
  const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : t('error.generic'));

  async function pick() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showToast(t('gc.hero_permission'), 'error');
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    const a = r.canceled ? null : r.assets[0];
    if (!a) return;
    const name = a.fileName ?? a.uri.split('/').pop() ?? 'hero.jpg';
    uploadMut.mutate(
      { uri: a.uri, name, mimeType: a.mimeType ?? 'image/jpeg', file: (a as { file?: File }).file },
      {
        onSuccess: () => showToast(t('gc.hero_updated'), 'success'),
        onError: (e) => showToast(errMsg(e), 'error'),
      },
    );
  }

  function remove() {
    Alert.alert(t('gc.hero_remove'), t('gc.hero_remove_confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => deleteMut.mutate(undefined, { onError: (e) => showToast(errMsg(e), 'error') }),
      },
    ]);
  }

  return (
    <View style={{ aspectRatio: 16 / 9 }} className="w-full bg-brand-50 overflow-hidden">
      {heroImageUrl ? (
        <Image source={{ uri: groupImageHref(heroImageUrl) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      ) : (
        <View className="flex-1 items-center justify-center">
          <Text className="text-6xl">{emoji}</Text>
        </View>
      )}
      {heroImageUrl ? <View className="absolute inset-0 bg-black/30" /> : null}
      <View className="absolute left-4 right-4 bottom-3">
        <Text className={`text-xl font-bold ${heroImageUrl ? 'text-white' : 'text-brand-800'}`} numberOfLines={2}>
          {nama}
        </Text>
        {!isPublic ? (
          <View className="flex-row items-center gap-1 mt-1 self-start bg-white/80 px-3 py-1 rounded-full">
            <Lock size={12} color="#C2410C" />
            <Text className="text-xs font-semibold text-brand-700">{t('group.visibility_private')}</Text>
          </View>
        ) : null}
      </View>
      {canEdit ? (
        <View className="absolute top-3 right-3 flex-row gap-2">
          {heroImageUrl ? (
            <Pressable onPress={remove} disabled={busy} className="w-9 h-9 rounded-full bg-white/90 items-center justify-center">
              <Trash2 size={16} color="#DC2626" />
            </Pressable>
          ) : null}
          <Pressable
            onPress={pick}
            disabled={busy}
            className="flex-row items-center gap-1.5 h-9 px-3 rounded-full bg-white/90"
          >
            {busy ? <ActivityIndicator size="small" color="#EA580C" /> : <Camera size={16} color="#EA580C" />}
            <Text className="text-xs font-bold text-brand-700">
              {heroImageUrl ? t('gc.hero_change') : t('gc.hero_add')}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
