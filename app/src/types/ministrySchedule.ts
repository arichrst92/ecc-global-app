// Ministry Schedule / Roster types — mobile-side per
// `docs/backend-request-ministry-schedule-roster.md` (2026-09-02).
//
// BE endpoints belum di-deploy saat file ini dibuat. Types di sini
// merepresentasikan response shape yang di-spec-kan; hooks (lihat
// `useMinistry.ts`) gracefully fallback ke [] kalau BE balas 404.

/** Satu assignment (jemaat + posisi) dalam sebuah schedule/roster entry. */
export type ScheduleAssignment = {
  id: string;
  jemaatId: string;
  jemaatNama: string;
  jemaatFotoUrl: string | null;
  posisi: string;
  posisiLevel: number;
  notes: string | null;
};

/** Dari GET /admin/ministry/:id/schedule — satu occurrence ibadah + assignments. */
export type MinistrySchedule = {
  id: string;
  tanggal: string; // "YYYY-MM-DD"
  ibadahId: string | null;
  ibadahNama: string;
  ibadahJamMulai: string; // "HH:mm"
  ibadahLokasi: string;
  assignments: ScheduleAssignment[];
};

/** Dari GET /admin/me/ministry-schedule — assignment cross-ministry untuk current user. */
export type MyMinistryAssignment = {
  id: string;
  tanggal: string;
  ibadahNama: string;
  ibadahJamMulai: string;
  ibadahLokasi: string;
  ministryId: string;
  ministryNama: string;
  posisi: string;
  notes: string | null;
  coServants: Array<{ jemaatId: string; namaLengkap: string; posisi: string }>;
};
