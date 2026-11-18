/**
 * Homecell Material (2026-11) — materi pertemuan dari Portal untuk Pastor zona,
 * Zone Leader, PIC homecell, dan Asisten. Server menentukan siapa yang boleh.
 */
import { api } from './client';

export type HomecellMaterialItem = {
  id: string;
  judul: string;
  keterangan: string | null;
  fileMime: string;
  fileName: string | null;
  fileSize: number;
  berlakuMulai: string; // YYYY-MM-DD
  berlakuSampai: string | null;
  /** Sudah pernah saya buka/unduh. */
  opened: boolean;
  /** Termasuk "Minggu ini". */
  isCurrent: boolean;
};

export type MyHomecellMaterials = {
  isLeader: boolean;
  roles: ('PASTOR' | 'ZONE_LEADER' | 'PIC' | 'ASISTEN')[];
  current: HomecellMaterialItem[];
  previous: HomecellMaterialItem[];
  /** Materi yang belum pernah saya buka. */
  newCount: number;
};

export const getMyHomecellMaterials = () => api.get<MyHomecellMaterials>('/admin/me/homecell-material');

/** Catat unduhan → URL file untuk dibuka. */
export const openHomecellMaterial = (id: string) =>
  api.post<{ fileUrl: string; fileName: string | null; fileMime: string }>(`/admin/me/homecell-material/${id}/open`, {});
