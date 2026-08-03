# Backend Request — Walk-in Endpoint Accept Kode Alternate

**Dari:** Tim Mobile (Ari)
**Untuk:** Tim Backend ECC (IDEA)
**Tanggal:** 2026-08-03
**Priority:** 🟡 Medium — enable mobile adopt walk-in flow per BE notice 2026-08-03
**Status:** ✅ **RESOLVED** (2026-08-03) — Opsi A adopted, endpoint extended, tsc clean di ckids + core-api. Deploy pending.
**Related:** [`backend-notice-scanner-walkin-flow.md`](./backend-notice-scanner-walkin-flow.md)

---

## TL;DR

Mobile mau adopt `POST /admin/reservasi/walk-in` untuk parity dgn Ckids web (per BE notice 2026-08-03). Blocker: endpoint accept `jemaatId` UUID, tapi mobile scanner cuma dapat `kode` 8-char dari QR scan (tidak punya jemaatId sampai lookup).

Request: **tambah alternate accept `kode` di walk-in endpoint** (mirror pattern homecell/group `by-kode`). Mobile bisa langsung POST `{ kode, ibadahId, tanggalIbadah, action }` tanpa extra lookup call.

---

## Konteks

Mobile scanner ibadah flow:
1. Admin scan QR profile jemaat → dapat `kode` 8-char (`ANAK1234`)
2. Mau POST walk-in dgn context ibadah (dari route param) + action (dari mode toggle)

Existing walk-in body:
```json
{ "jemaatId": "uuid", "ibadahId": "uuid", "tanggalIbadah": "2026-08-04", "action": "checkin" }
```

Blocker: mobile tidak punya `jemaatId` — cuma `kode`. Butuh 1 extra API call untuk resolve (mis. `/admin/jemaat/lookup?kode=X`). Extra roundtrip + latency + N+1 kalau batch.

---

## Request Detail

### Extend `POST /admin/reservasi/walk-in` body

Accept **EITHER** `jemaatId` (existing) ATAU `kode` (baru). Rule input: kirim salah satu, bukan kedua-nya.

**Existing (tetap jalan):**
```json
{
  "jemaatId": "uuid",
  "ibadahId": "uuid",
  "tanggalIbadah": "2026-08-04",
  "action": "checkin"
}
```

**Baru (mobile-friendly):**
```json
{
  "kode": "ANAK1234",
  "ibadahId": "uuid",
  "tanggalIbadah": "2026-08-04",
  "action": "checkin"
}
```

**Backend behavior:**
- Kalau body kirim `kode`: lookup jemaat by `kode` (case-insensitive, uppercase-normalize)
- Kalau ketemu → treat `jemaat.id` sebagai jemaatId dari input
- Kalau tidak ketemu / jemaat nonaktif → 404 "Kode jemaat tidak ditemukan"
- Rest of flow identik (upsert reservasi, generate pickupCode, dll)

**Response shape:** sama, tidak berubah.

**Errors tambahan:**
| HTTP | Kondisi | Message |
|---|---|---|
| 400 | Body kirim BOTH jemaatId + kode | "Kirim salah satu: jemaatId atau kode" |
| 404 | Kode tidak ditemukan / jemaat nonaktif | "Jemaat dgn kode X tidak ditemukan" |

---

## Alternative Considered

**Opsi B**: Bikin endpoint separate `POST /admin/reservasi/walk-in/by-kode`.
- Pros: cleaner separation, tidak conflict di zod schema
- Cons: 2 endpoint untuk same logical operation

Pilihan mana lebih clean bagi BE — either OK untuk mobile.

**Opsi C**: Mobile lookup jemaat dulu via existing endpoint sebelum walk-in.
- Butuh endpoint: `GET /admin/jemaat/by-kode/:kode` (belum ada, atau ada tapi Fulltimer-only)
- Extra API call per scan
- Not preferred karena latency

---

## Effort Estimate BE

Small — reuse jemaat lookup helper dari homecell/group by-kode endpoints yg sudah ada. Same pattern.

---

## Timeline

- **Preferred**: dalam 1-2 hari (blocking mobile Sprint 4 walk-in adoption)
- **Acceptable**: 1 minggu (mobile refactor delayed ke Sprint 5)
- **Kalau ditunda >1 minggu**: mobile keep existing kode-reservasi based scanner, walk-in adoption defer ke v1.6.0+

---

## Confirmation dari BE

Kalau OK:
1. ETA
2. Confirm approach (Opsi A vs B)
3. Confirm behavior kalau body kirim both jemaatId + kode

