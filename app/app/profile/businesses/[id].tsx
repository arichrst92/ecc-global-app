/**
 * Owner business detail/edit — per BE handoff doc 2026-05-22 (rev a).
 *
 * Layout: hero+logo with edit buttons, form fields editable inline,
 * social links dynamic list, PDF upload (real via expo-document-picker
 * post v1.6.0), toggle isActive, delete with confirm.
 *
 * PDF: max 5 MB (BE limit), MIME application/pdf only, client-side
 * size validation sebelum upload.
 */
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { TextInput } from '@/components/ui/ThemedTextInput';
import { KeyboardSafeView } from '@/components/ui/KeyboardSafeView';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  ArrowLeft,
  Camera,
  ChevronRight,
  Eye,
  ShoppingBag,
  UserPlus,
  FileText,
  Image as ImageIcon,
  Trash2,
  Upload,
  X,
} from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { JemaatSearchModal } from '@/components/scanner/JemaatSearchModal';
import { useAuthStore } from '@/stores/auth.store';
import { HeroImage } from '@/components/ui/HeroImage';
import { useToast } from '@/components/ui/Toast';
import {
  useDeleteBusiness,
  useDeleteBusinessHero,
  useDeleteBusinessLogo,
  useDeleteBusinessPdf,
  useMyBusinessDetail,
  useUpdateBusiness,
  useInvitePartner,
  useRemovePartner,
  useLeaveBusiness,
  useUploadBusinessHero,
  useUploadBusinessLogo,
  useUploadBusinessPdf,
} from '@/hooks/useLocalBusiness';
import { ApiError } from '@/types/api';
import { env } from '@/config/env';
import { INDUSTRI_SUGGESTIONS } from '@/types/localBusiness';
import {
  MARKETPLACES,
  SOCIAL_PLATFORMS,
  cleanMarketplaceLinks,
  cleanSocialUsername,
  isMapsUrl,
  usernamesFromLinks,
  withScheme,
} from '@/types/localBusiness';
import { BrandIcon } from '@/components/market/BrandIcon';
import { MARKET_ICONS, SOCIAL_ICONS } from '@/components/market/brandIcons';
import type { MarketplaceLinks, SocialUsernames, TipeBisnis } from '@/types/localBusiness';
import { goBack } from '@/utils/nav';
import { imageAssetToFile } from '@/utils/pickedImage';
import { gx } from '@/theme/gradient';
import { nc } from '@/theme/ThemeRoot';
import { cekHuruf, cekTeks, cekUrl, pertamaGagal } from '@/utils/inputRules';

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
  const pdfUploadMutation = useUploadBusinessPdf(id ?? '');
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
  const [waAdmin, setWaAdmin] = useState('');
  const [email, setEmail] = useState('');
  const [socials, setSocials] = useState<SocialUsernames>({});
  const [mapsUrl, setMapsUrl] = useState('');
  const [markets, setMarkets] = useState<MarketplaceLinks>({});
  const [isActive, setIsActive] = useState(true);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const myJemaatId = useAuthStore((s) => s.user?.jemaatId);
  const inviteMut = useInvitePartner(id ?? '');
  const removePartnerMut = useRemovePartner(id ?? '');
  const leaveMut = useLeaveBusiness(id ?? '');
  const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : t('error.network'));

  function invite(kode: string) {
    inviteMut.mutate(kode, {
      onSuccess: (p) => {
        setInviteOpen(false);
        showToast(t('partner.invited_toast', { name: p?.jemaat?.namaLengkap ?? '' }), 'success');
      },
      onError: (e) => showToast(errMsg(e), 'error'),
    });
  }
  function askRemovePartner(pid: string, name: string, status: 'PENDING' | 'ACCEPTED') {
    Alert.alert(
      status === 'PENDING' ? t('partner.cancel_invite_title') : t('partner.remove_title'),
      t(status === 'PENDING' ? 'partner.cancel_invite_body' : 'partner.remove_body', { name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: status === 'PENDING' ? t('partner.cancel_invite_confirm') : t('partner.remove_confirm'),
          style: 'destructive',
          onPress: () => removePartnerMut.mutate(pid, { onError: (e) => showToast(errMsg(e), 'error') }),
        },
      ],
    );
  }
  function askLeave() {
    Alert.alert(t('partner.leave_title'), t('partner.leave_body', { name: biz?.nama ?? '' }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('partner.leave_confirm'),
        style: 'destructive',
        onPress: () =>
          leaveMut.mutate(undefined, {
            onSuccess: () => {
              showToast(t('partner.left_toast'), 'success');
              goBack(router);
            },
            onError: (e) => showToast(errMsg(e), 'error'),
          }),
      },
    ]);
  }

  useEffect(() => {
    if (biz) {
      setNama(biz.nama);
      setDeskripsi(biz.deskripsi ?? '');
      setIndustri(biz.industri ?? '');
      setTipeBisnis(biz.tipeBisnis);
      setIsOnline(biz.isOnline);
      setLokasi(biz.lokasi ?? '');
      setWebsiteUrl(biz.websiteUrl ?? '');
      setWaAdmin(biz.waAdmin ?? '');
      setEmail(biz.email ?? '');
      setSocials(biz.socialUsernames ?? usernamesFromLinks(biz.socialLinks));
      setMapsUrl(biz.mapsUrl ?? '');
      setMarkets(biz.marketplaceLinks ?? {});
      setIsActive(biz.isActive);
    }
  }, [biz]);

  /**
   * PDF company profile picker — max 5 MB (BE limit).
   * Uses expo-document-picker native sheet, MIME filter application/pdf.
   */
  async function pickAndUploadPdf() {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];

    // Client-side size validation — max 5 MB to match BE
    const MAX_BYTES = 5 * 1024 * 1024;
    if (typeof asset.size === 'number' && asset.size > MAX_BYTES) {
      showToast(t('my_business.pdf_too_large'), 'error');
      return;
    }

    const fileObj = {
      uri: asset.uri,
      name: asset.name || 'company-profile.pdf',
      type: asset.mimeType || 'application/pdf',
    };

    pdfUploadMutation.mutate(fileObj, {
      onSuccess: () => {
        showToast(t('my_business.pdf_upload_success'), 'success');
      },
      onError: (err) => {
        const msg = err instanceof ApiError ? err.message : t('error.network');
        showToast(msg, 'error');
      },
    });
  }

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
    const fileObj = await imageAssetToFile(result.assets[0], `${target}.jpg`);

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
    const salah = pertamaGagal(
      cekHuruf(nama, { label: t('my_business.nama_label') }),
      cekTeks(deskripsi, { label: t('my_business.deskripsi_label') }),
      cekHuruf(industri, { label: t('my_business.industri_label') }),
      cekTeks(lokasi, { label: t('my_business.lokasi_label') }),
      cekUrl(normalizeUrl(websiteUrl) ?? ''),
      waAdmin.trim() && !/^(\+?62|0)8\d{7,12}$/.test(waAdmin.replace(/[\s-]/g, ''))
        ? t('my_business.wa_admin_invalid')
        : null,
      email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ? t('my_business.email_invalid')
        : null,
    );
    if (salah) {
      showToast(salah, 'error');
      return;
    }
    if (mapsUrl.trim() && !isMapsUrl(mapsUrl)) {
      showToast(t('my_business.maps_invalid'), 'error');
      return;
    }
    const mk = cleanMarketplaceLinks(markets);
    if (mk.bad) {
      showToast(t('my_business.market_invalid', { name: mk.bad }), 'error');
      return;
    }
    // Normalize URLs + filter empty social links sebelum send.
    // BE Zod validation reject URL tanpa scheme atau empty string di array.
    const normWebsite = normalizeUrl(websiteUrl);
    const cleanedSocials: SocialUsernames = {};
    for (const p of SOCIAL_PLATFORMS) {
      const u = cleanSocialUsername(socials[p.key] ?? '');
      if (u) cleanedSocials[p.key] = u;
    }

    updateMutation.mutate(
      {
        nama: nama.trim(),
        deskripsi: deskripsi.trim() || undefined,
        industri: industri.trim() || undefined,
        tipeBisnis,
        isOnline,
        lokasi: lokasi.trim() || undefined,
        websiteUrl: normWebsite || undefined,
        waAdmin: waAdmin.replace(/[\s-]/g, '') || null,
        email: email.trim() || null,
        socialUsernames: cleanedSocials,
        mapsUrl: mapsUrl.trim() ? withScheme(mapsUrl) : null,
        marketplaceLinks: mk.links,
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

  function handleDelete() {
    if (!id) return;
    deleteBizMutation.mutate(id, {
      onSuccess: () => {
        setConfirmDeleteOpen(false);
        showToast(t('my_business.deleted'), 'success');
        goBack(router);
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
        <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
          <View className="px-4 py-2 flex-row items-center">
            <Pressable onPress={() => goBack(router)} className="w-10 h-10 items-center justify-center">
              <ArrowLeft size={20} color={nc('#171717')} />
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
      <SafeAreaView edges={['top']} className="bg-card border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable onPress={() => goBack(router)} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={20} color={nc('#171717')} />
          </Pressable>
          <Text className="text-base font-bold text-neutral-900 flex-1" numberOfLines={1}>
            {biz.nama}
          </Text>
        </View>
      </SafeAreaView>

      <KeyboardSafeView
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
              className="absolute -bottom-6 left-5 w-16 h-16 rounded-2xl bg-card border-4 border-white overflow-hidden items-center justify-center"
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
                <ImageIcon size={20} color={nc('#737373')} />
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
            <View className="flex-row items-center gap-1.5 mb-2 self-end">
              <Eye size={13} color={nc('#737373')} />
              <Text className="text-xs text-neutral-500">
                {t('my_business.views', { n: biz.viewCount ?? 0 })}
              </Text>
            </View>
            <Text className="text-[10px] text-neutral-400 mb-4 leading-relaxed">
              {t('my_business.image_hint')}
            </Text>

            <Field label={t('my_business.nama_label') + ' *'}>
              <TextInput
                value={nama}
                onChangeText={setNama}
                maxLength={255}
                className="bg-card rounded-xl px-4 py-3 border border-neutral-200 text-base text-neutral-900"
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
                className="bg-card rounded-xl px-4 py-3 border border-neutral-200 text-base text-neutral-900 min-h-[80px]"
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
                        : 'bg-card border-neutral-200'
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
                className="bg-card rounded-xl px-4 py-3 border border-neutral-200 text-base text-neutral-900 mb-2"
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {INDUSTRI_SUGGESTIONS.map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => setIndustri(s)}
                      {...gx(`px-3 py-1.5 rounded-full ${
                        industri === s ? 'bg-brand-500' : 'bg-neutral-100'
                      }`)}
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
                    !isOnline ? 'bg-brand-50 border-brand-500' : 'bg-card border-neutral-200'
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
                    isOnline ? 'bg-brand-50 border-brand-500' : 'bg-card border-neutral-200'
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
                className="bg-card rounded-xl px-4 py-3 border border-neutral-200 text-base text-neutral-900"
              />
            </Field>

            <Field label={t('my_business.maps_label')}>
              <TextInput
                value={mapsUrl}
                onChangeText={setMapsUrl}
                placeholder="https://maps.app.goo.gl/…"
                autoCapitalize="none"
                keyboardType="url"
                maxLength={1000}
                className="bg-card rounded-xl px-4 py-3 border border-neutral-200 text-base text-neutral-900"
              />
              <Text className="text-[10px] text-neutral-400 mt-1">{t('my_business.maps_hint')}</Text>
            </Field>

            <Field label={t('my_business.website_label')}>
              <TextInput
                value={websiteUrl}
                onChangeText={setWebsiteUrl}
                placeholder="https://..."
                autoCapitalize="none"
                keyboardType="url"
                className="bg-card rounded-xl px-4 py-3 border border-neutral-200 text-base text-neutral-900"
              />
            </Field>

            <Field label={t('my_business.wa_admin_label')}>
              <TextInput
                value={waAdmin}
                onChangeText={setWaAdmin}
                placeholder="0812xxxxxxx"
                keyboardType="phone-pad"
                maxLength={20}
                className="bg-card rounded-xl px-4 py-3 border border-neutral-200 text-base text-neutral-900"
              />
              <Text className="text-[10px] text-neutral-400 mt-1">
                {t('my_business.wa_admin_hint')}
              </Text>
            </Field>

            <Field label={t('my_business.email_label')}>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="halo@usahaku.com"
                autoCapitalize="none"
                keyboardType="email-address"
                maxLength={255}
                className="bg-card rounded-xl px-4 py-3 border border-neutral-200 text-base text-neutral-900"
              />
            </Field>

            {/* Sosial media — cukup username (2.4.7) */}
            <Field label={t('my_business.social_label')}>
              <View className="bg-card rounded-2xl border border-neutral-100">
                {SOCIAL_PLATFORMS.map((p, idx) => (
                  <View
                    key={p.key}
                    className={`px-3 py-2 flex-row items-center gap-2 ${idx > 0 ? 'border-t border-neutral-100' : ''}`}
                  >
                    <BrandIcon glyph={SOCIAL_ICONS[p.key]} size={26} />
                    <Text className="w-[70px] text-xs font-semibold text-neutral-700">{p.label}</Text>
                    <Text className="text-xs text-neutral-400">@</Text>
                    <TextInput
                      value={socials[p.key] ?? ''}
                      onChangeText={(v) => setSocials((prev) => ({ ...prev, [p.key]: v }))}
                      onEndEditing={(e) =>
                        setSocials((prev) => ({ ...prev, [p.key]: cleanSocialUsername(e.nativeEvent.text) }))
                      }
                      placeholder={t('my_business.social_username_ph')}
                      autoCapitalize="none"
                      autoCorrect={false}
                      maxLength={100}
                      className="flex-1 py-1.5 text-sm text-neutral-900"
                    />
                  </View>
                ))}
              </View>
              <Text className="text-[10px] text-neutral-400 mt-1">
                {t('my_business.social_username_hint')}
              </Text>
            </Field>

            {/* Toko online (2.4.7) — link toko di marketplace, semua opsional */}
            <Field label={t('my_business.market_label')}>
              <View className="bg-card rounded-2xl border border-neutral-100">
                {MARKETPLACES.map((m, idx) => (
                  <View
                    key={m.key}
                    className={`px-3 py-2 flex-row items-center gap-2 ${idx > 0 ? 'border-t border-neutral-100' : ''}`}
                  >
                    <BrandIcon glyph={MARKET_ICONS[m.key]} size={26} shape="square" />
                    <TextInput
                      value={markets[m.key] ?? ''}
                      onChangeText={(v) => setMarkets((prev) => ({ ...prev, [m.key]: v }))}
                      placeholder={`${m.label} — ${m.placeholder}`}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="url"
                      maxLength={500}
                      className="flex-1 py-1.5 text-sm text-neutral-900"
                    />
                  </View>
                ))}
              </View>
              <Text className="text-[10px] text-neutral-400 mt-1">{t('my_business.market_hint')}</Text>
            </Field>

            {/* Katalog (2.4.7) */}
            <Pressable
              onPress={() => router.push(`/profile/businesses/katalog/${biz.id}` as never)}
              className="mb-4 bg-card rounded-2xl p-4 border border-neutral-100 flex-row items-center gap-3"
            >
              <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center">
                <ShoppingBag size={18} color="#EA580C" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-neutral-900">{t('katalog.manage_title')}</Text>
                <Text className="text-xs text-neutral-500 mt-0.5">{t('katalog.manage_sub')}</Text>
              </View>
              <ChevronRight size={16} color={nc('#A3A3A3')} />
            </Pressable>

            {/* Partner usaha (2.4.7) — hak sama dengan pemilik setelah menerima undangan */}
            <View className="mb-4">
              <View className="flex-row items-center mb-2">
                <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex-1">
                  {t('partner.section')}
                </Text>
                <Pressable
                  onPress={() => setInviteOpen(true)}
                  className="bg-brand-50 rounded-full px-2.5 py-1 flex-row items-center gap-1"
                >
                  <UserPlus size={11} color="#EA580C" />
                  <Text className="text-[11px] font-bold text-brand-600">{t('partner.invite')}</Text>
                </Pressable>
              </View>
              <View className="bg-card rounded-2xl border border-neutral-100">
                <View className="p-3 flex-row items-center gap-3">
                  <Avatar name={biz.owner.namaLengkap} fotoUrl={biz.owner.fotoUrl ?? undefined} size={34} />
                  <Text className="flex-1 text-sm font-semibold text-neutral-900" numberOfLines={1}>
                    {biz.owner.namaLengkap}
                  </Text>
                  <Text className="text-[11px] font-bold text-brand-600">{t('partner.role_owner')}</Text>
                </View>
                {(biz.partners ?? []).map((p) => (
                  <View key={p.id} className="p-3 flex-row items-center gap-3 border-t border-neutral-100">
                    <Avatar name={p.jemaat.namaLengkap} fotoUrl={p.jemaat.fotoUrl ?? undefined} size={34} />
                    <View className="flex-1 min-w-0">
                      <Text className="text-sm font-semibold text-neutral-900" numberOfLines={1}>
                        {p.jemaat.namaLengkap}
                      </Text>
                      <Text className={`text-[11px] ${p.status === 'PENDING' ? 'text-amber-600' : 'text-neutral-500'}`}>
                        {p.status === 'PENDING' ? t('partner.pending') : t('partner.badge')}
                      </Text>
                    </View>
                    {p.jemaat.id !== myJemaatId ? (
                      <Pressable
                        onPress={() => askRemovePartner(p.id, p.jemaat.namaLengkap, p.status)}
                        hitSlop={6}
                        className="w-7 h-7 rounded-full bg-red-50 items-center justify-center"
                      >
                        <X size={12} color="#DC2626" />
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </View>
              <Text className="text-[10px] text-neutral-400 mt-1">{t('partner.hint')}</Text>
              {biz.myRole === 'PARTNER' ? (
                <Pressable onPress={askLeave} className="self-start mt-2 px-3 py-1.5 rounded-full border border-red-200">
                  <Text className="text-xs font-semibold text-red-600">{t('partner.leave')}</Text>
                </Pressable>
              ) : null}
            </View>

            {/* PDF profile */}
            <Field label={t('my_business.pdf_label')}>
              {biz.companyProfileUrl ? (
                <View className="bg-card rounded-2xl p-4 border border-neutral-100 flex-row items-center gap-3">
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
                <Pressable
                  onPress={pickAndUploadPdf}
                  disabled={pdfUploadMutation.isPending}
                  className="bg-card rounded-2xl p-4 border border-dashed border-neutral-300 flex-row items-center gap-3"
                >
                  <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center">
                    {pdfUploadMutation.isPending ? (
                      <ActivityIndicator color="#EA580C" size="small" />
                    ) : (
                      <Upload size={18} color="#EA580C" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-neutral-900">
                      {pdfUploadMutation.isPending
                        ? t('my_business.pdf_uploading')
                        : t('my_business.pdf_upload_cta')}
                    </Text>
                    <Text className="text-xs text-neutral-500 mt-0.5">
                      {t('my_business.pdf_max_size')}
                    </Text>
                  </View>
                </Pressable>
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
                  <View className="w-5 h-5 rounded-full bg-card" />
                </View>
              </Pressable>
            </Field>

            {/* Delete */}
            <Pressable
              onPress={() => setConfirmDeleteOpen(true)}
              className="mt-4 mb-2 bg-card rounded-2xl p-4 border border-neutral-100 flex-row items-center gap-3"
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

        <SafeAreaView edges={['bottom']} className="bg-card border-t border-neutral-100">
          <View className="px-5 pt-3 pb-3">
            <Button
              label={t('common.save')}
              onPress={handleSave}
              loading={updateMutation.isPending}
              fullWidth
              size="lg"
            />
          </View>
        </SafeAreaView>
      </KeyboardSafeView>

      <JemaatSearchModal
        visible={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSubmit={invite}
        loading={inviteMut.isPending}
        title={t('partner.invite_title')}
      />

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
          <Pressable onPress={() => {}} className="bg-card rounded-2xl p-5 w-full max-w-sm">
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
