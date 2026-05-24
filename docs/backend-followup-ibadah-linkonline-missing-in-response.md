# BE Follow-up — `linkOnline` field MASIH MISSING di /admin/ibadah/calendar response

**Owner:** Mobile (Ari)
**Status:** 🔴 **CONFIRMED BROKEN** — BE deploy belum efektif. Mobile cache bypass sudah dicoba, masih `undefined`.
**Date:** 2026-05-24 (follow-up #2 post-cache-bypass)
**Related:** `backend-request-ibadah-online-link-and-image-urls.md` (BE marked RESOLVED 2026-05-24 — claim premature)

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

- [ ] Run curl di atas, share output `keys` array — confirm `linkOnline` ada/tidak di response actual
- [ ] Kalau missing: cek select clause handler `/admin/ibadah/calendar` + `/public/ibadah/calendar` + redeploy
- [ ] Confirm prisma migration / schema regenerate sudah include rename `linkStream` → `linkOnline`
- [ ] Reply di doc ini dengan curl output + status
