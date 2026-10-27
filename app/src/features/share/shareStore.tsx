/**
 * Share kartu gambar dari mana saja (termasuk dari dalam bottom sheet):
 * `openShareCard({...})` → satu <ShareCardHost /> di root layout yang
 * menampilkan ShareCardModal. Satu host = tidak ada Modal bertumpuk.
 */
import { create } from 'zustand';
import { useTranslation } from 'react-i18next';

import { ELS_APP_LINKS } from '@/utils/shareApp';
import { ShareCardModal } from './ShareCardModal';
import { AppShareCard, SongShareCard, VerseShareCard, type ShareTheme } from './cards';

export type SharePayload =
  | { kind: 'verse'; caption: string; text: string; reference: string; label: string }
  | { kind: 'song'; caption: string; title: string; subtitle: string; coverUrl: string | null }
  | { kind: 'album'; caption: string; title: string; subtitle: string; coverUrl: string | null; tracks: string[] }
  | { kind: 'app'; caption: string };

type State = { payload: SharePayload | null; open: (p: SharePayload) => void; close: () => void };

export const useShareCardStore = create<State>((set) => ({
  payload: null,
  open: (payload) => set({ payload }),
  close: () => set({ payload: null }),
}));

/** Buka sheet share. `delayMs` dipakai bila dipanggil sambil menutup Modal lain (iOS). */
export function openShareCard(p: SharePayload, delayMs = 0) {
  if (delayMs > 0) setTimeout(() => useShareCardStore.getState().open(p), delayMs);
  else useShareCardStore.getState().open(p);
}

export function ShareCardHost() {
  const { t } = useTranslation();
  const payload = useShareCardStore((s) => s.payload);
  const close = useShareCardStore((s) => s.close);
  const themes: ShareTheme[] = payload?.kind === 'verse' ? ['orange', 'dark'] : ['orange'];

  return (
    <ShareCardModal
      visible={!!payload}
      onClose={close}
      caption={payload?.caption ?? ''}
      themes={themes}
      renderCard={(theme) => {
        if (!payload) return null;
        switch (payload.kind) {
          case 'verse':
            return (
              <VerseShareCard theme={theme} text={payload.text} reference={payload.reference} label={payload.label} cta={t('sharecard.cta_bible')} />
            );
          case 'song':
            return (
              <SongShareCard label="ECC Worship" coverUrl={payload.coverUrl} title={payload.title} subtitle={payload.subtitle} cta={t('sharecard.cta_listen')} />
            );
          case 'album':
            return (
              <SongShareCard
                label={t('sharecard.label_album')}
                coverUrl={payload.coverUrl}
                title={payload.title}
                subtitle={payload.subtitle}
                tracks={payload.tracks}
                cta={t('sharecard.cta_listen')}
              />
            );
          case 'app':
            return <AppShareCard url={ELS_APP_LINKS.web} caption={t('sharecard.scan')} stores="App Store · Google Play" />;
        }
      }}
    />
  );
}
