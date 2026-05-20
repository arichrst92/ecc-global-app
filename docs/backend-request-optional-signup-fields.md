# Backend Request: Make `tanggalLahir` & `alamat` Optional di `/auth/register`

**Untuk**: Tim Backend ECC (IDEA dev team)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-21
**Priority**: Low (mobile sudah workaround dengan placeholder values, tidak blocking)

## Konteks

Mobile signup form di-simplify ke **3 field saja** untuk minimize friction onboarding jemaat baru:
- Nama lengkap
- Jenis kelamin (L/P)
- Cabang gereja

Field yang dihapus dari UI mobile:
- ❌ Tanggal lahir — native date picker bermasalah, plus jemaat sering tidak hafal/tidak nyaman input saat signup
- ❌ Alamat — text bebas, jemaat sering skip atau isi asal saat signup

Decision (per user feedback 2026-05-21): user bisa lengkapi data tersebut **nanti** di Profile → Edit, setelah login. Lebih bagus user onboard cepat dan kembali kemudian, daripada drop di tengah signup karena friction form.

## Workaround mobile saat ini

Mobile kirim **placeholder values** ke `POST /auth/register`:

```typescript
{
  noHp: "+62...",
  namaLengkap: "...",
  jenisKelamin: "L" | "P",
  cabangId: "...",
  tanggalLahir: "2000-01-01",      // PLACEHOLDER
  alamat: "Belum diisi",            // PLACEHOLDER
}
```

Ini supaya BE validation tidak reject. User akan edit kedua field via `PATCH /admin/me` setelah login.

## Permintaan ke BE

**Make `tanggalLahir` & `alamat` optional** di endpoint `POST /auth/register` (mobile-api-guide section 12.1 Step 3).

### Spec yang diharapkan

```typescript
POST /auth/register
{
  noHp: string,           // required
  namaLengkap: string,    // required (min 2)
  jenisKelamin: 'L' | 'P', // required
  cabangId: string,       // required (UUID valid + active)
  tanggalLahir?: string,  // optional, ISO date — kalau tidak ada, BE simpan null
  alamat?: string,        // optional, kalau tidak ada, BE simpan null
  homecellId?: string | null,
  fotoBase64?: string,
}
```

### Schema database

Cek apakah column `Jemaat.tanggalLahir` dan `Jemaat.alamat` di Prisma schema sudah nullable. Kalau belum:
```prisma
model Jemaat {
  ...
  tanggalLahir DateTime?  // ← jadikan optional
  alamat       String?    // ← jadikan optional
  ...
}
```

Backfill jemaat existing yang punya placeholder dari mobile (rare case di awal): biarkan saja, atau set ke NULL via migration.

### Acceptance criteria

- [ ] `POST /auth/register` tidak reject kalau `tanggalLahir` atau `alamat` tidak dikirim
- [ ] Default value di DB: `NULL` untuk kedua field
- [ ] `PATCH /admin/me` tetap bisa update kedua field (sudah ada di section 12.2)
- [ ] `GET /admin/me` return `null` untuk field yang belum diisi (frontend handle dengan placeholder UI "Belum diisi")
- [ ] No breaking change untuk admin portal — bisa tetap input full data di `POST /admin/jemaat` admin endpoint

## Estimasi effort

Kecil. Zod schema update + Prisma migration kalau perlu. **~30 menit-1 jam BE**.

## Setelah endpoint optional

Mobile akan:
1. Hapus placeholder values di mutationFn `register()` call
2. Tetap kirim `namaLengkap`, `jenisKelamin`, `cabangId` saja
3. Profile screen (M6) tampil "Belum diisi" badge untuk field yang null + tombol "Edit Profil"
4. User isi via `PATCH /admin/me` kapan saja

---

*Mobile sudah jalan dengan workaround. Kalau BE selesai endpoint optional, mobile refactor 5-baris saja.*
