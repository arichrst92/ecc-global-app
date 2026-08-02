/**
 * Group API — module 23. Per BE notice group-endpoints 2026-07-28.
 * 12 endpoint total: 3 CRUD + 3 self-service + 3 PIC member actions + 3 utility.
 */

import { api } from './client';
import type {
  Group,
  GroupDetail,
  GroupMembership,
  ListGroupsParams,
  ListGroupsResponse,
  CreateGroupPayload,
  UpdateGroupPayload,
  AddMemberResponse,
  JoinByCodeResponse,
  RegenerateCodeResponse,
} from '@/types/group';

// ============================================================
// 📋 List & Detail
// ============================================================

/**
 * GET /admin/group — list group dgn filter + pagination.
 * Private group otomatis hidden dari non-member/non-PIC/non-admin.
 *
 * Response envelope: `{ data: Group[], meta: {...} }` — meta include pagination
 * info. api.get unwrap envelope, jadi kita perlu shape khusus untuk list.
 */
export async function listGroups(params: ListGroupsParams = {}): Promise<ListGroupsResponse> {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', String(params.page));
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.sortBy) search.set('sortBy', params.sortBy);
  if (params.sortOrder) search.set('sortOrder', params.sortOrder);
  if (params.search) search.set('search', params.search);
  if (params.cabangId) search.set('cabangId', params.cabangId);
  if (params.jenis) search.set('jenis', params.jenis);
  if (params.parentId) search.set('parentId', params.parentId);

  const qs = search.toString();
  const path = qs ? `/admin/group?${qs}` : '/admin/group';

  // api.get unwrap `data` field, tapi meta pagination ada di outer envelope.
  // Kita panggil raw + parse manual supaya dapat meta.
  // NOTE: api.get sudah unwrap — tapi list endpoints return {data: T[], meta}
  //       (paginated shape). Kita treat data sebagai Group[] + append meta manual
  //       via separate call kalau butuh. Simpler: cukup return data array,
  //       infinite scroll pakai `hasMore` derived dari length < limit.
  //
  // Actually api client sudah return `body.data`. Untuk paginated, `body.data`
  // adalah Group[] tanpa meta info. Meta di-strip.
  // Untuk sekarang, cukup return Group[] + assume caller handle pagination
  // via check length. Kalau nanti butuh total, extend api client.
  const items = await api.get<Group[]>(path);
  // Wrap ke ListGroupsResponse dgn meta defaults — infinite scroll pakai
  // length check (kalau length < limit → tidak ada page berikutnya).
  const limit = params.limit ?? 20;
  return {
    data: items,
    meta: {
      page: params.page ?? 1,
      limit,
      total: items.length, // best effort — real total di-strip oleh api client
      totalPages: items.length < limit ? params.page ?? 1 : (params.page ?? 1) + 1,
    },
  };
}

/**
 * GET /admin/group/:id — detail group + members + children.
 * Access denied (404) kalau private group + requester bukan member/PIC/admin.
 */
export function getGroupDetail(groupId: string) {
  return api.get<GroupDetail>(`/admin/group/${groupId}`);
}

/**
 * GET /admin/me/group-membership — list group yg current jemaat ikut.
 * Filter isActive=true untuk membership DAN group. Sorted tanggalBergabung desc BE-side.
 */
export function getMyGroupMemberships() {
  return api.get<GroupMembership[]>('/admin/me/group-membership');
}

// ============================================================
// ➕ Create / Update / Dismiss (PIC + admin)
// ============================================================

/** POST /admin/group — any authenticated jemaat can create. */
export function createGroup(payload: CreateGroupPayload) {
  return api.post<Group>('/admin/group', payload);
}

/** PATCH /admin/group/:id — PIC atau isFulltimer only. 403 kalau bukan. */
export function updateGroup(groupId: string, payload: UpdateGroupPayload) {
  return api.patch<Group>(`/admin/group/${groupId}`, payload);
}

/**
 * DELETE /admin/group/:id — soft dismiss (isActive=false).
 * Trigger notif WA ke semua active member.
 */
export function dismissGroup(groupId: string) {
  return api.delete<{ id: string; nama: string; isActive: boolean }>(
    `/admin/group/${groupId}`,
  );
}

/**
 * POST /admin/group/:id/regenerate-code — rotate joinCode.
 * Private group only. 400 kalau public.
 */
export function regenerateGroupCode(groupId: string) {
  return api.post<RegenerateCodeResponse>(
    `/admin/group/${groupId}/regenerate-code`,
    {},
  );
}

// ============================================================
// 👥 Membership actions (PIC + admin)
// ============================================================

/**
 * POST /admin/group/:id/members/:jemaatId — PIC add member direct.
 * Trigger notif WA. Idempotent (reactivate kalau ex-member).
 */
export function addGroupMember(
  groupId: string,
  jemaatId: string,
  catatan?: string,
) {
  return api.post<AddMemberResponse>(
    `/admin/group/${groupId}/members/${jemaatId}`,
    catatan ? { catatan } : {},
  );
}

/**
 * DELETE /admin/group/:id/members/:jemaatId — PIC remove member.
 * Soft delete + trigger notif WA. Idempotent.
 */
export function removeGroupMember(groupId: string, jemaatId: string) {
  return api.delete<{ alreadyRemoved?: boolean }>(
    `/admin/group/${groupId}/members/${jemaatId}`,
  );
}

// ============================================================
// 🚪 Self-service
// ============================================================

/**
 * POST /admin/group/:id/join — self-join public group.
 * Errors: 403 kalau private ("Gunakan kode invitation"), 404 group tidak ada.
 */
export function joinGroup(groupId: string) {
  return api.post<{ alreadyMember?: boolean }>(
    `/admin/group/${groupId}/join`,
    {},
  );
}

/**
 * POST /admin/group/join-by-code — join private group via kode invitation.
 * Body: { code: "A3F7K9M2" }. Idempotent.
 * Errors: 404 kalau kode invalid / expired / group dismissed.
 */
export function joinGroupByCode(code: string) {
  return api.post<JoinByCodeResponse>('/admin/group/join-by-code', { code });
}

/** DELETE /admin/group/:id/leave — self leave (voluntary). Idempotent. */
export function leaveGroup(groupId: string) {
  return api.delete<{ alreadyRemoved?: boolean }>(
    `/admin/group/${groupId}/leave`,
  );
}
