# Mobile Notice — Event Payment: Back-to-App Flow Revamp

**Status**: Implemented (mobile side done, web side deployed)
**Date**: 2026-10-09
**Impact**: Event payment flow (NOMINAL_TETAP + NOMINAL_BEBAS)

## TL;DR

Flow back-to-app dari web payment page sekarang **auto-dismiss browser**
begitu user klik tombol "Kembali ke Els App". Perlu **build + release**
versi mobile baru supaya UX ini aktif.

## Problem

Flow lama:

1. User tap "Bayar" di `app/event/[id].tsx` → `WebBrowser.openBrowserAsync(payment_url)`
2. Web page tampilkan tombol "Kembali ke ECC App" dengan deep link `ecc://event/{id}`
3. **Issue**: `openBrowserAsync` TIDAK bisa di-dismiss dari web page. Custom
   scheme `ecc://` dari dalam SFSafariViewController yang dibuka oleh Els App
   sendiri di-suppress oleh iOS (circular prevention).
4. User stuck di browser → harus manual tap native "Done" button atau
   "◁ Els App" untuk kembali — UX bingung.

Report user: *"tombol kembali ke app malah membuka appstore dan error 'App Not
Available in your country'"* (fallback App Store timer sebelumnya terlalu
agresif + region-locked `/id/` URL).

## Solution

Ganti `openBrowserAsync` → `openAuthSessionAsync` dengan explicit redirect URL
`ecc://payment-done`. Mode auth session mendeteksi URL match dan auto-dismiss
browser → mobile app menerima result → user kembali ke payment screen native
yang sudah punya form upload bukti.

Web button juga diubah: tidak lagi navigate ke `ecc://event/{id}` tapi
langsung ke `ecc://payment-done` (match redirect URL yang di-register di
openAuthSessionAsync).

## Files Changed

### Mobile (`ecc-mobile-app/app`)

**1. `app/event/[id].tsx` (line ~490)**

```diff
- WebBrowser.openBrowserAsync(eventPaymentWebUrl).catch(() => {})
+ WebBrowser.openAuthSessionAsync(
+   eventPaymentWebUrl,
+   'ecc://payment-done',
+ ).catch(() => {})
```

**2. `src/components/event/BebasWebRedirect.tsx` (useEffect + manual tap button)**

```diff
- WebBrowser.openBrowserAsync(url).catch(() => {})
+ WebBrowser.openAuthSessionAsync(url, 'ecc://payment-done').catch(() => {})
```

Diubah di 2 tempat di file ini (auto-open useEffect + manual tap Pressable).

### Web (`ecc-core-platform/apps/landing`)

**`apps/landing/src/app/event/[slug]/pembayaran/`** — deployed to production:

- `back-to-app-button.tsx`: tombol navigate ke `ecc://payment-done` (bukan
  `ecc://event/{id}` lagi). Rename semua label "ECC App" → "Els App".
  Hilangkan sticky bottom bar (user minta 1 tombol saja).
- `page.tsx`: tambah awareness banner di atas, pindah posisi
  `BackToAppButton` dari bottom ke top (first-interactive).

**`apps/landing/src/middleware.ts`**: whitelist `/event/{slug_or_uuid}`
supaya coming-soon mode tidak block Universal Link fallback target.

## Expected Flow (Setelah Mobile Build Baru Dirilis)

1. User at app → event → "Bayar" button
2. `openAuthSessionAsync(payment_url, 'ecc://payment-done')` buka
   SFSafariViewController (iOS) / Chrome Custom Tabs (Android)
3. User lihat info bank + QRIS, transfer dana
4. User klik "Kembali ke Els App" di web
5. Web navigate ke `ecc://payment-done`
6. **iOS/Android browser detect redirect match → auto-dismiss**
7. Mobile app menerima `WebBrowser.openAuthSessionAsync` result dengan
   type: `'success'`, url: `'ecc://payment-done'`
8. User sudah berada di native payment screen (yang punya form upload bukti)
   — tidak perlu navigate manual

## Backward Compatibility

- Mobile app lama (pre-release) yang masih pakai `openBrowserAsync`:
  tombol web akan navigate ke `ecc://payment-done` tapi browser TIDAK auto-dismiss.
  Fallback: native "Done" / "◁ Els App" button masih berfungsi (manual close).
- Mobile app baru (post-release) yang pakai `openAuthSessionAsync`:
  auto-dismiss + jump back to native screen.

## Testing Steps (after mobile build released)

**iOS:**
1. Install build baru di device fisik
2. Login → event dengan NOMINAL_TETAP atau NOMINAL_BEBAS → tap "Bayar"
3. SFSafariViewController buka payment page web
4. Lihat tombol "Kembali ke Els App" di card atas (format baru dengan border tebal)
5. Tap tombol → SFSafariViewController HARUS auto-close dalam 1-2 detik
6. User kembali ke native payment screen (previous screen di app)

**Android:**
Same flow — Chrome Custom Tabs auto-dismiss harus kejadi.

## Related Issues Fixed Bareng

- App Store URL `/id/app/` → `/app/` (hilangkan country lock yang bikin
  "App Not Available in your country")
- Fallback timer 1.5s di iOS yang auto redirect ke App Store → **dihapus**.
  User-report: "membuka appstore dan error" karena timer kena race condition.
- Awareness banner di top payment page: "Setelah transfer, WAJIB kembali ke aplikasi!"
- Rename semua "ECC App" → "Els App" di label web.

## Notes

- Scheme `ecc://` sudah terdaftar di `app.json` (CFBundleURLSchemes + Android
  scheme). Tidak perlu config tambahan.
- `openAuthSessionAsync` pattern biasanya untuk OAuth, tapi re-purpose untuk
  dismissal signaling adalah valid dan documented di Expo.
- Return value `WebBrowser.openAuthSessionAsync()` dapat di-ignore (`catch(() => {})`)
  karena kita tidak perlu data dari web, cukup browser dismiss doang.
