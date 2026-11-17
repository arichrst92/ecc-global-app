/** Catatan saya (2.4.5) — catatan khotbah PRIBADI — /admin/me/catatan */
import { api } from './client';

export type Catatan = {
  id: string;
  judul: string;
  isi: string;
  ayat: string[];
  pengkhotbah: string | null;
  /** YYYY-MM-DD */
  tanggal: string;
  ibadahId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CatatanInput = {
  judul: string;
  isi: string;
  ayat: string[];
  pengkhotbah?: string | null;
  tanggal?: string | null;
  ibadahId?: string | null;
};

export const CATATAN_KEY = ['catatan'] as const;
const B = '/admin/me/catatan';

export const listCatatan = (cursor?: string | null, q?: string) => {
  const p = new URLSearchParams();
  if (cursor) p.set('cursor', cursor);
  if (q?.trim()) p.set('q', q.trim());
  const qs = p.toString();
  return api.get<{ items: Catatan[]; nextCursor: string | null }>(`${B}${qs ? `?${qs}` : ''}`);
};
export const getCatatan = (id: string) => api.get<Catatan>(`${B}/${id}`);
export const createCatatan = (input: CatatanInput) => api.post<Catatan>(B, input);
export const updateCatatan = (id: string, input: Partial<CatatanInput>) => api.patch<Catatan>(`${B}/${id}`, input);
export const deleteCatatan = (id: string) => api.delete<void>(`${B}/${id}`);

/** Unggah gambar catatan (2.4.9) → URL untuk disisipkan sebagai `![gambar](url)`. */
export function uploadCatatanImage(file: { uri: string; name: string; type: string; file?: Blob }) {
  const fd = new FormData();
  if (file.file) fd.append('foto', file.file, file.name);
  // @ts-expect-error RN FormData menerima objek file { uri, name, type }
  else fd.append('foto', { uri: file.uri, name: file.name, type: file.type });
  return api.upload<{ url: string }>(`${B}/gambar`, fd);
}
