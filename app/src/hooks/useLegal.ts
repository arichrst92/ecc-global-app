import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { getLegalDocument } from '@/api/legal';
import type { LegalKey } from '@/types/legal';

/**
 * Fetch legal document. Auto-detect language dari i18n current language.
 * Cache 1 jam — BE versioned by `version` field, mobile cache mostly safe.
 */
export function useLegalDocument(key: LegalKey) {
  const { i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'id';
  return useQuery({
    queryKey: ['legal', key, lang],
    queryFn: () => getLegalDocument(key, lang),
    staleTime: 60 * 60_000, // 1 jam
  });
}
