# BE Update: Pengaturan Privasi Data Pribadi

**Date**: 2026-10-17

## Endpoint

| Method | Path | Keterangan |
|---|---|---|
| GET | `/admin/me/privacy` | `{ settings, discoverableByPhone, fields, audiences, defaults }` |
| PUT | `/admin/me/privacy` | Body `{ settings?: { [field]: Audience[] }, discoverableByPhone?: boolean }` (partial, di-merge) |

- **Field:** `noHp`, `email`, `tanggalLahir`, `ulangTahun`, `alamat`, `pekerjaan`, `pernikahan`, `keluarga`.
- **Audience** (centang banyak): `KELUARGA`, `HOMECELL`, `AREA`, `GROUP`, `PELAYANAN`, `CABANG`, `SEMUA`. Array kosong berarti hanya saya.
- **Default:**

| Field | Default |
|---|---|
| noHp | keluarga, homecell, area, group, pelayanan |
| email | keluarga |
| tanggalLahir | keluarga, homecell |
| ulangTahun | keluarga, homecell, area, group, pelayanan, cabang |
| alamat, pekerjaan, pernikahan, keluarga | keluarga, homecell |

- **Selalu boleh lihat semua:** diri sendiri, PIC homecell / PIC area dari homecell jemaat itu, dan admin portal (endpoint admin).

## Yang terdampak

- **`GET /admin/jemaat-public/:id`:**
  - `noHp`, `noHpMasked`, `email`, `tanggalLahir`, `ulangTahunBulanTgl`, `alamat`, `pekerjaan`, `pernikahan`, dan `family` bernilai `null` kalau tidak diizinkan.
  - `visibility.reason` sekarang bisa `self` atau `pastoral`.
  - `visibility.relations` berisi daftar relasi viewer ke target.
- **`GET /admin/jemaat-public/search`:** jemaat dengan `discoverableByPhone=false` hanya muncul kalau cocok dengan nama atau kode, dan `noHpMasked` = `null`.
- **`GET /admin/group/:id`:** `noHp` PIC dan anggota mengikuti privasi. Admin di portal (tanpa `X-Client: mobile`) tetap melihat semua.
- **`GET /admin/me/homecell/:id`:** `picJemaat.noHp` mengikuti privasi PIC.

## Mobile

- **Halaman Privasi:** `app/settings/privacy.tsx`, dibuka dari menu **Privasi** di Profil → Pengaturan.
- **Profil jemaat:** `app/jemaat/[id].tsx` sekarang juga menampilkan email, pekerjaan, dan pernikahan kalau diizinkan.

## Update audit (2026-10-17)

- **Selalu boleh lihat semua (tambahan):** orang tua → anak, wali → tanggungan, dan pengundang → tamunya.
- **Endpoint yang ikut di-gate:**
  - `GET /admin/me/family`: `noHp` dan `tanggalLahir` anggota keluarga dewasa.
  - `/admin/me/visits`: `lawan.noHp`.
  - `GET /admin/homecell/:id` (halaman PIC): `noHp` anggota dan PIC. PIC homecell/area tetap melihat semua.
- **Check-in tidak terganggu:**
  - `GET /admin/jemaat-public/search?purpose=checkin` tetap bisa mencari lewat no HP untuk petugas (fulltimer, petugas scan ibadah/event, PIC homecell/area).
  - Dipakai oleh `JemaatSearchModal purpose="checkin"` di scanner ibadah, scanner event, dan absensi homecell.
  - Scan QR, check-in, dan checkout tetap memakai kode jemaat, sehingga tidak terpengaruh privasi.
- **Sengaja tidak di-gate:**
  - Permintaan bergabung homecell, group, atau pelayanan: pemohon membagikan kontaknya ke PIC/leader.
  - Hasil scan untuk petugas.
