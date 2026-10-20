/** ECC Worship — query & mutasi. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addWorshipFavorite,
  getWorshipLibrary,
  getWorshipSummary,
  removeWorshipFavorite,
  type WorshipLibrary,
} from '@/api/worship';
import { useAuthStore } from '@/stores/auth.store';

export const WORSHIP_LIBRARY_KEY = ['worship', 'library'] as const;

export function useWorshipSummary() {
  const isGuest = useAuthStore((s) => s.isGuest);
  return useQuery({
    queryKey: ['worship', 'summary'],
    queryFn: getWorshipSummary,
    enabled: !isGuest,
    staleTime: 5 * 60_000,
  });
}

export function useWorshipLibrary() {
  return useQuery({
    queryKey: WORSHIP_LIBRARY_KEY,
    queryFn: getWorshipLibrary,
    staleTime: 60_000,
    refetchOnMount: 'always',
  });
}

/** Suka / batal suka (optimistik). */
export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ songId, like }: { songId: string; like: boolean }) =>
      like ? addWorshipFavorite(songId) : removeWorshipFavorite(songId),
    onMutate: async ({ songId, like }) => {
      await qc.cancelQueries({ queryKey: WORSHIP_LIBRARY_KEY });
      const prev = qc.getQueryData<WorshipLibrary>(WORSHIP_LIBRARY_KEY);
      if (prev) {
        const favorites = like ? [songId, ...prev.favorites.filter((x) => x !== songId)] : prev.favorites.filter((x) => x !== songId);
        qc.setQueryData<WorshipLibrary>(WORSHIP_LIBRARY_KEY, { ...prev, favorites });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(WORSHIP_LIBRARY_KEY, ctx.prev);
    },
  });
}
