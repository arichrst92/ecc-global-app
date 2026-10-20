/** ECC Worship — /admin/me/worship */
import { api } from './client';

export type WorshipMode = 'VOKAL' | 'KARAOKE';

export type SyncLine = { t: number; line: string };

export type WorshipSong = {
  id: string;
  albumId: string;
  judul: string;
  ciptaan: string | null;
  tahun: number | null;
  lirik: string | null;
  lirikSinkron: SyncLine[] | null;
  durasi: number | null;
  hasKaraoke: boolean;
  karaokeDurasi: number | null;
  audioSize: number | null;
  karaokeSize: number | null;
  audioExt?: 'mp3' | 'm4a';
  karaokeExt?: 'mp3' | 'm4a';
  draft: boolean;
  updatedAt: string;
};

export type WorshipAlbum = {
  id: string;
  tipe: 'ALBUM' | 'SINGLE';
  judul: string;
  tahun: number | null;
  deskripsi: string | null;
  coverUrl: string | null;
  draft: boolean;
  songs: WorshipSong[];
};

export type WorshipLibrary = {
  canPreview: boolean;
  albums: WorshipAlbum[];
  singles: WorshipAlbum[];
  popular: { songId: string; plays: number }[];
  favorites: string[];
};

export const getWorshipSummary = () => api.get<{ hasSongs: boolean; canPreview: boolean }>('/admin/me/worship/summary');
export const getWorshipLibrary = () => api.get<WorshipLibrary>('/admin/me/worship/library');
export const getWorshipPlayUrl = (songId: string, mode: WorshipMode) =>
  api.get<{ url: string; expiresAt: string }>(`/admin/me/worship/songs/${songId}/play-url?mode=${mode}`);
export const reportWorshipPlayed = (songId: string, mode: WorshipMode) =>
  api.post<unknown>(`/admin/me/worship/songs/${songId}/played`, { mode });
export const reportWorshipDownloaded = (songId: string, mode: WorshipMode) =>
  api.post<unknown>(`/admin/me/worship/songs/${songId}/downloaded`, { mode });
export const addWorshipFavorite = (songId: string) => api.post<unknown>(`/admin/me/worship/favorites/${songId}`);
export const removeWorshipFavorite = (songId: string) => api.delete<unknown>(`/admin/me/worship/favorites/${songId}`);

/** Lagu + info album (untuk antrian & tampilan). */
export type WorshipTrack = WorshipSong & {
  albumJudul: string;
  albumTipe: 'ALBUM' | 'SINGLE';
  coverUrl: string | null;
};

export function tracksOf(album: WorshipAlbum): WorshipTrack[] {
  return album.songs.map((s) => ({ ...s, albumJudul: album.judul, albumTipe: album.tipe, coverUrl: album.coverUrl }));
}

export function allTracks(lib: WorshipLibrary | undefined): WorshipTrack[] {
  if (!lib) return [];
  return [...lib.albums, ...lib.singles].flatMap(tracksOf);
}

export const fmtDur = (sec: number | null | undefined) => {
  if (!sec || !Number.isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  return `${m}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
};

export const shareUrlOf = (songId: string) => `https://eccchurch.global/worship/${songId}`;
