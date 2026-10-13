# BE Update: Syarat Role untuk Event dan Role Otomatis untuk Peserta

**Date**: 2026-10-13
**From**: BE
**Untuk**: Tim Mobile

## Ringkasan

Admin sekarang bisa mengatur dua hal di setiap event:

1. **Syarat pendaftaran**: jemaat hanya boleh mendaftar kalau punya role aktif (Role / Sub-Role / Status) yang cocok dengan **salah satu** syarat. Sub-role atau status yang dikosongkan berarti semua. Event tanpa syarat tetap terbuka untuk semua jemaat.
2. **Role yang diberikan**: peserta otomatis mendapat role tertentu.
   - Event dengan absensi (`butuhKehadiran = true`): role diberikan **saat peserta di-scan HADIR**.
   - Event tanpa absensi: role diberikan **saat mendaftar**.
   - Kalau peserta **batal** (atau partisipasinya dihapus), role yang diberikan event ini **diakhiri** otomatis.

## Perubahan respons: `GET /admin/event/:idOrSlug`

Ada field tambahan (bersifat menambah, jadi tidak mengganggu client lama):

```jsonc
{
  "requirementLabels": ["Jemaat → Jemaat Tetap → Aktif", "Pelayan → semua sub-role"],
  "myEligible": false,          // true = boleh daftar, false = belum memenuhi syarat, null = tidak diketahui
  "grantLabel": "Jemaat → Jemaat Tetap → Sudah Baptis", // null kalau event tidak memberi role
  "roleRequirements": [ /* detail mentah: roleId, subRoleId, subRoleStatusId + nama */ ]
}
```

Saran UI di layar detail event:

- Kalau `requirementLabels` tidak kosong, tampilkan "Syarat peserta: …".
- Kalau `myEligible === false`, nonaktifkan tombol Daftar dan tampilkan info "Anda belum memenuhi syarat event ini".
- Kalau `grantLabel` ada, boleh tampilkan "Peserta akan mendapat: …".

## Error baru saat mendaftar

`POST /admin/event/:id/peserta` (dan pembuatan partisipasi otomatis lewat donasi) mengembalikan:

```jsonc
// HTTP 403
{
  "success": false,
  "error": {
    "code": "NOT_ELIGIBLE",
    "message": "Anda belum memenuhi syarat event ini. Dibutuhkan salah satu role: Jemaat → Jemaat Tetap → Aktif.",
    "details": { "requirements": ["Jemaat → Jemaat Tetap → Aktif"] }
  }
}
```

`POST /admin/event/:id/peserta/batch` (pendaftaran keluarga): anggota yang tidak memenuhi syarat masuk ke array `failed` dengan `error.code = "NOT_ELIGIBLE"`. Anggota lain tetap berhasil didaftarkan.

Tampilkan `error.message` apa adanya, karena isinya sudah berupa kalimat untuk pengguna.

## Yang tidak berubah

- Endpoint publik / guest (`/public/event`) tidak berubah.
- Alur bayar, upload bukti, dan check-in tetap sama. Pemberian role terjadi otomatis di backend.
