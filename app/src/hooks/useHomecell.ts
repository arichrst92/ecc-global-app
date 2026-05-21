import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  listManagedHomecells,
  listManagedAreas,
  addHomecellMemberByKode,
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

/** Mutation: add homecell member via QR kode */
export function useAddHomecellMember(homecellId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (kode: string) => addHomecellMemberByKode(homecellId, kode),
    onSuccess: () => {
      // Invalidate managed homecells supaya memberCount update
      queryClient.invalidateQueries({ queryKey: HOMECELL_LIST_KEY });
    },
  });
}
