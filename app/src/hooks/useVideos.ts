import { useQuery } from '@tanstack/react-query';
import { getVideo, getVideoCatalog, getVideoSummary } from '@/api/videos';

export const VIDEO_CATALOG_KEY = ['videos', 'catalog'] as const;

export function useVideoCatalog() {
  return useQuery({ queryKey: VIDEO_CATALOG_KEY, queryFn: getVideoCatalog, staleTime: 5 * 60_000 });
}

/** Hanya jumlah video (tile Media di Beranda) — tidak memuat seluruh katalog. */
export function useVideoSummary() {
  return useQuery({ queryKey: ['videos', 'summary'], queryFn: getVideoSummary, staleTime: 10 * 60_000 });
}

export function useVideo(id: string | undefined) {
  return useQuery({ queryKey: ['videos', 'detail', id], queryFn: () => getVideo(id!), enabled: !!id });
}
