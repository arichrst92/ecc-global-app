import { useQuery } from '@tanstack/react-query';

import { getMinistryDetail, listMinistries } from '@/api/ministry';

/** List semua ministry — cache 5 menit. */
export function useMinistryList() {
  return useQuery({
    queryKey: ['ministry', 'list'],
    queryFn: listMinistries,
    staleTime: 5 * 60_000,
  });
}

/** Detail ministry + members. */
export function useMinistryDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['ministry', 'detail', id],
    queryFn: () => getMinistryDetail(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}
