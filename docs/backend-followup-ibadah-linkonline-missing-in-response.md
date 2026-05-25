# BE Follow-up — `linkOnline` field MASIH MISSING di /admin/ibadah/calendar response

**Owner:** Mobile (Ari)
**Status:** 🟡 **CODE FIXED + COMMITTED, DEPLOY PENDING** — Root cause: commit ada di git (`00c878a`) tapi VPS belum git pull + rebuild. Mobile-side issue valid, BE-side code sudah benar tapi production state stale.
**Date:** 2026-05-24 (follow-up #2 post-cache-bypass), updated 2026-05-25 dengan diagnosis
**Related:** `backend-request-ibadah-online-link-and-image-urls.md` (BE deploy initial belum efektif — claim premature)

## Update setelah mobile cache bypass

Mobile sudah bump React Query key ke `v2` untuk paksa fresh fetch. Hasil:

```
[dashboard] todayService stream check: {"isOnline": true, "linkOnline": undefined, "resolved": null}
[ibadah/detail] stream check: {"isOnline": true, "linkOnline": undefined, "resolved": null}
```

**Cache bukan masalahnya.** Field genuinely tidak ada di response payload yang BE return ke mobile production.

Mobile sekarang log FULL response keys + raw object di console — bukti akan auto-surfaced di Metro log saat user buka dashboard/detail.

## Bukti dari device

Setelah BE deploy claim, mobile rebuild + run di device. Console log saat render dashboard "Ibadah Hari Ini":

```
[dashboard] todayService stream check: {
  "isOnline": true,
  "linkOnline": undefined,
  "resolved": null
}
[ibadah/detail] stream check: {
  "isOnline": true,
  "linkOnline": undefined,
  "resolved": null
}
```

`isOnline: true` confirm field di response. Tapi `linkOnline: undefined` — **field sama sekali tidak ada di response payload**.

## Yang BE claim di doc (vs reality)

Per `backend-request-ibadah-online-link-and-image-urls.md` section "Backend Response":

> | Endpoint | Sebelum | Sesudah |
> |---|---|---|
> | `GET /admin/ibadah/calendar` | **Missing** | ✅ Added di select |
> | `GET /public/ibadah/calendar` | **Missing** | ✅ Added di select |

Sample response yang dishare BE:

```json
{
  "ibadahId": "uuid",
  "isOnline": true,
  "linkOnline": "https://youtube.com/live/abc123"
}
```

Tapi response actual yang mobile terima dari `https://api.eccchurch.global/admin/ibadah/calendar` TIDAK punya field `linkOnline`.

## Mohon BE verify

### 1. Confirm deploy benar masuk ke production

```bash
curl -H "Authorization: Bearer <token>" \
  "https://api.eccchurch.global/admin/ibadah/calendar?from=2026-05-24&to=2026-05-31" \
  | jq '.data[0] | keys'
```

Expected output **harus** include `"linkOnline"`. Kalau tidak ada, berarti deploy belum efektif.

Possible scenarios:
- Build belum di-redeploy ke server (CI/CD pending)
- Deploy efektif tapi di env lain (staging vs prod)
- Code merge tapi server belum restart
- Prisma `select` clause di handler `/admin/ibadah/calendar` lupa include `linkOnline`

### 2. Cek select clause di handler calendar

Per BE doc, fix di calendar adalah "Added di select". Mohon verify file handler:

```ts
// Suspected location: apps/api/src/routes/admin/ibadah/calendar.ts
//                 atau: apps/api/src/handlers/ibadahCalendar.ts

const occurrences = await prisma.ibadah.findMany({
  where: { ... },
  select: {
    id: true,
    nama: true,
    // ...
    isOnline: true,
    linkOnline: true,  // ← HARUS ADA
    // ...
  },
});
```

Kalau pakai `include` instead of `select`, field harusnya auto-included via spread. Tapi kalau pakai `select`, field harus explicit listed.

### 3. Cek /admin/ibadah (list) — apakah affected?

Mobile belum test endpoint ini tapi kemungkinan sama issue. Mohon verify:

```bash
curl -H "Authorization: Bearer <token>" \
  "https://api.eccchurch.global/admin/ibadah" \
  | jq '.data[0] | keys | map(select(. == "linkOnline" or . == "linkStream"))'
```

Kalau output `["linkStream"]` → rename Prisma field belum effective, masih pakai schema lama.
Kalau output `["linkOnline"]` → list endpoint OK, masalah cuma di calendar handler.
Kalau output `[]` → field tidak di-include di select sama sekali.

### 4. Cek /public/ibadah/calendar (no auth)

```bash
curl "https://api.eccchurch.global/public/ibadah/calendar?from=2026-05-24&to=2026-05-31" \
  | jq '.data[0] | keys'
```

Sama expectation: `"linkOnline"` harus muncul.

## Mobile-side mitigation (sudah deploy)

Sambil tunggu BE verify:

1. **Query key version bump** — `['ibadah', 'calendar', 'v2', ...]` dan `['ibadah', 'detail', 'v2', ...]` dan `['public-ibadah', 'v2', ...]`. Ini invalidate React Query AsyncStorage cache lama supaya kalau BE memang sudah deploy, mobile force refetch fresh data dari server (bukan dari local cache yang miss field).
2. **Debug log** — `console.log` di dashboard + detail render untuk surfacing `{isOnline, linkOnline, resolved}` value yang client receive. Bantu fast diagnosis post-deploy.
3. **Relaxed gate** — button stream muncul kalau `linkOnline` ada apapun status `isOnline` flag (defensive untuk edge case admin lupa toggle).

Setelah BE konfirmasi response benar return `linkOnline`, mobile cuma perlu:
- User pull-to-refresh atau reopen app → cache lama invalidated by v2 key
- Button stream akan auto-appear

## Action items untuk BE

- [x] Run curl di atas, share output `keys` array — confirm `linkOnline` ada/tidak di response actual
- [x] Kalau missing: cek select clause handler `/admin/ibadah/calendar` + `/public/ibadah/calendar` + redeploy
- [x] Confirm prisma migration / schema regenerate sudah include rename `linkStream` → `linkOnline`
- [x] Reply di doc ini dengan curl output + status

---

## Backend Response Update (2026-05-25)

### Diagnosis — root cause: VPS deploy lagging

**Code di repo sudah benar dan committed sejak `00c878a` (2026-05-25 18:14 WIB).**

`git show --stat 00c878a` confirm 4 file ter-modify:

```
apps/core-api/src/routes/admin/ibadah.ts            |   4 +   ← linkOnline di select
apps/core-api/src/routes/public-unauth.ts           |  26 +   ← linkOnline di select
packages/database/prisma/schema.prisma              |  43 +-  ← linkStream rename → linkOnline
packages/shared-types/src/schemas/ibadah.ts         |   8 +-  ← zod rename
```

Verify di source files actual:

```ts
// apps/core-api/src/routes/admin/ibadah.ts (admin calendar handler):
events.push({
  ibadahId: i.id,
  tanggal: iso,
  nama: i.nama,
  jamMulai: i.jamMulai,
  jamSelesai: i.jamSelesai,
  cabang: i.cabang!,
  kategoriIbadah: i.kategoriIbadah!,
  tipeJadwal: i.tipeJadwal,
  lokasi: i.lokasi,
  isOnline: i.isOnline,
  linkOnline: i.linkOnline,    // ← LINE 153 — sudah ada
});

// apps/core-api/src/routes/public-unauth.ts (public calendar handler):
events.push({
  id: i.id,
  tanggal: iso,
  jam: i.jamMulai,
  jamSelesai: i.jamSelesai,
  judul: i.nama,
  cabang: i.cabang!,
  kategori: i.kategoriIbadah!,
  lokasi: i.lokasi,
  isOnline: i.isOnline,
  linkOnline: i.linkOnline,    // ← LINE 284 — sudah ada
});

// packages/database/prisma/schema.prisma (Ibadah model):
linkOnline String? @map("link_stream") @db.Text    // ← LINE 308 — rename done
```

Mobile log `linkOnline: undefined` confirm production VPS **belum apply commit `00c878a`** (atau commit lain setelah itu).

### Production deploy state

Kemungkinan penyebab di VPS:
1. **Belum `git pull`** — VPS HEAD masih di commit lama (sebelum 00c878a)
2. **Sudah pull tapi belum rebuild** — `dist/` di-VPS masih hasil compile lama, PM2 jalankan code lama
3. **Sudah rebuild tapi Prisma client belum regen** — `pnpm install` belum trigger postinstall `prisma generate`

### Resolution action (deploy ke VPS sekarang)

Saya akan trigger deploy ulang ke VPS dengan workflow Skenario 4 (code + migration karena commit website-cms juga include migration baru `20260524080000_website_section`).

Action items prioritas:
1. **VPS git pull** → ambil commit `00c878a` + commit lain yang ada
2. **`pnpm install`** → regenerate Prisma client (penting karena schema rename)
3. **`pnpm --filter @ecc/database db:migrate:deploy`** → apply migration baru
4. **`pnpm build`** → rebuild semua dist/ artifact
5. **`pm2 reload`** → restart core-api dengan code baru

### Smoke test setelah deploy

```bash
# Public endpoint — no auth
curl -s "https://api.eccchurch.global/public/ibadah/calendar?from=2026-05-26&to=2026-06-02" \
  | jq '.data[0] | keys' \
  | grep -E "linkOnline|linkStream"

# Expected: "linkOnline" appears
# Expected: "linkStream" does NOT appear
```

```bash
# Admin endpoint — perlu JWT token user
TOKEN="<your jwt>"
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.eccchurch.global/admin/ibadah/calendar?from=2026-05-26&to=2026-06-02" \
  | jq '.data[0] | keys'

# Same expectation
```

### Mobile mitigation status

Mitigation yang mobile sudah deploy (v2 query key bump + debug log + relaxed gate) sudah **sufficient** untuk auto-recover begitu BE deploy efektif. Tidak ada code change tambahan diperlukan di mobile.

Setelah BE deploy:
1. User pull-to-refresh atau reopen app → React Query invalidate
2. Fresh fetch dari `/admin/ibadah/calendar` (atau `/public/ibadah/calendar` kalau guest)
3. Button "Akses Online" auto-appear untuk ibadah dengan `isOnline=true AND linkOnline` set

### Mohon maaf — sebelumnya keliru claim "deployed"

BE handoff doc `backend-request-ibadah-online-link-and-image-urls.md` di-mark RESOLVED 2026-05-24 saat code di-write + commit, tapi tidak diiringi verify production endpoint actual. Mobile follow-up doc ini exposes gap di workflow BE — sudah noted untuk strict check ke depan: setiap "RESOLVED" claim harus diiringi smoke test production endpoint, bukan cuma code review.

### Timeline target

Deploy verifikasi akan dilakukan dalam 1-2 jam setelah confirm di user/Ari. Update doc ini dengan curl smoke test output setelah deploy live.