Kalau ada blocker (mis. zod discriminated union complexity):
- Discuss di ECC repo issue

---

## Contact

- Mobile team: Ari (arichrst@ide.asia)
- Ref: `docs/backend-notice-scanner-walkin-flow.md`
- Related sprint: `docs/sprint-plan-2026-q3.md` Sprint 4 (v1.4.0)

---

*Doc versi: 1.0 — 2026-08-03.*

---

## 🔧 BE RESPONSE (2026-08-03)

Pilih **Opsi A** — extend existing endpoint. Alasan: satu endpoint untuk satu logical operation, mobile cukup switch field, dan zod refine XOR simple untuk maintain.

### Changes

**File**: `packages/shared-types/src/schemas/reservasi.ts`

Schema `walkInReservasiSchema` sekarang:
```typescript
export const walkInReservasiSchema = z
  .object({
    jemaatId: uuidSchema.optional(),
    kode: z.string().trim().min(4).max(20).optional(),
    ibadahId: uuidSchema,
    tanggalIbadah: z.string().date(),
    action: z.enum(['checkin', 'checkout', 'pickup']),
  })
  .refine((v) => !!v.jemaatId !== !!v.kode, {
    message: 'Kirim salah satu: jemaatId ATAU kode (bukan keduanya, bukan kosong)',
    path: ['jemaatId'],
  });
```

**File**: `apps/core-api/src/routes/admin/reservasi.ts`

Handler resolve:
```typescript
const parsed = walkInReservasiSchema.parse(req.body);
const jemaat = parsed.jemaatId
  ? await prisma.jemaat.findUnique({ where: { id: parsed.jemaatId }, select: {...} })
  : await prisma.jemaat.findUnique({ where: { kode: parsed.kode.toUpperCase() }, select: {...} });
if (!jemaat) throw NotFound(parsed.kode ? `Jemaat dgn kode ${parsed.kode.toUpperCase()} tidak ditemukan` : 'Jemaat tidak ditemukan');
```

Kode di-normalize uppercase sebelum lookup (konsisten dgn homecell/group `by-kode` pattern).

### Behavior Confirmed

| Input | Result |
|---|---|
| `{ jemaatId, ibadahId, tanggalIbadah, action }` | ✅ Existing flow, ckids tetap jalan |
| `{ kode, ibadahId, tanggalIbadah, action }` | ✅ New flow untuk mobile scanner |
| `{ jemaatId, kode, ... }` | ❌ 400 "Kirim salah satu..." |
| `{ ibadahId, tanggalIbadah, action }` (both missing) | ❌ 400 "Kirim salah satu..." |
| `{ kode: "anak1234", ... }` (lowercase) | ✅ Auto-uppercase → lookup `ANAK1234` |
| `{ kode: "NOTFOUND", ... }` | ❌ 404 "Jemaat dgn kode NOTFOUND tidak ditemukan" |

### Backward Compat

- Ckids web (`apps/ckids/src/app/ibadah/page.tsx:506`) tetap kirim `jemaatId` — tidak break
- Mobile bisa langsung switch pakai `kode` — zero migration effort
- Response shape identik

### Testing curl

```bash
JWT="<admin-JWT>"
IBADAH="<uuid>"

# Via kode (mobile scanner)
curl -X POST -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d "{\"kode\":\"ANAK1234\",\"ibadahId\":\"$IBADAH\",\"tanggalIbadah\":\"2026-08-04\",\"action\":\"checkin\"}" \
  https://api.eccchurch.global/admin/reservasi/walk-in

# Via jemaatId (ckids web / existing)
curl -X POST -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d "{\"jemaatId\":\"<uuid>\",\"ibadahId\":\"$IBADAH\",\"tanggalIbadah\":\"2026-08-04\",\"action\":\"checkin\"}" \
  https://api.eccchurch.global/admin/reservasi/walk-in
```

### Build Status

- `pnpm --filter @ecc/shared-types build` ✅ clean
- `apps/core-api` tsc --noEmit ✅ clean
- No mobile-breaking change

### Deploy Steps (VPS)

```bash
ssh root@187.77.118.85
cd /var/www/ecc-core-platform
git pull origin main
pnpm install --frozen-lockfile
pnpm --filter @ecc/shared-types build
pnpm --filter @ecc/core-api build
pm2 restart ecc-core-api --update-env
pm2 logs ecc-core-api --lines 50
```

Testing post-deploy: kirim curl dengan `kode` → confirm 200/201 return dengan `pickupCode` (kalau kids ibadah).

— IDEA dev
