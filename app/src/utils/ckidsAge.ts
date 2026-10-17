/**
 * Batas usia CKids: anak 13 tahun ke bawah (belum ulang tahun ke-14).
 * Tanggal lahir kosong → hanya dianggap anak kalau tanggungan (tanpa no HP);
 * anggota keluarga dewasa umumnya punya akun & no HP sendiri.
 */
export const CKIDS_MAX_AGE = 13;

/** Usia dalam tahun penuh per `now` (null kalau tanggal tidak valid). */
export function ageInYears(tanggalLahir: string | null | undefined, now: Date = new Date()): number | null {
  if (!tanggalLahir) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(tanggalLahir);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  let age = now.getFullYear() - y;
  const cm = now.getMonth() + 1;
  if (cm < mo || (cm === mo && now.getDate() < d)) age--;
  return age;
}

export function isCkidsAge(
  jemaat: { tanggalLahir?: string | null; isDependent?: boolean },
  now: Date = new Date(),
): boolean {
  const age = ageInYears(jemaat.tanggalLahir, now);
  if (age === null) return !!jemaat.isDependent;
  return age >= 0 && age <= CKIDS_MAX_AGE;
}
