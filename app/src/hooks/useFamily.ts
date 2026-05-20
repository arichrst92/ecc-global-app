import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  listFamily,
  linkByKode,
  linkByPhone,
  registerNewFamily,
  updateFamilyRole,
  unlinkFamily,
} from '@/api/family';
import type { FamilyRole } from '@/types/family';

const FAMILY_QUERY_KEY = ['family', 'list'] as const;

/** List family members current user */
export function useMyFamily() {
  return useQuery({
    queryKey: FAMILY_QUERY_KEY,
    queryFn: listFamily,
    staleTime: 5 * 60_000,
  });
}

/** Mutation: link via kode (QR scan) */
export function useLinkByKode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { kode: string; role: FamilyRole }) => linkByKode(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FAMILY_QUERY_KEY });
    },
  });
}

/** Mutation: link via no HP */
export function useLinkByPhone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { noHp: string; role: FamilyRole }) => linkByPhone(payload),
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

/** Mutation: update role */
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
