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

---

## Backend Response — IMPLEMENTED & DEPLOYED 2026-10-11 (deploy dikonfirmasi Ari)

### #1 Mint — `POST /auth/web-action-token` ✅
Sesuai spec: body `{ purpose: "event-payment", eventId }` → `{ token, expiresIn: 600 }`.
- Terikat `jemaatId` (dari JWT) + `eventId` + `purpose`; sekali pakai; disimpan **SHA-256 hash** (raw token tidak pernah masuk DB).
- Rate limit 10/menit per user.
- `404 NOT_FOUND` kalau event tidak ada / belum published. `400 BAD_REQUEST` kalau event **GRATIS** (TETAP + BEBAS diizinkan).
- `400` (Zod) kalau `purpose` bukan `event-payment` atau `eventId` bukan UUID.

### #2 Exchange di web ✅
- `https://eccchurch.global/event/{eventId}/pembayaran?wt={token}` → middleware landing menukar token ke BE (`POST /web-action/exchange`), set cookie `ecc_wa` (httpOnly, Secure, SameSite=Lax, 30 menit), lalu **302 ke URL yang sama tanpa `?wt`** dengan `Referrer-Policy: no-referrer`.
- Token invalid / expired / sudah dipakai → halaman read-only + banner "Sesi kedaluwarsa, buka ulang dari Els App".
- Tanpa `wt` → read-only seperti sekarang.
- Exchange atomic (cegah race 2 tab): token kedua kali → `WEB_TOKEN_USED`.

### #3 Halaman web ber-session ✅
Kartu **Pendaftaran** muncul di bawah Info Pembayaran:
- "Masuk sebagai {nama}"
- Pilih peserta: diri sendiri + keluarga (dari `/admin/me/family`), yang sudah terdaftar ditandai ✓
- Nominal per orang untuk BEBAS (min `max(Rp 1.000, event.nominal)`)
- Upload bukti per peserta (status DAFTAR / MENUNGGU_VERIFIKASI) + status chip
- Batal tetap di app
- Tombol "Kembali ke Els App" tetap `ecc://payment-done`

Session web **bukan JWT penuh**: hanya diterima di `/web-action/*` dengan scope 1 jemaat + 1 event. Endpoint event dengan `eventId` lain → `403 WEB_SESSION_SCOPE`. Logic daftar/upload memakai handler existing (`/peserta/batch`, `/peserta/:id/bukti`, `/peserta/mine-and-family`, `/me/family`) jadi validasi, notif, dan audit identik dengan app.

### Perbaikan ikut ter-deliver (berdampak ke app juga)
- `POST /admin/event/:id/peserta/batch` sebelumnya **tidak mengecek keluarga** — user bisa mendaftarkan jemaat lain. Sekarang non-Fulltimer hanya boleh `jemaatIds` = diri sendiri + keluarga → selain itu `403`.
- Batch sebelumnya **tidak mengirim notif** `EVENT_REGISTERED`. Sekarang in-app notif + WA (kalau aktif) per peserta sukses, sama dengan endpoint single.

### Error codes baru
| Code | HTTP | Kapan |
|---|---|---|
| `WEB_TOKEN_INVALID` | 401 | token tidak dikenal |
| `WEB_TOKEN_EXPIRED` | 401 | lewat 10 menit |
| `WEB_TOKEN_USED` | 401 | sudah di-exchange |
| `WEB_SESSION_EXPIRED` | 401 | session web > 30 menit / tidak ada |
| `WEB_SESSION_SCOPE` | 403 | session dipakai untuk event lain |

### Catatan mobile
- Pakai `openAuthSessionAsync(url + '?wt=' + token, 'ecc://payment-done', { preferEphemeralSession: true })` — cookie tetap hidup selama browser session itu.
- Fallback tanpa `wt` kalau mint gagal sudah aman (read-only).

