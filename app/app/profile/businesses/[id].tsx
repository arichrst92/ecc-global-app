/**
 * Owner business detail/edit — per BE handoff doc 2026-05-22 (rev a).
 *
 * Layout: hero+logo with edit buttons, form fields editable inline,
 * social links dynamic list, PDF upload (image-only fallback for v1),
 * toggle isActive, delete with confirm.
 *
 * NOTE: PDF upload pakai expo-image-picker bisa via document picker — but
 * untuk simplicity v1, kita anggap PDF upload feature placeholder (BE ready
 * tapi UI defer ke v2 pakai expo-document-picker). User bisa contact admin.
 */
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  Camera,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { HeroImage } from '@/components/ui/HeroImage';
import { useToast } from '@/components/ui/Toast';
import {
  useDeleteBusiness,
  useDeleteBusinessHero,
  useDeleteBusinessLogo,
  useDeleteBusinessPdf,
  useMyBusinessDetail,
  useUpdateBusiness,
  useUploadBusinessHero,
  useUploadBusinessLogo,
} from '@/hooks/useLocalBusiness';
import { ApiError } from '@/types/api';
import { env } from '@/config/env';
import { INDUSTRI_SUGGESTIONS } from '@/types/localBusiness';
import type { SocialLink, TipeBisnis } from '@/types/localBusiness';

