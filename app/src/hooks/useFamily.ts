import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  listFamily,
  linkByKode,
  linkByPhone,
  registerNewFamily,
  updateFamilyRelation,
  updateFamilyRole,
  unlinkFamily,
} from '@/api/family';
import { useAuthStore } from '@/stores/auth.store';
import type {
  FamilyRole,
  LinkByKodePayload,
  LinkByPhonePayload,
} from '@/types/family';

const FAMILY_QUERY_KEY = ['family', 'list'] as const;

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
    },
  });
}

/** Mutation: link via no HP */
export function useLinkByPhone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: LinkByPhonePayload) => linkByPhone(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FAMILY_QUERY_KEY });
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
    },
  });
}

/** Mutation: update role (legacy broad enum) */
export function useUpdateFamilyRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { jemaatId: string; role: FamilyRole }) =>
      updateFamilyRole(args.jemaatId, args.role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FAMILY_QUERY_KEY });
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
    },
  });
}
