import { useQuery } from '@tanstack/react-query';
import { getFormCards, getFormDetail, getMyFormResponse, type FormSourceType } from '@/api/forms';
import { useAuthStore } from '@/stores/auth.store';

export const FORMS_KEY = ['forms'] as const;

/** Kartu formulir di halaman konten (kosong untuk tamu / bukan peserta). */
export function useFormCards(sourceType: FormSourceType, sourceId: string | null | undefined) {
  const isGuest = useAuthStore((s) => s.isGuest);
  return useQuery({
    queryKey: [...FORMS_KEY, 'cards', sourceType, sourceId],
    queryFn: () => getFormCards(sourceType, sourceId!),
    enabled: !!sourceId && !isGuest,
    staleTime: 30_000,
  });
}

export function useFormDetail(formId: string | undefined, src: string | undefined, subjek: string | null) {
  return useQuery({
    queryKey: [...FORMS_KEY, 'detail', formId, src, subjek],
    queryFn: () => getFormDetail(formId!, src!, subjek),
    enabled: !!formId && !!src,
  });
}

export function useMyFormResponse(rid: string | undefined) {
  return useQuery({ queryKey: [...FORMS_KEY, 'response', rid], queryFn: () => getMyFormResponse(rid!), enabled: !!rid });
}
