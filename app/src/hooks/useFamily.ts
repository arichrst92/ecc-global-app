import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  listFamily,
  linkByKode,
  linkByPhone,
  linkById,
  registerNewFamily,
  updateFamilyRelation,
  unlinkFamily,
  getFamilyRequests,
  approveFamilyRequest,
  rejectFamilyRequest,
  cancelFamilyRequest,
} from '@/api/family';
import { useAuthStore } from '@/stores/auth.store';
import type {
  LinkByKodePayload,
  LinkByPhonePayload,
  LinkByIdPayload,
} from '@/types/family';

const FAMILY_QUERY_KEY = ['family', 'list'] as const;
export const FAMILY_REQ_KEY = ['family', 'requests'] as const;

/** List family members current user. Guest mode → hook disabled (endpoint
 *  require auth, hindari 401 spam untuk guest yang buka /family screen). */
export function useMyFamily() {
  const isGuest = useAuthStore((s) => s.isGuest);
  return useQuery({
    queryKey: FAMILY_QUERY_KEY,
    queryFn: listFamily,
    enabled: !isGuest,
    staleTime: 5 * 60_000,
  });
}

/** Mutation: link via kode (QR scan) */
export function useLinkByKode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: LinkByKodePayload) => linkByKode(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FAMILY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: FAMILY_REQ_KEY });
    },
  });
}

/** Mutation: link via no HP */
/** Mutation: link hasil pencarian nama / email / no HP (2.4.6) */
export function useLinkById() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: LinkByIdPayload) => linkById(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FAMILY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: FAMILY_REQ_KEY });
    },
  });
}

export function useLinkByPhone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: LinkByPhonePayload) => linkByPhone(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FAMILY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: FAMILY_REQ_KEY });
    },
  });
}

/** Mutation: register new dependent (anak balita / lansia tanpa HP) */
export function useRegisterNewFamily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: registerNewFamily,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FAMILY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: FAMILY_REQ_KEY });
    },
  });
}

/** Mutation: update relation via granular tipeRelasiId (recommended) */
export function useUpdateFamilyRelation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      jemaatId: string;
      payload: import('@/types/family').UpdateFamilyRelationPayload;
    }) => updateFamilyRelation(args.jemaatId, args.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FAMILY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: FAMILY_REQ_KEY });
    },
  });
}

/** Mutation: unlink */
export function useUnlinkFamily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jemaatId: string) => unlinkFamily(jemaatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FAMILY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: FAMILY_REQ_KEY });
    },
  });
}

/** Permintaan hubungan keluarga masuk & keluar (2.4.7). */
export function useFamilyRequests() {
  const isGuest = useAuthStore((s) => s.isGuest);
  return useQuery({ queryKey: FAMILY_REQ_KEY, queryFn: getFamilyRequests, enabled: !isGuest, staleTime: 30_000 });
}

export function useFamilyRequestAction() {
  const qc = useQueryClient();
  const done = () => {
    void qc.invalidateQueries({ queryKey: FAMILY_REQ_KEY });
    void qc.invalidateQueries({ queryKey: FAMILY_QUERY_KEY });
  };
  return {
    approve: useMutation({ mutationFn: (id: string) => approveFamilyRequest(id), onSuccess: done }),
    reject: useMutation({ mutationFn: (v: { id: string; reason?: string }) => rejectFamilyRequest(v.id, v.reason), onSuccess: done }),
    cancel: useMutation({ mutationFn: (id: string) => cancelFamilyRequest(id), onSuccess: done }),
  };
}
