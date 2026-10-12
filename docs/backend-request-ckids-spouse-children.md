# Backend Request — C-Kids: Anak Juga Terlihat dari Akun Pasangan

**Date**: 2026-10-12
**Requester**: Mobile team (Ari)
**Priority**: 🟠 MEDIUM — fitur C-Kids tidak lengkap di akun pasangan (ibu/ayah yang tidak menambahkan anak)
**Related**: `backend-request-ckids-me-endpoints.md` (2026-08-03), family-multi spouse-transitive (2026-08-31)

---

## Kasus Nyata

Ari menambahkan anak-anak + istri di daftar keluarga. Di akun **istri**:
- Anak-anak **muncul** di `/admin/me/family` → tab C-Kids menampilkan anak
- Tapi `GET /admin/me/children-points` → `[]` (saldo poin kosong)
- `GET /admin/me/children-redeem-history?jemaatId=X` → kemungkinan `403` (guard "anak requester via JemaatRelasi")
- Akibat di app v2.2.8: tombol "Tunjukkan QR ke Stall" error "tidak ada data anak" (sudah di-fix di mobile — QR sekarang ambil dari data keluarga)

## Penyebab

Per BE response 2026-08-03, kedua endpoint query:
```
JemaatRelasi WHERE jemaatIdA = self AND tipeRelasi.nama IN ('Anak', 'Anak Laki-Laki', 'Anak Perempuan')
```
Hanya relasi **langsung** dari requester. Anak yang terlihat lewat pasangan (spouse-transitive) tidak ikut — padahal `/peserta/mine-and-family` (event) sudah pakai family set **self + relasi langsung + spouse-transitive**.

## Request

Samakan definisi "anak saya" di endpoint C-Kids dengan family set event:

1. **`GET /admin/me/children-points`** — sertakan anak dari pasangan (spouse-transitive), dedupe per `anak.id`.
2. **`GET /admin/me/children-redeem-history`** — guard terima `jemaatId` anak dari family set yang sama (bukan hanya relasi langsung) → jangan 403 untuk pasangan.
3. (Opsional, konsistensi) `/admin/me/family` sudah mengembalikan anak untuk pasangan — pastikan `tipeRelasi` anak di row itu tetap "Anak…" supaya filter mobile (`role === 'CHILD'` atau nama mengandung "anak") menangkapnya.

Tidak ada perubahan shape response. Mobile tidak perlu ubah code — begitu BE deploy, saldo + riwayat langsung muncul di akun pasangan.

## Testing

```bash
# Login sebagai istri (yang TIDAK menambahkan anak)
curl -H "Authorization: Bearer $TOK_ISTRI" https://api.eccchurch.global/admin/me/children-points
# Expected: row anak-anak (sama dengan akun suami), bukan []

curl -H "Authorization: Bearer $TOK_ISTRI" \
  "https://api.eccchurch.global/admin/me/children-redeem-history?jemaatId=$ANAK_ID"
# Expected: 200 (bukan 403)
```

---

Reply via `docs/be-update-*.md` atau chat.
