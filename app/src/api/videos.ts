/** Video Channel (2.5.1) — /public/videos (universal, sama dengan website). */
import { api } from './client';

export type VideoItem = {
  id: string;
  youtubeId: string;
  judul: string;
  deskripsi: string | null;
  kategori: { id: string; nama: string } | null;
  channelNama: string | null;
  isFeatured: boolean;
  thumbnailUrl: string;
  tayangAt: string;
};
export type VideoCatalog = { kategori: { id: string; nama: string }[]; featured: VideoItem[]; videos: VideoItem[]; total: number };
export type VideoDetail = VideoItem & { related: VideoItem[] };

export const getVideoCatalog = () => api.get<VideoCatalog>('/public/videos');
export const getVideo = (id: string) => api.get<VideoDetail>(`/public/videos/${id}`);
