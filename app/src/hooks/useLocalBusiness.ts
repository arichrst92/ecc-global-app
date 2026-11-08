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
  listMyItems,
  createItem,
  updateItem,
  deleteItem,
  reorderItems,
  uploadItemFoto,
  deleteItemFoto,
  type FileObj,
  listBusinessInvitations,
  respondBusinessInvitation,
  invitePartner,
  removePartner,
  leaveBusiness,
} from '@/api/businesses';
import {
  getLocalMarketDetail,
  listLocalMarket,
} from '@/api/localMarket';
import type {
  LocalItemPayload,
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
      // Gabung (respon PATCH tidak memuat partners/myRole).
      qc.setQueryData(['businesses', 'mine', 'detail', id], (old: object | undefined) => ({ ...(old ?? {}), ...updated }));
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
    mutationFn: (file: FileObj) =>
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
    mutationFn: (file: FileObj) =>
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
    mutationFn: (file: FileObj) =>
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

// ===== 2.4.7 — Katalog item (pemilik) =====
const itemsKey = (bizId: string) => ['businesses', 'mine', 'items', bizId] as const;

export function useMyItems(bizId: string | undefined) {
  return useQuery({
    queryKey: itemsKey(bizId ?? ''),
    queryFn: () => listMyItems(bizId!),
    enabled: !!bizId,
    staleTime: 15_000,
  });
}

function useItemInvalidate(bizId: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: itemsKey(bizId) });
    qc.invalidateQueries({ queryKey: ['local-market', 'detail', bizId] });
  };
}

export function useSaveItem(bizId: string) {
  const inv = useItemInvalidate(bizId);
  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId?: string; payload: LocalItemPayload }) =>
      itemId ? updateItem(bizId, itemId, payload) : createItem(bizId, payload),
    onSuccess: inv,
  });
}

export function useToggleItem(bizId: string) {
  const inv = useItemInvalidate(bizId);
  return useMutation({
    mutationFn: ({ itemId, isActive }: { itemId: string; isActive: boolean }) =>
      updateItem(bizId, itemId, { isActive }),
    onSuccess: inv,
  });
}

export function useDeleteItem(bizId: string) {
  const inv = useItemInvalidate(bizId);
  return useMutation({ mutationFn: (itemId: string) => deleteItem(bizId, itemId), onSuccess: inv });
}

export function useReorderItems(bizId: string) {
  const inv = useItemInvalidate(bizId);
  return useMutation({ mutationFn: (ids: string[]) => reorderItems(bizId, ids), onSuccess: inv });
}

export function useUploadItemFoto(bizId: string) {
  const inv = useItemInvalidate(bizId);
  return useMutation({
    mutationFn: ({ itemId, file }: { itemId: string; file: FileObj }) =>
      uploadItemFoto(bizId, itemId, file),
    onSuccess: inv,
  });
}

export function useDeleteItemFoto(bizId: string) {
  const inv = useItemInvalidate(bizId);
  return useMutation({
    mutationFn: ({ itemId, url }: { itemId: string; url: string }) => deleteItemFoto(bizId, itemId, url),
    onSuccess: inv,
  });
}

// ===== Partner usaha (2.4.7) =====
const INV_KEY = ['businesses', 'invitations'] as const;

export function useBusinessInvitations() {
  return useQuery({ queryKey: INV_KEY, queryFn: listBusinessInvitations, staleTime: 30_000 });
}

export function useRespondInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) => respondBusinessInvitation(id, accept),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INV_KEY });
      qc.invalidateQueries({ queryKey: MY_BIZ_KEY });
    },
  });
}

function usePartnerInvalidate(bizId: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['businesses', 'mine', 'detail', bizId] });
    qc.invalidateQueries({ queryKey: ['local-market', 'detail', bizId] });
    qc.invalidateQueries({ queryKey: MY_BIZ_KEY });
  };
}

export function useInvitePartner(bizId: string) {
  const inv = usePartnerInvalidate(bizId);
  return useMutation({ mutationFn: (kode: string) => invitePartner(bizId, kode), onSuccess: inv });
}

export function useRemovePartner(bizId: string) {
  const inv = usePartnerInvalidate(bizId);
  return useMutation({ mutationFn: (partnerId: string) => removePartner(bizId, partnerId), onSuccess: inv });
}

export function useLeaveBusiness(bizId: string) {
  const inv = usePartnerInvalidate(bizId);
  return useMutation({ mutationFn: () => leaveBusiness(bizId), onSuccess: inv });
}
