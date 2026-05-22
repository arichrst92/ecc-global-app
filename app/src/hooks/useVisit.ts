import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  createVisit,
  deleteVisit,
  getVisitDetail,
  listMyVisits,
  updateVisitMeta,
  updateVisitNote,
} from '@/api/visit';
import type {
  CreateVisitPayload,
  UpdateVisitMetaPayload,
  UpdateVisitNotePayload,
  VisitListQuery,
} from '@/types/visit';

const VISIT_LIST_KEY = ['visit', 'list'] as const;
const PAGE_LIMIT = 20;

/**
 * Infinite scroll list visit saya — filter by role/dateRange/search.
 * Pagination otomatis via fetchNextPage.
 */
export function useMyVisits(filter: Omit<VisitListQuery, 'page' | 'limit'> = {}) {
  return useInfiniteQuery({
    queryKey: [...VISIT_LIST_KEY, filter],
    queryFn: ({ pageParam = 1 }) =>
      listMyVisits({ ...filter, page: pageParam, limit: PAGE_LIMIT }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.meta;
      return page < totalPages ? page + 1 : undefined;
    },
    staleTime: 60_000,
  });
}

/** Detail visit. */
export function useVisitDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['visit', 'detail', id],
    queryFn: () => getVisitDetail(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}

/** Create visit via QR scan. */
export function useCreateVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateVisitPayload) => createVisit(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: VISIT_LIST_KEY });
    },
  });
}

/** Update judul / lokasi (initiator-only). */
export function useUpdateVisitMeta(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateVisitMetaPayload) => updateVisitMeta(id, payload),
    onSuccess: (updated) => {
      qc.setQueryData(['visit', 'detail', id], updated);
      qc.invalidateQueries({ queryKey: VISIT_LIST_KEY });
    },
  });
}

/** Update own note (kedua belah pihak). */
export function useUpdateVisitNote(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateVisitNotePayload) => updateVisitNote(id, payload),
    onSuccess: (updated) => {
      qc.setQueryData(['visit', 'detail', id], updated);
      qc.invalidateQueries({ queryKey: VISIT_LIST_KEY });
    },
  });
}

/** Cancel visit (initiator-only, < 1 jam). */
export function useDeleteVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteVisit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: VISIT_LIST_KEY });
    },
  });
}
