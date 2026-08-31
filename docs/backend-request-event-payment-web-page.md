# Backend/Web Request — Event Payment Web Page + Deep-Link Back

**Dari:** Tim Mobile (Ari)
**Untuk:** Tim Backend ECC (IDEA) / Tim Web
**Tanggal:** 2026-08-31
**Priority:** 🔴 URGENT — blocking mobile v1.7.2 iOS App Store approval + Android UX consistency
**Related:**
- Mobile commit: `40b1533 feat(cross-platform): unify iOS+Android persembahan/paid-event → web (v1.7.2)`
- Apple rejection: Guideline 3.2.2(iv), 2026-08-31
- BE notice: `backend-request-persembahan-per-cabang-url.md` (mention /event/pembayaran/*, /event/:id/(register|payment|pembayaran) whitelisted)

---

## TL;DR

Mobile v1.7.2 redirect **paid event flow (register + payment + upload bukti)** dari in-app ke website. URL target:

```
https://eccchurch.global/event/{eventId}/pembayaran
```

**URL ini WAJIB exist + functional + include deep-link back button** sebelum Apple re-review.

Kalau URL 404 → iOS user stuck → Apple reject lagi.

**Effort estimate:** ~4-8 jam (SSR page + register form + upload bukti + deep-link back button).

---

## Context

Apple Guideline 3.2.2(iv) melarang in-app charitable donation untuk non-Benevity/Candid nonprofits. Mobile v1.7.2 solve dengan hybrid:

- **In-app (mobile):** event list, event detail view, participation status (read-only)
- **Web (SSR):** register, display rekening + QRIS, upload bukti transfer, tracking donations history

Cross-platform: iOS + Android sama-sama redirect ke web (Android tidak perlu, tapi konsisten UX).

---

## Request Detail

### 1. Halaman Web `/event/{eventId}/pembayaran`

**URL:**
```
https://eccchurch.global/event/{eventId}/pembayaran
```

**Konten yang harus ada:**

1. **Header** — logo ECC + judul "Pendaftaran & Pembayaran Event"
2. **Event info summary:**
   - Judul event
   - Tanggal + waktu + lokasi
   - Deskripsi singkat
   - Hero image (kalau ada)
3. **Fee display:**
   - `NOMINAL_TETAP`: "Biaya: Rp X"
   - `NOMINAL_BEBAS`: "Nominal Sukarela — silakan isi nominal sesuai kerelaan"
4. **Registration form** (kalau user belum daftar):
   - Field: nama peserta (auto-fill dari session), noHp, jumlah orang, catatan
   - Untuk NOMINAL_BEBAS: input nominal (min Rp 10.000)
   - Submit → POST `/admin/event/{id}/register` → status DAFTAR
5. **Payment info** (setelah register):
   - Nomor rekening cabang penyelenggara event
   - QRIS image (kalau ada)
   - Copy button per nomor rekening
6. **Upload bukti transfer:**
   - File upload (JPG/PNG/HEIC, max 5 MB)
   - Preview thumbnail
   - Submit → POST `/admin/event/{id}/upload-bukti` → status MENUNGGU_VERIFIKASI
7. **Status tracker** — visual step: Daftar → Bayar → Verifikasi → Hadir
8. **Cancel button** (kalau status DAFTAR / MENUNGGU_VERIFIKASI)
9. **Deep-link back button** (setelah success):
   ```
   [Kembali ke Els App] → onClick: window.location.href = `ecc://event/${eventId}`
   ```

### 2. Data Source

Semua endpoint sudah ada di BE (dipakai mobile Android sebelum v1.7.2):
- `GET /admin/event/{id}` — event detail + myParticipation
- `POST /admin/event/{id}/register` — create participation
- `POST /admin/event/{id}/upload-bukti` — upload bukti transfer
- `POST /admin/event/{id}/cancel` — cancel registration
- `GET /admin/event/{id}/my-donations` — donations history (untuk NOMINAL_BEBAS)

Web SSR consume endpoint yang sama, render sebagai HTML.

### 3. Deep-Link Back Button (WAJIB)

Setelah user complete flow (upload bukti sukses atau cancel), tampil button:

```html
<button onclick="window.location.href='ecc://event/${eventId}'">
  Kembali ke Els App
</button>
```

Fallback text untuk user yang tidak install app:
```html
<p>App Els tidak terdeteksi. <a href="https://apps.apple.com/id/app/els-global-app/...">Download di App Store</a> atau <a href="https://play.google.com/store/apps/details?id=idea.eccchurch.global">Google Play</a>.</p>
```

**Kenapa penting:** tanpa deep-link back, user harus manual switch app → poor UX. Dengan deep-link → auto-return ke event detail dgn status refresh.

### 4. Notification Triggers

Pastikan BE tetap fire in-app notif dari action web:

| Web action | Notif type | Target user |
|---|---|---|
| User register success | `EVENT_REGISTERED` | User yang daftar |
| User upload bukti | `EVENT_REGISTERED` (bisa juga new type kalau ada) | User yang daftar |
| Admin verify bukti (dari portal) | `EVENT_APPROVED` | User yang daftar |
| Event day + admin scan QR | `EVENT_CHECKED_IN` | User yang datang |

Mobile bakal display notif via bell icon + auto-open event detail saat tap.

### 5. Coming-Soon Middleware Whitelist

URL berikut harus di-whitelist (per notice sebelumnya):
- `/event/{id}/pembayaran`
- `/event/pembayaran/*` (kalau ada sub-path)

Kalau saat ini masih di-block → iOS user tidak bisa akses.

---

## Verification Steps

Setelah page live, verify:

1. **HTTP 200** test:
   ```bash
   curl -sI https://eccchurch.global/event/{sample-event-id}/pembayaran | head -3
   ```

2. **Invalid event ID** → HTTP 404 (Next.js not-found):
   ```bash
   curl -sI https://eccchurch.global/event/NGACO/pembayaran | head -3
   ```

3. **Mobile Safari test (iOS)** — buka URL dari Safari:
   - Page render dgn info event + rekening + QRIS
   - Register form usable (kalau belum daftar)
   - Upload bukti works
   - Deep-link button trigger `ecc://event/{id}` → open mobile app

4. **Deep-link callback (mobile installed)**:
   - Tap deep-link button → iOS jump ke Els App → land di `app/event/{id}.tsx` → participation status refreshed

---

## Timeline

- **Web deliver:** ASAP (target 1-2 hari) — mobile v1.7.2 build sudah done, waiting page live sebelum submit ke Apple
- **Mobile action after web deploy:**
  1. Verify URL live via curl
  2. Handle deep-link `ecc://event/{id}` di mobile (kemungkinan sudah handled via existing router)
  3. Test end-to-end flow di iPhone + Android device
  4. Submit v1.7.2 iOS ke Apple + reply reviewer
- **Apple re-review:** 24-48 jam typical setelah re-submission

---

## Impact kalau Tidak Setup

Kalau URL `https://eccchurch.global/event/{id}/pembayaran` tetap 404:
- Mobile iOS user tap "Lanjutkan" → Safari open → **404 error page** → user stuck
- Apple reviewer test → **flagged sebagai broken feature** → **REJECTED again**
- Android v1.7.2 user juga stuck kalau upgrade → downgrade pengalaman drastic (dari in-app full flow ke error page)

**Alternative kalau URL belum ready:** mobile fallback ke `/persembahan/{cabang}` sebagai temporary redirect. Sudah di-code sebagai fallback di `eventPaymentWebUrl` helper. Tapi UX kurang tepat (user datang mau daftar event, malah landing di halaman persembahan generic).

---

## Follow-up: Universal Links (Sprint 8 planned)

Setelah v1.7.2 stable, mobile + web coordinate migration ke Universal Links (`https://` links yang auto-open app):
- iOS: `associatedDomains` + `apple-app-site-association` file
- Android: App Links + `assetlinks.json` file
- Effect: link `https://eccchurch.global/event/{id}/pembayaran` auto-buka app (kalau installed) atau web (kalau tidak) — seamless

Not urgent sekarang — v1.7.2 pakai custom scheme `ecc://` untuk back button, works but ada quirks.

---

## Contact

- **Mobile team:** Ari Christian — arichrst@ide.asia / arichrst@gmail.com / +62 821 1567 8446
- **Ref commit mobile v1.7.2:** `40b1533` + `c6f54b6`
- **Web page live status:** `/persembahan` + `/persembahan/{kode}` ✅, `/event/{id}/pembayaran` **TBD (this request)**

Kalau butuh design mockup, contoh code, atau alternative approach, reply doc ini atau ping via ECC repo issue.

---

*Doc versi: 1.0 — 2026-08-31. Priority urgent — blocking iOS deploy + cross-platform UX consistency.*
