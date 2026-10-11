# Backend Request — Web Action Token untuk Event NOMINAL_BEBAS (Daftar + Upload Bukti di Web)

**Date**: 2026-10-11
**Requester**: Mobile team (Ari)
**Priority**: 🔴 HIGH — flow event donasi sukarela (NOMINAL_BEBAS) saat ini buntu end-to-end
**Related**:
- `backend-request-event-payment-web-page.md` (Phase 1 delivered, Phase 2 di-skip — dokumen ini menghidupkan **Opsi A** dari section "Blocker")
- `mobile-update-2026-08-31-apple-compliance-final.md` (BEBAS = 100% external via web)
- `backend-notice-event-payment-back-to-app.md` (`ecc://payment-done` auto-dismiss)

---

## Masalah

Dua keputusan 2026-08-31 saling bertabrakan:

1. **Opsi C** — web `/event/{id}/pembayaran` hanya **display** rekening + QRIS. Daftar / upload bukti / batal tetap in-app.
2. **Apple 3.2.2(iv)** — untuk NOMINAL_BEBAS, layar daftar + upload bukti di app **di-gate ke web**.

Akibatnya untuk event BEBAS:
- App mengarahkan ke web → web tidak punya form daftar / upload, dan tidak tahu identitas user (session ephemeral, tanpa auth)
- User bisa transfer, tapi **tidak ada participation tercatat** → tidak ada tracker, admin tidak bisa mencocokkan transfer, peserta datang di hari H tanpa terdaftar

## Keputusan (Ari, 2026-10-11)

**Opsi A** — app minta **token sekali pakai berumur pendek**, web memakai token itu untuk bertindak atas nama jemaat **hanya untuk event tersebut**. Seluruh transaksi donasi (daftar + nominal + upload bukti) terjadi di web → patuh 3.2.2(iv).

---

## Request #1 — Endpoint Mint Token

```
POST /auth/web-action-token
Authorization: Bearer <accessToken>
Content-Type: application/json

{ "purpose": "event-payment", "eventId": "uuid" }
```

**Response 200:**
```json
{
  "success": true,
  "data": { "token": "opaque-random-string", "expiresIn": 600 }
}
```

**Aturan token:**
- Terikat ke `jemaatId` (dari JWT) + `eventId` + `purpose` — tidak bisa dipakai untuk event lain / aksi lain
- TTL pendek: **10 menit** untuk di-*exchange* (lihat #2)
- **Sekali pakai**: setelah di-exchange jadi session web, token tidak berlaku lagi
- Disimpan hashed di DB (seperti magic link token)
- Rate limit per jemaat (mis. 10/menit)
- Error: `404 NOT_FOUND` event tidak ada / tidak published; `400 BAD_REQUEST` purpose tidak dikenal atau event bukan NOMINAL_BEBAS (opsional — boleh juga izinkan TETAP)

## Request #2 — Web Exchange Token → Session

Mobile membuka:
```
https://eccchurch.global/event/{eventId}/pembayaran?wt={token}
```

Web SSR (server-side):
1. Exchange `wt` ke BE → dapat session web berumur **30 menit** (cookie `httpOnly`, `Secure`, `SameSite=Lax`), scope = jemaatId + eventId
2. **Redirect 302 ke URL yang sama tanpa `?wt=`** supaya token tidak tersisa di history / referrer
3. Header `Referrer-Policy: no-referrer` di halaman ini; jangan log query string `wt`

Kalau token invalid / expired / sudah dipakai → tampilkan mode **read-only** (seperti sekarang) + pesan "Sesi kedaluwarsa, buka ulang dari Els App" + tombol `ecc://payment-done`.

Kalau dibuka **tanpa** `wt` (mis. dari link share) → mode read-only seperti sekarang + tombol "Buka di Els App".

## Request #3 — Fitur Halaman Web (mode ber-session)

Menggunakan data dan endpoint yang sudah ada (web SSR memanggil BE atas nama jemaat session):

| Fitur | Endpoint existing |
|---|---|
| Info event + rekening + QRIS | `GET /public/event/{id}` |
| Daftar peserta keluarga (self + relasi) beserta status | `GET /admin/event/{id}/peserta/mine-and-family` + `GET /admin/me/family` |
| Daftar (pilih anggota keluarga + isi nominal, min Rp 1.000/orang — sama dengan validasi app) | `POST /admin/event/{id}/peserta/batch` |
| Upload bukti per peserta | `POST /admin/event/{id}/peserta/{participationId}/bukti` |
| Status per peserta (DAFTAR / MENUNGGU_VERIFIKASI / BAYAR / HADIR) | dari `mine-and-family` |

**Batal pendaftaran tetap di app** (tracker di detail event sudah support `self-cancel`) — tidak perlu di web.

Setelah daftar/upload sukses → tombol **"Kembali ke Els App"** → `ecc://payment-done` (sudah ada).

Notifikasi: `EVENT_REGISTERED` saat daftar, `EVENT_APPROVED` saat admin verifikasi — sama seperti flow in-app.

## Mobile Side (sudah disiapkan, menunggu #1)

- Sebelum membuka web, app memanggil `POST /auth/web-action-token`
- Kalau endpoint belum ada / gagal → app tetap membuka web **tanpa** `wt` (mode read-only seperti sekarang) — tidak ada regresi
- Setelah browser tertutup (`ecc://payment-done` atau user tutup manual) → app refresh detail event + tracker keluarga supaya status dari web langsung terlihat
- Tidak ada perubahan untuk GRATIS / NOMINAL_TETAP (tetap in-app)

## Testing

```bash
# 1. Mint token
curl -X POST -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" \
  https://api.eccchurch.global/auth/web-action-token \
  -d '{"purpose":"event-payment","eventId":"'$EVENT_ID'"}'
# → { token, expiresIn: 600 }

# 2. Buka https://eccchurch.global/event/$EVENT_ID/pembayaran?wt=$TOKEN
#    → 302 ke URL tanpa ?wt, cookie session ter-set, form daftar tampil

# 3. Pakai token yang sama lagi → mode read-only + pesan sesi kedaluwarsa
# 4. Token event A dipakai di URL event B → ditolak
```

End-to-end di HP: event BEBAS → "Lanjutkan" → web terbuka dalam keadaan login → daftar diri + 1 anggota keluarga dengan nominal → upload bukti → "Kembali ke Els App" → tracker di detail event menampilkan 2 peserta status MENUNGGU_VERIFIKASI → admin approve → BAYAR → scan hari H → HADIR.

---

Reply via `docs/be-update-*.md` atau chat.
