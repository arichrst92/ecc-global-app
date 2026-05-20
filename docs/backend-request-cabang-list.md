# Backend Request: Public Cabang List Endpoint

**Untuk**: Tim Backend ECC (IDEA dev team)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-20
**Priority**: Medium (M1.9 blocker untuk full feature, ada workaround)

## Problem statement

Mobile app butuh list cabang ECC untuk ditampilkan saat **sign-up** (user pilih cabang home). Endpoint `GET /admin/cabang` butuh `Authorization: Bearer <JWT>` — tapi saat signup, user **belum** authenticated, jadi tidak bisa pakai.

Workaround saat ini: cabang list di-hardcode di `app/src/constants/branches.ts` dengan 6 cabang (Jakarta, Bandung, Surabaya, Medan, Semarang, Denpasar). Ini bermasalah karena:

1. Cabang baru (mis. ECC Surabaya soft launch Juni 2026 per news mockup) tidak akan muncul sampai mobile app rilis update + user update.
2. UUID cabang harus match dengan database BE — kalau tidak match, register fail dengan `BAD_REQUEST: cabangId tidak valid`.
3. Tidak skalabel kalau ECC ekspansi ke 20+ cabang.

## Permintaan endpoint

```
GET /auth/cabang?isActive=true
```

**Auth**: Public, rate-limited per IP.

**Query params**:
- `isActive` (opsional, default `true`) — filter aktif/nonaktif

**Response 200**:
```json
{
  "success": true,
  "data": [
    {
      "id": "11111111-1111-1111-1111-111111111111",
      "nama": "ECC Jakarta",
      "kode": "JKT",
      "kota": "Jakarta",
      "alamat": "Jl. Sudirman No.1, Jakarta Pusat",
      "isActive": true
    },
    {
      "id": "22222222-2222-2222-2222-222222222222",
      "nama": "ECC Bandung",
      "kode": "BDG",
      "kota": "Bandung",
      "alamat": "Jl. Asia Afrika No.15, Bandung",
      "isActive": true
    }
  ]
}
```

**Catatan field**:
- Cukup return field yang relevant untuk user-facing picker (id, nama, kode, kota, alamat). **Jangan return** field sensitif (mis. PIC contact, jumlah jemaat detail).
- `kode` (3-letter) opsional untuk display short name di future UI.

## Rate limiting

| Endpoint | Limit |
|---|---|
| `GET /auth/cabang` | **30 per menit per IP** |

Rasional: cabang list jarang berubah (mungkin 1-2 cabang baru per tahun). Mobile cache 24 jam, fetch saat first launch atau pull-to-refresh.

## Mobile implementation plan

Setelah endpoint live:

1. Cache di `expo-secure-store` dengan key `ecc.branches` + timestamp.
2. Saat splash / app launch:
   - Cache hit + age < 24 jam → pakai cache
   - Cache miss / expired → fetch `GET /auth/cabang` → save cache
3. Picker di signup pakai cache (instant load).
4. Background refresh saat user buka Settings (untuk admin yang sering add cabang).

## Acceptance criteria

- [ ] Endpoint `GET /auth/cabang` accessible tanpa auth
- [ ] Response struktur sesuai spec di atas
- [ ] Rate limit 30/menit/IP enforced
- [ ] Hanya return cabang dengan `isActive=true` by default
- [ ] Cabang nonaktif tidak boleh dipilih saat register (BE validate juga di `/auth/register`)
- [ ] Field set: id, nama, kode, kota, alamat, isActive — no sensitive data

## Estimasi effort

Endpoint kecil. Sebagian besar logika sudah ada di `GET /admin/cabang` — tinggal:
- Buat route public di `/auth/*` (tier endpoint berbeda)
- Whitelist field public
- Apply rate limit middleware

Estimasi: **0.5-1 hari kerja** untuk BE.

## Workaround sampai endpoint live

Mobile lanjut pakai hardcoded list di `src/constants/branches.ts`. Saat endpoint tersedia, refactor di **1 file** saja (fetch dari API, ganti import statement). UI tidak perlu berubah.

## Catatan untuk Phase 2+

Kalau nanti ada fitur public lain yang butuh data pre-auth (mis. ibadah list untuk visitor / guest mode), bisa pakai pattern yang sama: tier `/auth/*` untuk public read-only catalog data.

Endpoint potensial future:
- `GET /auth/cabang/:id` — detail cabang publik (alamat, kontak utk visitor)
- `GET /auth/cabang/:id/ibadah` — schedule ibadah cabang (untuk visitor info)
- `GET /auth/renungan/today` — renungan hari ini (untuk public sharing tanpa login)

Tapi tidak urgent untuk M1.

---

*Saat endpoint live, paste link Swagger di sini dan close ticket ini.*
