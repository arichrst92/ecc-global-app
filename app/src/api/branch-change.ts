/**
 * Branch Change Request API — mobile-api-guide section 14.
 * User submit request → admin approve di portal → Jemaat.cabangId updated.
 */

import { api } from './client';
import type {
  BranchChangeRequest,
  SubmitBranchChangePayload,
} from '@/types/branch-change';

/** POST /admin/me/branch-change-request — submit permohonan baru */
export function submitBranchChange(payload: SubmitBranchChangePayload) {
  return api.post<BranchChangeRequest>('/admin/me/branch-change-request', payload);
}

/** GET /admin/me/branch-change-requests — list riwayat permohonan user */
export function listMyBranchChangeRequests() {
  return api.get<BranchChangeRequest[]>('/admin/me/branch-change-requests');
}