export default function OwnerBusinessDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const { id } = useLocalSearchParams<{ id: string }>();

  const query = useMyBusinessDetail(id);
  const biz = query.data;

  const updateMutation = useUpdateBusiness(id ?? '');
  const heroUploadMutation = useUploadBusinessHero(id ?? '');
  const heroDeleteMutation = useDeleteBusinessHero(id ?? '');
  const logoUploadMutation = useUploadBusinessLogo(id ?? '');
  const logoDeleteMutation = useDeleteBusinessLogo(id ?? '');
  const pdfDeleteMutation = useDeleteBusinessPdf(id ?? '');
  const deleteBizMutation = useDeleteBusiness();

  // Local form state — diisi dari biz, save via PATCH
  const [nama, setNama] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [industri, setIndustri] = useState('');
  const [tipeBisnis, setTipeBisnis] = useState<TipeBisnis>('B2C');
  const [isOnline, setIsOnline] = useState(false);
  const [lokasi, setLokasi] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [isActive, setIsActive] = useState(true);

  const [addSocialOpen, setAddSocialOpen] = useState(false);
  const [newPlatform, setNewPlatform] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (biz) {
      setNama(biz.nama);
      setDeskripsi(biz.deskripsi ?? '');
      setIndustri(biz.industri ?? '');
      setTipeBisnis(biz.tipeBisnis);
      setIsOnline(biz.isOnline);
      setLokasi(biz.lokasi ?? '');
      setWebsiteUrl(biz.websiteUrl ?? '');
      setWhatsappUrl(biz.whatsappUrl ?? '');
      setSocialLinks(biz.socialLinks);
      setIsActive(biz.isActive);
    }
  }, [biz]);

  async function pickAndUploadImage(target: 'hero' | 'logo') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showToast(t('my_business.permission_denied'), 'error');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      // Logo: square crop; Hero: 16:9 wide crop
      allowsEditing: true,
      aspect: target === 'logo' ? [1, 1] : [16, 9],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const filename = asset.uri.split('/').pop() ?? `${target}.jpg`;
    const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
    const fileObj = { uri: asset.uri, name: filename, type: mime };

    const mutation = target === 'logo' ? logoUploadMutation : heroUploadMutation;
    mutation.mutate(fileObj, {
      onSuccess: () => {
        showToast(
          t(target === 'logo' ? 'my_business.logo_uploaded' : 'my_business.hero_uploaded'),
          'success',
        );
      },
      onError: (err) => {
        const msg = err instanceof ApiError ? err.message : t('error.network');
        showToast(msg, 'error');
      },
    });
  }

  /**
   * Auto-prepend https:// kalau user input URL tanpa scheme.
   * Mis. "warungbudi.id" → "https://warungbudi.id".
   * Return empty string kalau input cuma whitespace → akan dijadikan undefined.
   */
  function normalizeUrl(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }

  function handleSave() {
    if (nama.trim().length < 2) {
      showToast(t('my_business.nama_required'), 'error');
      return;
    }
    // Normalize URLs + filter empty social links sebelum send.
    // BE Zod validation reject URL tanpa scheme atau empty string di array.
    const normWebsite = normalizeUrl(websiteUrl);
    const normWhatsapp = normalizeUrl(whatsappUrl);
    const cleanedSocials = socialLinks
      .map((s) => ({
        platform: s.platform.trim(),
        url: normalizeUrl(s.url),
      }))
      .filter((s) => s.platform && s.url);

    updateMutation.mutate(
      {
        nama: nama.trim(),
        deskripsi: deskripsi.trim() || undefined,
        industri: industri.trim() || undefined,
        tipeBisnis,
        isOnline,
        lokasi: lokasi.trim() || undefined,
        websiteUrl: normWebsite || undefined,
        whatsappUrl: normWhatsapp || undefined,
        socialLinks: cleanedSocials,
        isActive,
      },
      {
        onSuccess: () => {
          showToast(t('my_business.saved'), 'success');
        },
        onError: (err) => {
          if (err instanceof ApiError) {
            // Surface field-level details kalau ada (mis. URL format invalid)
            const fieldErrors = err.details?.fieldErrors ?? {};
            const firstField = Object.entries(fieldErrors)[0];
            const detailMsg = firstField
              ? `${firstField[0]}: ${(firstField[1] as string[])[0]}`
              : err.message;
            showToast(detailMsg, 'error');
          } else {
            showToast(t('error.network'), 'error');
          }
        },
      },
    );
  }

  function handleAddSocial() {
    const platform = newPlatform.trim();
    const rawUrl = newUrl.trim();
    if (!platform || !rawUrl) return;
    if (socialLinks.length >= 10) {
      showToast(t('my_business.social_max'), 'error');
      return;
    }
    // Auto-normalize URL — user boleh ketik "instagram.com/x" tanpa https://
    const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    setSocialLinks([...socialLinks, { platform, url }]);
    setNewPlatform('');
    setNewUrl('');
    setAddSocialOpen(false);
  }

  function handleRemoveSocial(idx: number) {
    setSocialLinks(socialLinks.filter((_, i) => i !== idx));
  }

  function handleDelete() {
    if (!id) return;
    deleteBizMutation.mutate(id, {
      onSuccess: () => {
        setConfirmDeleteOpen(false);
        showToast(t('my_business.deleted'), 'success');
        router.back();
      },
      onError: (err) => {
        setConfirmDeleteOpen(false);
        const msg = err instanceof ApiError ? err.message : t('error.network');
        showToast(msg, 'error');
      },
    });
  }

  if (query.isPending) {
    return (
      <View className="flex-1 bg-neutral-50 items-center justify-center">
        <ActivityIndicator color="#F97316" />
      </View>
    );
  }

  if (!biz) {
    return (
      <View className="flex-1 bg-neutral-50">
        <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
          <View className="px-4 py-2 flex-row items-center">
            <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
              <ArrowLeft size={20} color="#171717" />
            </Pressable>
          </View>
        </SafeAreaView>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-sm text-neutral-500 text-center">
            {t('my_business.not_found')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
          <Text className="text-base font-bold text-neutral-900 flex-1" numberOfLines={1}>
            {biz.nama}
          </Text>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero + Logo */}
          <View className="relative">
            <Pressable onPress={() => pickAndUploadImage('hero')}>
              <HeroImage
                url={biz.heroImageUrl}
                fallbackEmoji="🏪"
                emojiSize={56}
                className="w-full aspect-video"
              />
              <View className="absolute inset-0 items-center justify-center">
                <View className="bg-black/50 rounded-full p-3">
                  <Camera size={20} color="#fff" />
                </View>
              </View>
            </Pressable>
            {biz.heroImageUrl ? (
              <Pressable
                onPress={() =>
                  Alert.alert(
                    t('my_business.hero_delete_confirm'),
                    undefined,
                    [
                      { text: t('common.cancel'), style: 'cancel' },
                      {
                        text: t('common.delete'),
                        style: 'destructive',
                        onPress: () => heroDeleteMutation.mutate(),
                      },
                    ],
                  )
                }
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 items-center justify-center"
              >
                <Trash2 size={14} color="#fff" />
              </Pressable>
            ) : null}

            {/* Logo overlay */}
            <Pressable
              onPress={() => pickAndUploadImage('logo')}
              className="absolute -bottom-6 left-5 w-16 h-16 rounded-2xl bg-white border-4 border-white overflow-hidden items-center justify-center"
            >
              {biz.logoUrl ? (
                <Image
                  source={{
                    uri: biz.logoUrl.startsWith('http')
                      ? biz.logoUrl
                      : `${env.apiBaseUrl}${biz.logoUrl}`,
                  }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              ) : (
                <ImageIcon size={20} color="#737373" />
              )}
            </Pressable>
            {biz.logoUrl ? (
              <Pressable
                onPress={() => logoDeleteMutation.mutate()}
                className="absolute -bottom-4 left-20 w-7 h-7 rounded-full bg-red-500 items-center justify-center border-2 border-white"
              >
                <X size={12} color="#fff" />
              </Pressable>
            ) : null}
          </View>

          <View className="px-5 mt-8">
            <Text className="text-[10px] text-neutral-400 mb-4 leading-relaxed">
              {t('my_business.image_hint')}
            </Text>

            <Field label={t('my_business.nama_label') + ' *'}>
              <TextInput
                value={nama}
                onChangeText={setNama}
                maxLength={255}
                className="bg-white rounded-xl px-4 py-3 border border-neutral-200 text-base text-neutral-900"
              />
            </Field>

            <Field label={t('my_business.deskripsi_label')}>
              <TextInput
                value={deskripsi}
                onChangeText={setDeskripsi}
                placeholder={t('my_business.deskripsi_placeholder')}
                multiline
                numberOfLines={3}
                maxLength={2000}
                textAlignVertical="top"
                className="bg-white rounded-xl px-4 py-3 border border-neutral-200 text-base text-neutral-900 min-h-[80px]"
              />
            </Field>

            <Field label={t('my_business.tipe_label') + ' *'}>
              <View className="flex-row gap-2">
                {(['B2C', 'B2B', 'B2B2C'] as const).map((opt) => (
                  <Pressable
                    key={opt}
                    onPress={() => setTipeBisnis(opt)}
                    className={`flex-1 py-3 rounded-xl border items-center ${
                      tipeBisnis === opt
                        ? 'bg-brand-50 border-brand-500'
                        : 'bg-white border-neutral-200'
                    }`}
                  >
                    <Text
                      className={`text-sm font-bold ${
                        tipeBisnis === opt ? 'text-brand-700' : 'text-neutral-700'
                      }`}
                    >
                      {opt}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Field>

            <Field label={t('my_business.industri_label')}>
              <TextInput
                value={industri}
                onChangeText={setIndustri}
                placeholder={t('my_business.industri_placeholder')}
                maxLength={100}
                className="bg-white rounded-xl px-4 py-3 border border-neutral-200 text-base text-neutral-900 mb-2"
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {INDUSTRI_SUGGESTIONS.map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => setIndustri(s)}
                      className={`px-3 py-1.5 rounded-full ${
                        industri === s ? 'bg-brand-500' : 'bg-neutral-100'
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          industri === s ? 'text-white' : 'text-neutral-600'
                        }`}
                      >
                        {s}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </Field>

            <Field label={t('my_business.is_online_label')}>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => setIsOnline(false)}
                  className={`flex-1 py-3 rounded-xl border items-center ${
                    !isOnline ? 'bg-brand-50 border-brand-500' : 'bg-white border-neutral-200'
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      !isOnline ? 'text-brand-700' : 'text-neutral-700'
                    }`}
                  >
                    {t('my_business.offline_label')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setIsOnline(true)}
                  className={`flex-1 py-3 rounded-xl border items-center ${
                    isOnline ? 'bg-brand-50 border-brand-500' : 'bg-white border-neutral-200'
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      isOnline ? 'text-brand-700' : 'text-neutral-700'
                    }`}
                  >
                    {t('my_business.online_label')}
                  </Text>
                </Pressable>
              </View>
            </Field>

            <Field label={t('my_business.lokasi_label')}>
              <TextInput
                value={lokasi}
                onChangeText={setLokasi}
                placeholder={t('my_business.lokasi_placeholder')}
                maxLength={500}
                className="bg-white rounded-xl px-4 py-3 border border-neutral-200 text-base text-neutral-900"
              />
            </Field>

            <Field label={t('my_business.website_label')}>
              <TextInput
                value={websiteUrl}
                onChangeText={setWebsiteUrl}
                placeholder="https://..."
                autoCapitalize="none"
                keyboardType="url"
                className="bg-white rounded-xl px-4 py-3 border border-neutral-200 text-base text-neutral-900"
              />
            </Field>

            <Field label={t('my_business.whatsapp_label')}>
              <TextInput
                value={whatsappUrl}
                onChangeText={setWhatsappUrl}
                placeholder="https://wa.me/628..."
                autoCapitalize="none"
                keyboardType="url"
                className="bg-white rounded-xl px-4 py-3 border border-neutral-200 text-base text-neutral-900"
              />
              <Text className="text-[10px] text-neutral-400 mt-1">
                {t('my_business.whatsapp_hint')}
              </Text>
            </Field>

            {/* Social links */}
            <View className="mb-4">
              <View className="flex-row items-center mb-2">
                <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex-1">
                  {t('my_business.social_label')}
                </Text>
                <Pressable
                  onPress={() => setAddSocialOpen(true)}
                  className="bg-brand-50 rounded-full px-2.5 py-1 flex-row items-center gap-1"
                >
                  <Plus size={11} color="#EA580C" />
                  <Text className="text-[11px] font-bold text-brand-600">
                    {t('my_business.social_add')}
                  </Text>
                </Pressable>
              </View>
              {socialLinks.length === 0 ? (
                <View className="bg-white rounded-2xl p-4 border border-neutral-100 items-center">
                  <Text className="text-xs text-neutral-400 text-center">
                    {t('my_business.social_empty')}
                  </Text>
                </View>
              ) : (
                <View className="bg-white rounded-2xl border border-neutral-100">
                  {socialLinks.map((s, idx) => (
                    <View
                      key={`${s.platform}-${idx}`}
                      className={`p-3 flex-row items-center gap-3 ${
                        idx > 0 ? 'border-t border-neutral-100' : ''
                      }`}
                    >
                      <View className="w-9 h-9 rounded-xl bg-neutral-100 items-center justify-center">
                        <ExternalLink size={14} color="#525252" />
                      </View>
                      <View className="flex-1 min-w-0">
                        <Text className="text-sm font-semibold text-neutral-900">
                          {s.platform}
                        </Text>
                        <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>
                          {s.url}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => handleRemoveSocial(idx)}
                        className="w-7 h-7 rounded-full bg-red-50 items-center justify-center"
                      >
                        <X size={12} color="#DC2626" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* PDF profile */}
            <Field label={t('my_business.pdf_label')}>
              {biz.companyProfileUrl ? (
                <View className="bg-white rounded-2xl p-4 border border-neutral-100 flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-xl bg-red-50 items-center justify-center">
                    <FileText size={18} color="#DC2626" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-neutral-900">
                      {t('my_business.pdf_uploaded')}
                    </Text>
                    <Pressable
                      onPress={() =>
                        Linking.openURL(
                          biz.companyProfileUrl!.startsWith('http')
                            ? biz.companyProfileUrl!
                            : `${env.apiBaseUrl}${biz.companyProfileUrl}`,
                        )
                      }
                    >
                      <Text className="text-xs text-brand-600 mt-0.5">
                        {t('my_business.pdf_view')}
                      </Text>
                    </Pressable>
                  </View>
                  <Pressable
                    onPress={() => pdfDeleteMutation.mutate()}
                    className="w-9 h-9 rounded-full bg-red-50 items-center justify-center"
                  >
                    <Trash2 size={14} color="#DC2626" />
                  </Pressable>
                </View>
              ) : (
                <View className="bg-neutral-100 rounded-2xl p-4 flex-row items-center gap-3">
                  <Upload size={18} color="#737373" />
                  <Text className="text-xs text-neutral-600 flex-1">
                    {t('my_business.pdf_not_supported')}
                  </Text>
                </View>
              )}
            </Field>

            {/* Active toggle */}
            <Field label={t('my_business.status_label')}>
              <Pressable
                onPress={() => setIsActive(!isActive)}
                className={`p-4 rounded-2xl border flex-row items-center gap-3 ${
                  isActive
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-neutral-100 border-neutral-200'
                }`}
              >
                <View className="flex-1">
                  <Text
                    className={`text-sm font-bold ${
                      isActive ? 'text-emerald-700' : 'text-neutral-600'
                    }`}
                  >
                    {isActive ? t('my_business.active_label') : t('my_business.inactive_label')}
                  </Text>
                  <Text className="text-xs text-neutral-500 mt-0.5">
                    {isActive
                      ? t('my_business.active_sub')
                      : t('my_business.inactive_sub')}
                  </Text>
                </View>
                <View
                  className={`w-12 h-6 rounded-full justify-center px-0.5 ${
                    isActive ? 'bg-emerald-500 items-end' : 'bg-neutral-300 items-start'
                  }`}
                >
                  <View className="w-5 h-5 rounded-full bg-white" />
                </View>
              </Pressable>
            </Field>

            {/* Delete */}
            <Pressable
              onPress={() => setConfirmDeleteOpen(true)}
              className="mt-4 mb-2 bg-white rounded-2xl p-4 border border-neutral-100 flex-row items-center gap-3"
            >
              <View className="w-10 h-10 rounded-xl bg-red-50 items-center justify-center">
                <Trash2 size={18} color="#DC2626" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-red-600">
                  {t('my_business.delete_btn')}
                </Text>
                <Text className="text-xs text-neutral-500 mt-0.5">
                  {t('my_business.delete_sub')}
                </Text>
              </View>
            </Pressable>
          </View>
        </ScrollView>

        <View className="px-5 pt-3 pb-3 bg-white border-t border-neutral-100">
          <Button
            label={t('common.save')}
            onPress={handleSave}
            loading={updateMutation.isPending}
            fullWidth
            size="lg"
          />
        </View>
      </KeyboardAvoidingView>

      {/* Add social link modal */}
      <Modal
        visible={addSocialOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setAddSocialOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <Pressable
            onPress={() => setAddSocialOpen(false)}
            className="flex-1 bg-black/50 justify-end"
          >
            <Pressable onPress={() => {}} className="bg-white rounded-t-3xl p-5 pb-8">
              <Text className="text-lg font-bold text-neutral-900 mb-3">
                {t('my_business.social_modal_title')}
              </Text>
              <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">
                {t('my_business.social_platform_label')}
              </Text>
              <TextInput
                value={newPlatform}
                onChangeText={setNewPlatform}
                placeholder="Instagram"
                maxLength={50}
                className="bg-neutral-50 rounded-xl px-4 py-3 border border-neutral-200 text-base text-neutral-900 mb-3"
              />
              <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">
                {t('my_business.social_url_label')}
              </Text>
              <TextInput
                value={newUrl}
                onChangeText={setNewUrl}
                placeholder="https://instagram.com/..."
                autoCapitalize="none"
                keyboardType="url"
                className="bg-neutral-50 rounded-xl px-4 py-3 border border-neutral-200 text-base text-neutral-900 mb-4"
              />
              <Button
                label={t('common.save')}
                onPress={handleAddSocial}
                disabled={!newPlatform.trim() || !newUrl.trim()}
                fullWidth
              />
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete confirm */}
      <Modal
        visible={confirmDeleteOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmDeleteOpen(false)}
      >
        <Pressable
          onPress={() => setConfirmDeleteOpen(false)}
          className="flex-1 bg-black/50 items-center justify-center px-6"
        >
          <Pressable onPress={() => {}} className="bg-white rounded-2xl p-5 w-full max-w-sm">
            <View className="w-12 h-12 rounded-xl bg-red-50 items-center justify-center mb-3 self-start">
              <Trash2 size={24} color="#DC2626" />
            </View>
            <Text className="text-lg font-bold text-neutral-900 mb-1">
              {t('my_business.delete_confirm_title')}
            </Text>
            <Text className="text-sm text-neutral-500 mb-4 leading-relaxed">
              {t('my_business.delete_confirm_msg', { name: biz.nama })}
            </Text>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button
                  label={t('common.cancel')}
                  variant="secondary"
                  onPress={() => setConfirmDeleteOpen(false)}
                  fullWidth
                  disabled={deleteBizMutation.isPending}
                />
              </View>
              <View className="flex-1">
                <Button
                  label={t('common.delete')}
                  variant="danger"
                  onPress={handleDelete}
                  loading={deleteBizMutation.isPending}
                  fullWidth
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
        {label}
      </Text>
      {children}
    </View>
  );
}
