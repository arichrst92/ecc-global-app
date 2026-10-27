/**
 * Sheet "Bagikan" dengan kartu gambar 1080×1080.
 *
 *  - Bagikan gambar  → menu share bawaan HP (Instagram Story/Feed, WhatsApp,
 *                      Telegram, Facebook, X, dll). Teks + link disalin ke
 *                      clipboard dulu supaya bisa ditempel sebagai keterangan.
 *  - Simpan ke galeri
 *  - Bagikan teks & link (cara lama)
 *
 * Modul native (react-native-view-shot, expo-sharing, expo-media-library)
 * dimuat saat tombol ditekan. Kalau belum ada di build / di web, sheet otomatis
 * hanya menawarkan "Bagikan teks & link" — app tidak boleh crash karena share.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, Share, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Download, ImageIcon, Link2, X } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

import { reportError } from '@/services/errorReporting';
import { nc } from '@/theme/ThemeRoot';
import { CardCtx, type ShareTheme } from './cards';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Teks + link — ikut di "Bagikan teks" dan disalin saat bagikan gambar. */
  caption: string;
  renderCard: (theme: ShareTheme) => ReactNode;
  /** Tema yang boleh dipilih (default: tanpa pilihan, tema pertama). */
  themes?: ShareTheme[];
};

async function loadNative() {
  if (Platform.OS === 'web') return null;
  try {
    const [shot, sharing] = await Promise.all([import('react-native-view-shot'), import('expo-sharing')]);
    if (!(await sharing.isAvailableAsync())) return null;
    return { captureRef: shot.captureRef, sharing };
  } catch {
    return null;
  }
}

export function ShareCardModal({ visible, onClose, caption, renderCard, themes = ['orange'] }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // Pesan di dalam sheet (toast global tertutup Modal di iOS).
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const cardRef = useRef<View>(null);
  const [theme, setTheme] = useState<ShareTheme>(themes[0] ?? 'orange');
  const [pending, setPending] = useState(0);
  const [busy, setBusy] = useState<null | 'share' | 'save'>(null);
  const [imageOk, setImageOk] = useState<boolean | null>(null);
  const size = Math.min(320, width - 48);

  useEffect(() => {
    if (!visible) return;
    setMsg(null);
    setTheme(themes[0] ?? 'orange');
    let alive = true;
    loadNative().then((n) => alive && setImageOk(!!n));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const ctx = useMemo(
    () => ({ size, onImgStart: () => setPending((p) => p + 1), onImgEnd: () => setPending((p) => Math.max(0, p - 1)) }),
    [size],
  );
  const ready = pending === 0 && !busy;

  async function capture(): Promise<string | null> {
    const n = await loadNative();
    if (!n || !cardRef.current) return null;
    return n.captureRef(cardRef, { format: 'png', quality: 1, width: 1080, height: 1080, result: 'tmpfile' });
  }

  async function shareImage() {
    setBusy('share');
    try {
      await Clipboard.setStringAsync(caption).catch(() => {});
      const uri = await capture();
      const n = await loadNative();
      if (!uri || !n) throw new Error('share-unavailable');
      setMsg({ text: t('sharecard.caption_copied') });
      await n.sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: t('sharecard.title') });
    } catch (e) {
      reportError(e, { source: 'share-card', action: 'share' });
      setMsg({ text: t('sharecard.failed'), error: true });
    } finally {
      setBusy(null);
    }
  }

  async function saveImage() {
    setBusy('save');
    try {
      const ML = await import('expo-media-library');
      const perm = await ML.requestPermissionsAsync(true);
      if (!perm.granted) {
        setMsg({ text: t('sharecard.perm_denied'), error: true });
        return;
      }
      const uri = await capture();
      if (!uri) throw new Error('capture-unavailable');
      await ML.saveToLibraryAsync(uri);
      setMsg({ text: t('sharecard.saved') });
    } catch (e) {
      reportError(e, { source: 'share-card', action: 'save' });
      setMsg({ text: t('sharecard.failed'), error: true });
    } finally {
      setBusy(null);
    }
  }

  async function shareText() {
    try {
      await Share.share({ message: caption });
    } catch {
      /* dibatalkan */
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50" onPress={onClose} />
      <View className="bg-card rounded-t-3xl px-5 pt-4" style={{ paddingBottom: insets.bottom + 16 }}>
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-base font-bold text-neutral-900">{t('sharecard.title')}</Text>
          <Pressable onPress={onClose} className="w-9 h-9 items-center justify-center" accessibilityLabel={t('common.close')}>
            <X size={20} color={nc('#525252')} />
          </Pressable>
        </View>

        {imageOk !== false ? (
          <View className="items-center">
            {/* collapsable={false}: Android wajib punya view native nyata untuk di-capture */}
            <View ref={cardRef} collapsable={false} style={{ borderRadius: 12, overflow: 'hidden' }}>
              <CardCtx.Provider value={ctx}>{renderCard(theme)}</CardCtx.Provider>
            </View>
            {themes.length > 1 ? (
              <View className="flex-row gap-2 mt-3">
                {themes.map((th) => (
                  <Pressable
                    key={th}
                    onPress={() => setTheme(th)}
                    className={`px-3 py-1.5 rounded-full border ${theme === th ? 'bg-brand-500 border-brand-500' : 'bg-card border-neutral-200'}`}
                  >
                    <Text className={`text-xs font-semibold ${theme === th ? 'text-white' : 'text-neutral-700'}`}>{t(`sharecard.theme_${th}`)}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        <View className="gap-2 mt-4">
          {imageOk ? (
            <>
              <Pressable
                onPress={shareImage}
                disabled={!ready}
                className={`flex-row items-center justify-center gap-2 py-3.5 rounded-2xl ${ready ? 'bg-brand-500' : 'bg-neutral-200'}`}
              >
                {busy === 'share' || pending > 0 ? <ActivityIndicator color="#fff" /> : <ImageIcon size={18} color="#fff" />}
                <Text className="text-sm font-bold text-white">{t('sharecard.share_image')}</Text>
              </Pressable>
              <Pressable
                onPress={saveImage}
                disabled={!ready}
                className="flex-row items-center justify-center gap-2 py-3 rounded-2xl border border-neutral-200 bg-card"
              >
                {busy === 'save' ? <ActivityIndicator color="#F97316" /> : <Download size={17} color="#EA580C" />}
                <Text className="text-sm font-semibold text-neutral-800">{t('sharecard.save')}</Text>
              </Pressable>
            </>
          ) : imageOk === null ? (
            <ActivityIndicator color="#F97316" />
          ) : null}
          {msg ? (
            <Text className={`text-xs text-center ${msg.error ? 'text-red-600' : 'text-neutral-500'}`}>{msg.text}</Text>
          ) : null}
          <Pressable onPress={shareText} className="flex-row items-center justify-center gap-2 py-3 rounded-2xl border border-neutral-200 bg-card">
            <Link2 size={17} color="#EA580C" />
            <Text className="text-sm font-semibold text-neutral-800">{t('sharecard.share_text')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
