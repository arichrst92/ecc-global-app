import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  listManagedHomecells,
  listManagedAreas,
  addHomecellMemberByKode,
  getHomecellDetail,
  removeHomecellMember,
  listAreaHomecells,
  getMyHomecellOverview,
  browseHomecells,
  getHomecellPublic,
  requestJoinHomecell,
  cancelJoinHomecell,
  listHomecellJoinRequests,
  approveHomecellJoin,
  rejectHomecellJoin,
  setHomecellLokasi,
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

// ============================================================
//  Homecell untuk semua jemaat
// ============================================================

const ME_HC_KEY = ['homecell', 'me'] as const;

/** Invalidate semua query homecell (overview, browse, detail, request). */
function useInvalidateHomecell() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['homecell'] });
}

export function useMyHomecellOverview() {
  return useQuery({ queryKey: [...ME_HC_KEY, 'overview'], queryFn: getMyHomecellOverview, staleTime: 60_000 });
}

export function useBrowseHomecells(
  params: { cabangId?: string | null; q?: string; lat?: number; lng?: number },
  enabled = true,
) {
  return useQuery({
    queryKey: [...ME_HC_KEY, 'browse', params.cabangId ?? null, params.q ?? '', params.lat ?? null, params.lng ?? null],
    queryFn: () => browseHomecells(params),
    enabled,
    staleTime: 60_000,
  });
}

export function useHomecellPublic(homecellId: string | undefined) {
  return useQuery({
    queryKey: [...ME_HC_KEY, 'detail', homecellId],
    queryFn: () => getHomecellPublic(homecellId!),
    enabled: !!homecellId,
    staleTime: 30_000,
  });
}

export function useRequestJoinHomecell() {
  const invalidate = useInvalidateHomecell();
  return useMutation({
    mutationFn: (v: { homecellId: string; pesan?: string }) => requestJoinHomecell(v.homecellId, v.pesan),
    onSuccess: invalidate,
  });
}

export function useCancelJoinHomecell() {
  const invalidate = useInvalidateHomecell();
  return useMutation({ mutationFn: (homecellId: string) => cancelJoinHomecell(homecellId), onSuccess: invalidate });
}

export function useHomecellJoinRequests(enabled = true) {
  return useQuery({
    queryKey: [...ME_HC_KEY, 'join-requests'],
    queryFn: listHomecellJoinRequests,
    enabled,
    staleTime: 30_000,
  });
}

export function useApproveHomecellJoin() {
  const invalidate = useInvalidateHomecell();
  return useMutation({ mutationFn: (requestId: string) => approveHomecellJoin(requestId), onSuccess: invalidate });
}

export function useRejectHomecellJoin() {
  const invalidate = useInvalidateHomecell();
  return useMutation({
    mutationFn: (v: { requestId: string; reason?: string }) => rejectHomecellJoin(v.requestId, v.reason),
    onSuccess: invalidate,
  });
}

export function useSetHomecellLokasi() {
  const invalidate = useInvalidateHomecell();
  return useMutation({
    mutationFn: (v: { homecellId: string; mapsUrl: string | null }) => setHomecellLokasi(v.homecellId, v.mapsUrl),
    onSuccess: invalidate,
  });
}
