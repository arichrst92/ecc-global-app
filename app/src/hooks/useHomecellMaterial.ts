import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';

import { getMyHomecellMaterials, openHomecellMaterial } from '@/api/homecellMaterial';
import { env } from '@/config/env';
import { useAuthStore } from '@/stores/auth.store';

export const HOMECELL_MATERIAL_KEY = ['homecell-material'] as const;

/** Materi homecell untuk pemimpin (isLeader=false → jangan tampilkan apa pun). */
export function useMyHomecellMaterials() {
  const isGuest = useAuthStore((s) => s.isGuest);
  return useQuery({
    queryKey: HOMECELL_MATERIAL_KEY,
    queryFn: getMyHomecellMaterials,
    enabled: !isGuest,
    staleTime: 5 * 60_000,
  });
}

const fileHref = (u: string) => (u.startsWith('http') ? u : `${env.apiBaseUrl}${u}`);

/** Buka materi di browser bawaan (PDF/Office tampil, bisa disimpan / dibagikan dari sana). */
export function useOpenHomecellMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const r = await openHomecellMaterial(id);
      await WebBrowser.openBrowserAsync(fileHref(r.fileUrl));
      return r;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: HOMECELL_MATERIAL_KEY }),
  });
}
