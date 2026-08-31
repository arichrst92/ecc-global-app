# Backend/Web Notice — Persembahan URL Sekarang Per-Cabang

**Dari:** Tim Backend/Web ECC (IDEA)
**Untuk:** Tim Mobile (Ari)
**Tanggal:** 2026-08-31
**Related:**
- Follow-up ke `backend-request-persembahan-web-page.md` (delivered 2026-08-31)
- Perubahan struktur URL: universal → per-cabang

---

## TL;DR

Halaman persembahan di web sudah dipecah per cabang, bukan universal lagi.

- **`https://eccchurch.global/persembahan`** — index / cabang selector (list semua cabang aktif, tap → detail)
- **`https://eccchurch.global/persembahan/{cabangKode}`** — detail rekening cabang tsb (bank, nomor, QRIS, panduan)

Kalau `{cabangKode}` invalid / cabang tidak ada → auto 404 (Next.js `notFound()`).

---

## Action untuk Mobile

Update deep-link redirect di mobile v1.7.x:

**Before (v1.7.0 saat ini):**
```typescript
Linking.openURL('https://eccchurch.global/persembahan');
```

**After (recommended):**
```typescript
const cabangKode = currentUser?.cabang?.kode; // atau sumber lain dari session

const url = cabangKode
  ? `https://eccchurch.global/persembahan/${encodeURIComponent(cabangKode)}`
  : 'https://eccchurch.global/persembahan'; // fallback ke cabang selector

Linking.openURL(url);
```

**Fallback logic (WAJIB):**
- Kalau user sudah login & `cabang.kode` tersedia → langsung ke detail cabang (`/persembahan/{kode}`)
- Kalau user belum login / tidak ada cabang → ke index `/persembahan` (user pilih manual)
- Jangan hard-code kode cabang tertentu — harus ambil dari session user

---

## Data Contract

**`cabangKode` format:** string ASCII, biasanya UPPERCASE 3-6 huruf/angka (contoh: `"JKT"`, `"BDG"`, `"SBY"`).

Sumber di mobile:
- Session `currentUser.cabang.kode` (kalau sudah expose)
- Atau field jemaat detail `jemaat.cabang.kode`

Kalau `kode` belum tersedia di response backend yang dipakai mobile, ping tim BE — bisa ditambah ke `/auth/me` response.

**Lookup logic di web (sudah handle di backend web SSR):**
1. Fetch `GET /auth/cabang?isActive=true` → find cabang by kode (case-insensitive)
2. Fetch `GET /public/cabang/{cabang.id}/rekening` → tampilkan
3. Kalau step 1 tidak match → 404

---

## Behavior Selama Coming-Soon Mode

Website eccchurch.global saat ini di **coming-soon mode** (sesuai keputusan 2026-08-31).

Yang **tetap accessible** meski coming-soon aktif:
- `/persembahan`
- `/persembahan/*` (semua kode cabang)
- `/event/pembayaran/*` dan `/event/:id/register|payment|pembayaran`
- `/privacy`, `/terms`

Semua route lain di-rewrite ke `/coming-soon`. Jadi flow deep-link mobile tidak terganggu.

---

## Verification Steps

Setelah update mobile:

1. Login mobile dgn user cabang X → tap persembahan tab → confirm URL yg di-open sesuai:
   ```
   https://eccchurch.global/persembahan/{kodeCabangX}
   ```

2. Logout / user tanpa cabang → tap persembahan (kalau feature accessible) → landing di:
   ```
   https://eccchurch.global/persembahan
   ```
   dan user pilih cabang manual.

3. cURL manual sanity (dari terminal):
   ```bash
   curl -sI https://eccchurch.global/persembahan | head -3
   curl -sI https://eccchurch.global/persembahan/JKT | head -3
   ```
   → keduanya HTTP 200.

4. Kalau kirim kode invalid: `https://eccchurch.global/persembahan/NGACO` → HTTP 404 (Next.js `not-found`).

---

## Optional — Standard Not-Found Handler

Kalau mobile mau lebih robust: sebelum open URL cabang, bisa validasi kode dulu via backend endpoint (mis. GET `/auth/cabang?isActive=true` → check kode ada di list). Kalau tidak ada, fallback ke index. Tapi ini opsional — Next.js 404 page sudah handle graceful.

---

## Timeline

- **Web deliver:** ✅ 2026-08-31 (deployed setelah PR merge)
- **Mobile action:** update deep-link string di next release (v1.7.1 atau hot-config kalau feasible)
- **Apple submission:** existing v1.7.0 URL universal `/persembahan` **tetap valid** (index page live). Jadi tidak perlu rebuild ulang untuk lolos review — cukup ganti sebelum next release supaya UX lebih langsung.

---

## Contact

- **Backend/Web:** Tim IDEA (BE)
- **Reference URL:** https://eccchurch.global/persembahan

Kalau butuh custom endpoint (mis. `GET /public/cabang/by-kode/:kode` untuk validasi kode dari mobile), reply doc ini.

---

*Doc versi: 1.0 — 2026-08-31.*
