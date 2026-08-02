/**
 * React Query hooks untuk Group module. Per BE notice group-endpoints 2026-07-28.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  listGroups,
  getGroupDetail,
  getMyGroupMemberships,
  createGroup,
  updateGroup,
  dismissGroup,
  regenerateGroupCode,
  addGroupMember,
  removeGroupMember,
  joinGroup,
  joinGroupByCode,
  leaveGroup,
} from '@/api/group';
import type {
  ListGroupsParams,
  CreateGroupPayload,
  UpdateGroupPayload,
} from '@/types/group';

/** Query keys — dipakai untuk cache invalidation. */
export const GROUP_KEYS = {
  all: ['group'] as const,
  lists: () => [...GROUP_KEYS.all, 'list'] as const,
  list: (params: ListGroupsParams) => [...GROUP_KEYS.lists(), params] as const,
  detail: (id: string | undefined) => [...GROUP_KEYS.all, 'detail', id] as const,
  myMemberships: () => [...GROUP_KEYS.all, 'my-memberships'] as const,
};

// ============================================================
// Queries
// ============================================================

/** List groups dgn filter. */
export function useGroups(params: ListGroupsParams = {}) {
  return useQuery({
    queryKey: GROUP_KEYS.list(params),
    queryFn: () => listGroups(params),
    staleTime: 60_000,
  });
}

/** Detail group + members + children. */
export function useGroupDetail(groupId: string | undefined) {
  return useQuery({
    queryKey: GROUP_KEYS.detail(groupId),
    queryFn: () => getGroupDetail(groupId!),
    enabled: !!groupId,
    staleTime: 30_000,
  });
}

/** My groups (untuk tab My Groups di profile). */
export function useMyGroupMemberships() {
  return useQuery({
    queryKey: GROUP_KEYS.myMemberships(),
    queryFn: getMyGroupMemberships,
    staleTime: 60_000,
  });
}

// ============================================================
// Mutations — PIC actions
// ============================================================

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateGroupPayload) => createGroup(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROUP_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: GROUP_KEYS.myMemberships() });
    },
  });
}

export function useUpdateGroup(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateGroupPayload) => updateGroup(groupId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROUP_KEYS.detail(groupId) });
      queryClient.invalidateQueries({ queryKey: GROUP_KEYS.lists() });
    },
  });
}

export function useDismissGroup(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => dismissGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROUP_KEYS.all });
    },
  });
}

export function useRegenerateGroupCode(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => regenerateGroupCode(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROUP_KEYS.detail(groupId) });
    },
  });
}

export function useAddGroupMember(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ jemaatId, catatan }: { jemaatId: string; catatan?: string }) =>
      addGroupMember(groupId, jemaatId, catatan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROUP_KEYS.detail(groupId) });
    },
  });
}

export function useRemoveGroupMember(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jemaatId: string) => removeGroupMember(groupId, jemaatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROUP_KEYS.detail(groupId) });
    },
  });
}

// ============================================================
// Mutations — Self-service
// ============================================================

export function useJoinGroup(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => joinGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROUP_KEYS.detail(groupId) });
      queryClient.invalidateQueries({ queryKey: GROUP_KEYS.myMemberships() });
    },
  });
}

export function useJoinGroupByCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => joinGroupByCode(code),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: GROUP_KEYS.detail(data.groupId) });
      queryClient.invalidateQueries({ queryKey: GROUP_KEYS.myMemberships() });
      queryClient.invalidateQueries({ queryKey: GROUP_KEYS.lists() });
    },
  });
}

export function useLeaveGroup(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => leaveGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROUP_KEYS.detail(groupId) });
      queryClient.invalidateQueries({ queryKey: GROUP_KEYS.myMemberships() });
    },
  });
}
