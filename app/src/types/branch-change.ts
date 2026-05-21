// Branch Change Request types per mobile-api-guide section 14

export type BranchChangeStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type BranchChangeRequest = {
  id: string;
  jemaatId?: string;
  currentCabangId: string;
  targetCabangId: string;
  reason: string;
  status: BranchChangeStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type SubmitBranchChangePayload = {
  targetCabangId: string;
  reason: string;
};
