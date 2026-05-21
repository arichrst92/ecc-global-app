import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  listManagedHomecells,
  listManagedAreas,
  addHomecellMemberByKode,
  getHomecellDetail,
  removeHomecellMember,
  listAreaHomecells,
} from '@/api/homecell';

const HOMECELL_LIST_KEY = ['homecell', 'managed'] as const;
const AREA_LIST_KEY = ['homecell', 'area-managed'] as const;

/** List homecell user as PIC */
export function useManagedHomecells() {
  return useQuery({
    queryKey: HOMECELL_LIST_KEY,
    queryFn: listManagedHomecells,
    staleTime: 5 * 60_000,
  });
}

/** List area user as PIC */
export function useManagedAreas() {
  return useQuery({
    queryKey: AREA_LIST_KEY,
    queryFn: listManagedAreas,
    staleTime: 5 * 60_000,
  });
}

/** Homecell detail dengan nested members. Per BE patch 21p. */
export function useHomecellDetail(homecellId: string | undefined) {
  return useQuery({
    queryKey: ['homecell', 'detail', homecellId],
    queryFn: () => getHomecellDetail(homecellId!),
    enabled: !!homecellId,
    staleTime: 60_000,
  });
}

/** List semua homecell di area dengan PIC info. Per BE patch 21p. */
export function useAreaHomecells(areaId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['homecell', 'area', areaId, 'homecells'],
    queryFn: () => listAreaHomecells(areaId!),
    enabled: !!areaId && enabled,
    staleTime: 60_000,
  });
}

/** Mutation: add homecell member via QR kode */
export function useAddHomecellMember(homecellId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (kode: string) => addHomecellMemberByKode(homecellId, kode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOMECELL_LIST_KEY });
      queryClient.invalidateQueries({ queryKey: ['homecell', 'detail', homecellId] });
    },
  });
}

/** Mutation: remove homecell member (soft delete) */
export function useRemoveHomecellMember(homecellId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jemaatId: string) => removeHomecellMember(homecellId, jemaatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOMECELL_LIST_KEY });
      queryClient.invalidateQueries({ queryKey: ['homecell', 'detail', homecellId] });
    },
  });
}
