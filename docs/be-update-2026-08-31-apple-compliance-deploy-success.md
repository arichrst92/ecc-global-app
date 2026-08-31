# BE/Web Update — Apple Compliance Deploy Success

**Dari:** Tim Backend ECC (IDEA)
**Untuk:** Tim Mobile (Ari)
**Tanggal:** 2026-08-31 22:01 WIB
**Related:**
- `backend-request-apple-review-otp-bypass.md` ✅
- `backend-request-persembahan-web-page.md` ✅
- `backend-request-persembahan-per-cabang-url.md` ✅
- `backend-request-event-payment-web-page.md` ✅ (Opsi C — display + deep-link back)
- `mobile-update-2026-08-31-apple-compliance-final.md` (v1.7.3 ready)

---

## TL;DR

Semua endpoint + halaman web yang diminta untuk sprint 7 Apple compliance
sudah **DEPLOYED KE PRODUCTION**. Mobile v1.7.3 siap resubmit ke Apple.

---

## Deliverables Live di Production

### 1. Apple Review OTP Bypass — ✅

- Env `APP_REVIEW_BYPASS_NUMBERS` + `APP_REVIEW_BYPASS_OTP` di production `.env`
- Bypass hanya aktif untuk `purpose=LOGIN` — flow lain (ENROLLMENT / RESET_FACE / ONBOARDING_ADD_NOHP) tidak affected
- Jemaat "Apple Reviewer" (`+6281805807807`) sudah terdaftar
- Audit log entries di pm2 logs: `grep "app-review bypass" pm2 logs`

**Reviewer credentials untuk App Store Connect:**
- No HP: `+6281805807807`
- OTP: `123456`
- Purpose: `LOGIN`

Test:
```bash
curl -X POST https://api.eccchurch.global/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"noHp":"+6281805807807","kode":"123456","purpose":"LOGIN"}'
# → 200 { accessToken, refreshToken, user }
```

### 2. Web Page Persembahan — ✅

**URL structure (per-cabang, per notice sebelumnya):**
- `https://eccchurch.global/persembahan` — cabang selector (index)
- `https://eccchurch.global/persembahan/{kode}` — detail per cabang

**Content:**
- Header dgn logo ECC + nama cabang + alamat
- List rekening: bank, nomor, atas nama, catatan (badge purpose: Perpuluhan, Ucapan Syukur, Diakonia, Pembangunan, Misi, Umum)
- Copy nomor rekening button (clipboard)
- QRIS thumbnail **clickable → preview modal + download button** (new!)
- Panduan pendaftaran 3 langkah
- Legal + Privacy/Terms link
- Empty state graceful kalau belum ada rekening

**Behavior selama coming-soon mode:**
- Whitelisted, tetap accessible.

Test:
```bash
curl -sI https://eccchurch.global/persembahan | head -3          # → 200
curl -sI https://eccchurch.global/persembahan/BDG | head -3      # → 200 (kalau kode valid)
curl -sI https://eccchurch.global/persembahan/NGACO | head -3    # → 404
```

### 3. Web Page Event Payment — ✅

**URL:** `https://eccchurch.global/event/{slug-atau-uuid}/pembayaran`

Support both slug dan UUID (backend `/public/event/:idOrSlug` handle keduanya).

**Content:**
- Header + event hero image + judul + ringkasan
- Info card: tanggal (id-ID), waktu, lokasi, cabang penyelenggara
- Fee display: GRATIS / NOMINAL_TETAP (Rp X) / NOMINAL_BEBAS (sukarela)
- Payment info: bank + nomor rekening (copy button) + a.n.
- QRIS **clickable → preview modal + download button**
- Panduan pendaftaran (adaptive: gratis vs berbayar)
- **Deep-link back button** (auto-detect UA):
  - Mobile: primary CTA `ecc://event/{id}` + secondary App/Play Store link
  - Desktop: dua tombol "Download di App Store" / "Download di Play Store"
- Legal + Privacy/Terms link

**Register/upload/cancel:** tetap in-app (Opsi C, per keputusan Ari 2026-08-31).

Test:
```bash
curl -sI "https://eccchurch.global/event/{valid-slug}/pembayaran" | head -3  # → 200
curl -sI https://eccchurch.global/event/NGACO/pembayaran | head -3            # → 404
```

### 4. Landing Coming-Soon Mode — ✅

Website public dalam mode coming-soon (data masih dummy) — semua route di-rewrite
ke `/coming-soon` KECUALI whitelist berikut yg tetap accessible untuk Apple
compliance:

- `/persembahan`, `/persembahan/*`
- `/event/pembayaran`, `/event/pembayaran/*`
- `/event/:id/register|payment|pembayaran`
- `/privacy`, `/terms`
- Assets + Next internals

Coming-soon mode dikendalikan via ENV `LANDING_MODE=coming-soon` — kalau
nanti data website sudah ready, tinggal set ke kosong tanpa touch code.

---

## Yang Belum Dari Mobile Side (dari doc sprint 7)

Untuk finalisasi resubmit v1.7.3:

- [ ] Validate deep-link `ecc://event/{id}` sudah handled router mobile
- [ ] Test end-to-end di iPhone + Android:
  1. Tap tile persembahan → Safari open ke `/persembahan/{cabang}`
  2. Tap event NOMINAL_BEBAS "Lanjutkan" → Safari open ke `/event/{id}/pembayaran`
  3. Di web, tap "Kembali ke ECC App" → app buka → land di event detail
- [ ] Reply Apple review + submit v1.7.3

---

## Sprint 8 (nunggu approval Apple dulu)

Sesuai brief mobile-update-2026-08-31 final:

- Universal Links coordination (butuh Team ID + SHA-256 dari mobile)
- Remove dead code (`PersembahanTabAuthenticated`, `GuestPersembahanView`, `EventDonateScreen`)
- Deprecate `useMyDonations` hook (no consumer)
- Apply Benevity Causes (business side)

---

## Nice-to-Have Sudah Ditambahkan

Selain scope minimum:

- **QRIS preview modal** — thumbnail clickable, open fullscreen modal, download button (fetch blob → object URL, cross-origin safe). Applied ke persembahan + event/pembayaran.
- **Coming-soon mode toggle via ENV** — flip on/off tanpa deploy code.

---

## Contact

- **Backend/Web:** Tim IDEA
- **Deployment:** VPS `187.77.118.85`, PM2 process `ecc-core-api` + `ecc-landing`
- **Deploy timestamp:** 2026-08-31 ~22:00 WIB

Selamat submit ke Apple 🎉 kabari kalau ada issue post-submission atau butuh
tweak content di web page.

---

*Doc versi: 1.0 — 2026-08-31.*
