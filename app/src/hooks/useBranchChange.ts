import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  listMyBranchChangeRequests,
  submitBranchChange,
} from '@/api/branch-change';
import type { SubmitBranchChangePayload } from '@/types/branch-change';

const BRANCH_CHANGE_QUERY_KEY = ['branch-change', 'my-list'] as const;

/** List riwayat permohonan pindah cabang user current */
export function useMyBranchChangeRequests() {
  return useQuery({
    queryKey: BRANCH_CHANGE_QUERY_KEY,
    queryFn: listMyBranchChangeRequests,
    staleTime: 60_000,
  });
}

/** Mutation: submit permohonan baru */
export function useSubmitBranchChange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitBranchChangePayload) => submitBranchChange(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BRANCH_CHANGE_QUERY_KEY });
    },
  });
}
