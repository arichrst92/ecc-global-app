# Backend/Web Request — Persembahan Web Page for iOS Redirect

**Dari:** Tim Mobile (Ari)
**Untuk:** Tim Backend ECC (IDEA) / Tim Web (kalau terpisah)
**Tanggal:** 2026-08-31
**Priority:** 🔴 URGENT — blocking iOS App Store approval (v1.7.0 resubmit)
**Status Web/BE:** ✅ **DELIVERED 2026-08-31** — page live di `apps/landing`, whitelist dari coming-soon middleware, consume `/public/cabang/:id/rekening`.
**Related:**
- Apple rejection: Guideline 3.2.2(iv) - Charitable donations, 2026-08-31
- Mobile commit: `100d0d7 feat(ios-compliance): hide persembahan + NOMINAL_BEBAS event untuk iOS (v1.7.0)`

---

## TL;DR

Mobile v1.7.0 iOS bakal **redirect user ke `https://eccchurch.global/persembahan`** setiap kali user coba akses persembahan atau event NOMINAL_BEBAS. **URL ini WAJIB exist + functional** sebelum Apple re-review.

Kalau URL tidak ada / 404 → iOS user stuck di error page → Apple bakal reject lagi.

**Effort estimate:** ~2-4 jam (static page dgn info rekening + QRIS).

---

## Context: Apple Rejection

Apple reviewer testing v1.6.0(4) → flagged Guideline 3.2.2(iv):

> App includes the ability to collect charitable donations within the app,
> which is not appropriate for the App Store, because your organization
> does not appear to be a Benevity or Candid approved nonprofit.

Solusi mobile: hide persembahan feature dari iOS + redirect ke external browser (Safari). Endpoint yang di-redirect: `https://eccchurch.global/persembahan`.

---

## Request Detail

### Halaman Web yang Perlu Dibuat

**URL:** `https://eccchurch.global/persembahan`

**Konten yang harus tampil:**

1. **Header** — logo ECC + judul "Persembahan / Giving"
2. **Info Rekening Bank** semua cabang:
   - Nama Bank (BCA, Mandiri, BNI, dll)
   - Nomor Rekening
   - Atas Nama (mis. "Yayasan Elshaddai Injil Sepenuh")
   - Peruntukan (Perpuluhan / Ucapan Syukur / Diakonia / Pembangunan / Misi)
   - Cabang (kalau rekening cabang-specific)
   - Copy button per nomor rekening (UX polish)

3. **QRIS Code** — image per rekening (kalau ada QRIS setup)
   - Scan hint: "Scan dgn mobile banking / e-wallet"

4. **Instruksi** untuk jemaat:
   - Cara transfer + upload bukti (kalau ada web upload flow) atau kirim WA ke bendahara
   - Kontak admin cabang untuk konfirmasi

5. **Legal disclaimer** (bottom):
   - "Persembahan bersifat sukarela"
   - "Untuk pengurusan pajak / bukti resmi hubungi bendahara"
   - Link ke Privacy Policy + T&C

### Data Source

Bisa ambil dari existing BE endpoint:
- `GET /public/cabang` → list cabang
- `GET /public/cabang/:id/rekening` → list rekening per cabang (endpoint ini sudah ada, dipakai mobile Android)

Bikin server-side rendered page yang consume endpoint di atas + display sebagai HTML.

### Technical Approach (rekomendasi)

**Opsi A — Static HTML di eccchurch.global** (paling cepat):
- Kalau eccchurch.global sudah punya CMS (Wordpress, Ghost, static site generator) → tambah halaman `/persembahan` manual
- Hardcode data rekening (update manual kalau ada perubahan)
- Effort: ~1-2 jam

**Opsi B — SSR page pakai existing BE API** (medium):
- Bikin route baru di frontend web (kalau ada Next.js/Nuxt/etc)
- Fetch dari `GET /public/cabang/:id/rekening`
- Render sebagai HTML dgn cabang selector
- Effort: ~3-4 jam

**Opsi C — Redirect ke halaman existing** (kalau sudah ada equivalent page):
- Kalau eccchurch.global sudah punya halaman "Donate" / "Persembahan" existing → tinggal ensure URL `/persembahan` ada (bisa redirect via `.htaccess` atau server config)
- Effort: ~15 menit

---

## Verification Steps

Setelah page live, verify:

1. **Load test** dari incognito browser:
   ```
   https://eccchurch.global/persembahan
   ```
   → HTTP 200 + page render dgn info rekening lengkap

2. **Mobile test** (iOS Safari) — simulate flow reviewer:
   ```
   Open Safari → type https://eccchurch.global/persembahan
   ```
   → Page responsive, tidak ada broken UI di mobile viewport

3. **Copy button** works (tap nomor rekening → copied to clipboard notification)

4. **QRIS image** load properly (bukan broken image icon)

---

## Timeline

- **Web deliver:** ASAP (ideally today) — mobile v1.7.0 build already done, waiting page live sebelum submit ke Apple
- **Mobile action after web deploy:** verify URL live via curl → submit v1.7.0 iOS ke Apple + reply reviewer
- **Apple re-review:** 24-48 jam typical setelah re-submission

---

## Impact kalau Tidak Setup

Kalau URL `https://eccchurch.global/persembahan` tetap 404:
- iOS user open persembahan tab → auto-redirect Safari → **error page "Not Found"** → poor UX
- Apple reviewer test → **flagged sebagai broken feature** → **REJECTED again**
- Loop terus sampai URL ready

---

## Contact

- **Mobile team:** Ari Christian — arichrst@ide.asia / arichrst@gmail.com / +62 821 1567 8446
- **Apple submission ID (previous):** a3b9d530-97a9-4ad5-877f-256283ea6849
- **App version target:** ELS Global App v1.7.0 (iOS)

Kalau perlu design mockup atau contoh code untuk halaman, ping via ECC repo issue atau langsung reply doc ini.

---

## Bonus — Also Applies to Event NOMINAL_BEBAS

Mobile v1.7.0 juga redirect user iOS ke `https://eccchurch.global/persembahan` kalau mereka reach event dgn tipe **NOMINAL_BEBAS** (free-amount donation event) via deeplink.

Kalau nanti ada demand untuk registration event donation via web, bikin separate URL:
- `https://eccchurch.global/event/{eventId}/register` — form registration + payment info
- Optional untuk sekarang; user bisa hubungi admin cabang untuk register manual

---

*Doc versi: 1.0 — 2026-08-31. Priority urgent — blocking iOS deploy.*
