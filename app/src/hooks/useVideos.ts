import { useQuery } from '@tanstack/react-query';
import { getVideo, getVideoCatalog } from '@/api/videos';

export const VIDEO_CATALOG_KEY = ['videos', 'catalog'] as const;

export function useVideoCatalog() {
  return useQuery({ queryKey: VIDEO_CATALOG_KEY, queryFn: getVideoCatalog, staleTime: 5 * 60_000 });
}

export function useVideo(id: string | undefined) {
  return useQuery({ queryKey: ['videos', 'detail', id], queryFn: () => getVideo(id!), enabled: !!id });
}
