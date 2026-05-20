/**
 * Cabang ECC — hardcoded sementara karena BE belum expose public list endpoint
 * (tidak ada GET /cabang publik). Update saat endpoint tersedia.
 *
 * UUID harus match dengan BE database. Sementara pakai placeholder ID — saat
 * connect ke staging API, ganti dengan UUID asli dari `GET /admin/cabang`
 * (perlu auth — bisa dipakai untuk M2+ saat user sudah login).
 *
 * TODO M2: cache list cabang setelah first login, fetch via /admin/cabang.
 */
export const BRANCHES = [
  { id: 'jkt', nama: 'ECC Jakarta', kota: 'Jakarta', alamat: 'Jl. Sudirman No.1, Jakarta Pusat' },
  { id: 'bdg', nama: 'ECC Bandung', kota: 'Bandung', alamat: 'Jl. Asia Afrika No.15, Bandung' },
  { id: 'sby', nama: 'ECC Surabaya', kota: 'Surabaya', alamat: 'Jl. Tunjungan No.22, Surabaya' },
  { id: 'mdn', nama: 'ECC Medan', kota: 'Medan', alamat: 'Jl. Diponegoro No.8, Medan' },
  { id: 'smg', nama: 'ECC Semarang', kota: 'Semarang', alamat: 'Jl. Pemuda No.40, Semarang' },
  { id: 'dps', nama: 'ECC Denpasar', kota: 'Denpasar', alamat: 'Jl. Teuku Umar No.10, Denpasar' },
] as const;
