import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  createBusiness,
  deleteBusiness,
  deleteBusinessHero,
  deleteBusinessLogo,
  deleteBusinessProfilePdf,
  getMyBusiness,
  listMyBusinesses,
  updateBusiness,
  uploadBusinessHero,
  uploadBusinessLogo,
  uploadBusinessProfilePdf,
} from '@/api/businesses';
import {
  getLocalMarketDetail,
  listLocalMarket,
} from '@/api/localMarket';
import type {
  CreateBusinessPayload,
  LocalMarketQuery,
  UpdateBusinessPayload,
} from '@/types/localBusiness';

const MY_BIZ_KEY = ['businesses', 'mine'] as const;
const MARKET_KEY = ['local-market', 'list'] as const;
const PAGE_LIMIT = 20;

/** List bisnis saya — semua, termasuk nonaktif */
export function useMyBusinesses() {
  return useQuery({
    queryKey: MY_BIZ_KEY,
    queryFn: listMyBusinesses,
    staleTime: 60_000,
  });
}

/** Owner detail */
export function useMyBusinessDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['businesses', 'mine', 'detail', id],
    queryFn: () => getMyBusiness(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}

/** Create business */
export function useCreateBusiness() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBusinessPayload) => createBusiness(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MY_BIZ_KEY });
    },
  });
}

/** Update business */
export function useUpdateBusiness(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateBusinessPayload) => updateBusiness(id, payload),
    onSuccess: (updated) => {
      qc.setQueryData(['businesses', 'mine', 'detail', id], updated);
      qc.invalidateQueries({ queryKey: MY_BIZ_KEY });
      qc.invalidateQueries({ queryKey: MARKET_KEY });
    },
  });
}

/** Delete business */
export function useDeleteBusiness() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBusiness(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MY_BIZ_KEY });
      qc.invalidateQueries({ queryKey: MARKET_KEY });
    },
  });
}

/** Upload helpers — invalidate detail on success */
export function useUploadBusinessHero(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: { uri: string; name: string; type: string }) =>
      uploadBusinessHero(id, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['businesses', 'mine', 'detail', id] });
      qc.invalidateQueries({ queryKey: MY_BIZ_KEY });
    },
  });
}

export function useDeleteBusinessHero(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => deleteBusinessHero(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['businesses', 'mine', 'detail', id] });
      qc.invalidateQueries({ queryKey: MY_BIZ_KEY });
    },
  });
}

export function useUploadBusinessLogo(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: { uri: string; name: string; type: string }) =>
      uploadBusinessLogo(id, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['businesses', 'mine', 'detail', id] });
      qc.invalidateQueries({ queryKey: MY_BIZ_KEY });
    },
  });
}

export function useDeleteBusinessLogo(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => deleteBusinessLogo(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['businesses', 'mine', 'detail', id] });
      qc.invalidateQueries({ queryKey: MY_BIZ_KEY });
    },
  });
}

export function useUploadBusinessPdf(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: { uri: string; name: string; type: string }) =>
      uploadBusinessProfilePdf(id, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['businesses', 'mine', 'detail', id] });
      qc.invalidateQueries({ queryKey: MY_BIZ_KEY });
    },
  });
}

export function useDeleteBusinessPdf(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => deleteBusinessProfilePdf(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['businesses', 'mine', 'detail', id] });
      qc.invalidateQueries({ queryKey: MY_BIZ_KEY });
    },
  });
}

/** Public browse — infinite scroll */
export function useLocalMarket(filter: Omit<LocalMarketQuery, 'page' | 'limit'> = {}) {
  return useInfiniteQuery({
    queryKey: [...MARKET_KEY, filter],
    queryFn: ({ pageParam = 1 }) =>
      listLocalMarket({ ...filter, page: pageParam, limit: PAGE_LIMIT }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.meta;
      return page < totalPages ? page + 1 : undefined;
    },
    staleTime: 60_000,
  });
}

/** Public detail */
export function useLocalMarketDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['local-market', 'detail', id],
    queryFn: () => getLocalMarketDetail(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}
