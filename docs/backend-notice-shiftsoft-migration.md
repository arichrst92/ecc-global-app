# Backend Notice — Shiftsoft Legacy Data Migration

**Dari:** Tim Backend ECC (IDEA)
**Untuk:** Tim Mobile (Ari) + siapa saja yg consume Jemaat/Group data
**Tanggal:** 2026-07-28
**Status:** 🚀 **DEPLOYED PRODUCTION** per 2026-07-29 — semua schema live di `api.eccchurch.global`, data import dilakukan bertahap via portal admin (Shiftsoft Sync UI di Developer Tools).
**Related:**
- [`backend-notice-magic-link-email-login.md`](./backend-notice-magic-link-email-login.md) — login flow untuk 6736 legacy jemaat (dipicu oleh migration ini)
- [`backend-notice-group-endpoints.md`](./backend-notice-group-endpoints.md) — 12 REST endpoint yg expose Group ke mobile (sudah tersedia)

---

## TL;DR

Data 6782 jemaat + 314 group dari sistem lama **Shiftsoft** sudah di-migrate ke ECC platform via script otomatis. Schema Jemaat di-perluas 14 kolom baru, dan ada model baru `Group` (module 23) untuk generic grouping (family/ministry/community) yang **terpisah** dari Homecell.

Mobile app perlu tahu:
1. Field baru di `Jemaat` (nullable — backward-compat, tidak break UI existing)
2. Model baru `Group` — potential fitur baru untuk browse komunitas/pelayanan/keluarga jemaat
3. Cara consume via API baru (belum ada endpoint public — TBD sesuai kebutuhan mobile)

---

## Konteks & Motivasi

ECC pindah dari sistem lama **Shiftsoft** (multi-tenant church management SaaS di `shiftsoft.org`) ke platform ECC baru (repo `ecc-core-platform`). Data historis 8 tenant (1 sinode + 7 cabang) di-migrate one-time + support periodic re-sync via CLI script.

**Sumber data legacy:**
- `https://shiftsoft.org/<slug>/api/user/list` → 6783 users
- `https://shiftsoft.org/<slug>/api/circle/list?with[0]=Members` → 523 circles

**Result migrate:**
- 6782 Jemaat (99.98%), 46 di antara-nya sistem account (auto-deactivated)
- 314 Group + 269 hierarchy links + 2802 memberships
- 0 error, 332 record kena collision noHp/email (field di-null biar tetep import)

---

## Perubahan Schema

### 1. `Jemaat` — 14 field baru (semua nullable)

| Field | Type | Origin | Deskripsi |
|---|---|---|---|
| `tanggalBergabungGereja` | `DateTime?` (Date) | `SpecialAttrs.Berjemaat_di_ECC_sejak` | Tanggal member gereja (bukan sign-up app) |
| `pendidikanTerakhir` | `String?` (varchar 100) | `SpecialAttrs.Pendidikan_Terakhir` | SD/SMP/SMA/S1/S2/dll |
| `statusPekerjaan` | `String?` (varchar 100) | `SpecialAttrs.Status_Pekerjaan` | Karyawan/Freelance/Wirausaha/Pelajar/dll |
| `namaKantor` | `String?` (varchar 255) | `SpecialAttrs.Nama_Sekolah/Tempat_Bekerja` | Nama tempat kerja/sekolah |
| `alamatKantor` | `String?` (text) | `SpecialAttrs.Alamat_Sekolah/Tempat_Bekerja` | Alamat tempat kerja |
| `statusPernikahan` | `String?` (varchar 50) | `SpecialAttrs.Status` (S/SM/JD → decode) | Single / Menikah / Janda / Duda |
| `tanggalPernikahan` | `DateTime?` (Date) | `SpecialAttrs.Tanggal_Pernikahan` | Tanggal menikah |
| `sudahBaptisAir` | `Boolean?` | `SpecialAttrs.Sudah_Baptis_Air` | Boolean (Ya/Tidak decoded) |
| `tanggalBaptisAir` | `DateTime?` (Date) | (belum ada di legacy — future) | Tanggal baptis air |
| `sudahBaptisRohKudus` | `Boolean?` | `SpecialAttrs.Sudah_Baptis_Roh_Kudus` | Boolean |
| `tanggalBaptisRohKudus` | `DateTime?` (Date) | (belum ada di legacy — future) | Tanggal baptis Roh Kudus |
| `spiritualJourneyLevel` | `String?` (varchar 100) | `SpecialAttrs.Spiritual_Journey_Terakhir` | Tahap discipleship (Believer/Disciple/Leader/dll) |
| `bapaRohaniJemaatId` | `String? UUID` (FK Jemaat) | (belum ada di legacy — future) | Mentor spiritual, self-relation |
| `legacyShiftsoftId` | `Int? UNIQUE` | `LegacyUser.ID` | Idempotent guard sync (audit trail juga) |

**Impact ke mobile:** semua field opsional. Mobile lama yg gak baca field ini tetap jalan. Mobile baru bisa tampil kolom baru di profile UI.

**Endpoint yg return field ini (existing):**
- `GET /admin/jemaat/:id` — otomatis include semua field (Prisma select-all)
- `GET /admin/jemaat` — list, otomatis include

Mobile portal UI juga sudah punya field ini di form edit jemaat (via `crud-page` config generic).

### 2. `Group` — model baru (module 23)

**Bukan Homecell.** ECC punya 2 konsep terpisah:

| Aspek | `Homecell` (module 10) | `Group` (module 23 baru) |
|---|---|---|
| Purpose | Strict cellgroup pemuridan | Generic grouping (family/ministry/community/homecell-style) |
| PIC constraint | Wajib Pelayanan "Penggembalaan" + role Zone/Homecell Leader | Bebas (any jemaat, atau null) |
| Hierarchy | 2 level (Area → Homecell) | N-level (self-relation parentId) |
| Sumber data | Manual admin di portal | Auto import Shiftsoft Circle + manual |
| Jenis | Cuma 1 (cellgroup) | 6 enum (FAMILY/MINISTRY/COMMUNITY/HOMECELL_STYLE/SYSTEM/LAINNYA) |

**Fields:**

```prisma
model Group {
  id                        String   @id @default(uuid())
  cabangId                  String   // FK CabangGereja
  parentId                  String?  // self-relation hierarchy
  nama                      String   (varchar 200)
  deskripsi                 String?  (text)
  jenis                     GroupJenis @default(LAINNYA)
  alamat                    String?  (text)
  gps                       String?  (varchar 64)   // "lat, lng" free text
  hari                      HariMinggu?
  jam                       String?  (varchar 5)    // HH:mm
  picJemaatId               String?  // FK Jemaat, nullable
  isPublic                  Boolean  @default(true) // visibility toggle (added 2026-07-28)
  joinCode                  String?  @unique        // 8-char, auto-gen kalau private
  isActive                  Boolean  @default(true)
  legacyShiftsoftCircleId   Int?     @unique
  createdAt / updatedAt
}

enum GroupJenis {
  FAMILY          // "Jerry - Chiqa Family"
  MINISTRY        // "Ministry Volunteers", "Bandung Leaders"
  COMMUNITY       // "BRIDGE", "Professional & Family"
  HOMECELL_STYLE  // Traditional cellgroup naming
  SYSTEM          // Internal ("ADMIN")
  LAINNYA         // Fallback
}

model GroupMember {
  id                String
  groupId           String   // FK Group
  jemaatId          String   // FK Jemaat
  tanggalBergabung  DateTime @default(now())
  tanggalKeluar     DateTime?
  isActive          Boolean  @default(true)
  catatan           String?
}
```

**Table name di DB:** `church_group` + `group_member` (karena `group` = SQL reserved word).

**Endpoint API:** ✅ **Sudah tersedia** — 12 endpoint (list, detail, create, update, dismiss, join public / join-by-code, leave, PIC add/remove member, regenerate code, my-groups). Full spec di **[`backend-notice-group-endpoints.md`](./backend-notice-group-endpoints.md)**.

Default visibility hasil import Shiftsoft: `isPublic = true` (siapa saja bisa lihat & join). PIC bisa toggle ke private via `PATCH /admin/group/:id` → backend auto-generate `joinCode` 8-char untuk invitation flow.

---

## Data Migration Result (Local, per 2026-07-28)

### Jemaat

| Cabang | Legacy | Imported | Active | System deactivated | Collision-nulled |
|---|---:|---:|---:|---:|---:|
| ECC Global | 24 | 24 | 15 | 9 | 9 (email) |
| ECC Bandung | 4203 | 4202 | 4194 | 8 | 92 (mostly noHp) |
| ECC Jakarta | 1818 | 1818 | 1812 | 6 | 159 |
| ECC Bali | 498 | 498 | 495 | 3 | 43 |
| ECC Malang | 51 | 51 | 49 | 2 | 9 |
| ECC Sydney | 21 | 21 | 20 | 1 | 5 |
| ECC Kuala Lumpur | 146 | 146 | 143 | 3 | 9 |
| ECC Makassar | 22 | 22 | 21 | 1 | 6 |
| **TOTAL** | **6783** | **6782** | **6749** | **33** | **332** |

**Notes:**
- 1 record skipped (nama kosong)
- 46 system accounts deactivated (`Administrator ECC XXX`, `Support Dinamigra`, `Web Registration`, `ECCBANDUNG-XXXX` placeholder) — record tetap ada di DB dgn `isActive=false`
- Collision-nulled = record kena unique constraint pada `noHp` atau `email` dgn record lain di ECC → field tsb di-null, record tetap ter-import. Manual cleanup admin nanti di portal untuk resolve.

### Group

| Cabang | Legacy Circle | Groups imported | Hierarchy links | Members |
|---|---:|---:|---:|---:|
| ECC Global | 0 | 0 | 0 | 0 |
| ECC Bandung | 418 | 218 | 190 | 1795 |
| ECC Jakarta | 79 | 79 | 74 | 926 |
| ECC Bali | 2 | 1 | 0 | 4 |
| ECC Malang | 2 | 0 (semua store) | 0 | 0 |
| ECC Sydney | 4 | 0 (semua store) | 0 | 0 |
| ECC Kuala Lumpur | 18 | 16 | 5 | 77 |
| ECC Makassar | 0 | 0 | 0 | 0 |
| **TOTAL** | **523** | **314** | **269** | **2802** |

**Filter applied:**
- `IsStore = 1` (e-commerce circles): 183 skipped
- Empty leaf (0 members + no children): 26 skipped
- `Status != 2` (inactive/deleted): 0 skipped

**Klasifikasi jenis (auto-detect via nama pattern):**
- `FAMILY` — nama mengandung "Family" (mis. "Jerry - Chiqa Family")
- `MINISTRY` — mengandung "Leaders", "Volunteers", "Ministry", "Team"
- `COMMUNITY` — mengandung "BRIDGE", "Fellowship", "Professional", dll
- `HOMECELL_STYLE` — sisanya (default fallback untuk traditional cellgroup)
- `SYSTEM` — nama exact "ADMIN"

---

## API endpoints — status untuk mobile

### Sudah ada (Jemaat — schema Jemaat udah include field baru otomatis)

- `GET /admin/jemaat` — list dengan filter
- `GET /admin/jemaat/:id` — detail (semua field baru included)
- `POST /admin/jemaat` — create
- `PATCH /admin/jemaat/:id` — update (mobile bisa update field baru via self-service form)

### Sudah ada (Group — 12 endpoint, spec di doc terpisah)

Semua endpoint Group sudah dibuat + tested di local. Full reference dengan sample request/response, mobile UX recommendation, notif WA trigger, dan error handling ada di:

👉 **[`backend-notice-group-endpoints.md`](./backend-notice-group-endpoints.md)**

Ringkasan endpoint (`/admin/group/*`):

| Kategori | Endpoint |
|---|---|
| List / Detail | `GET /admin/group`, `GET /admin/group/:id` |
| Create / Update / Dismiss | `POST /admin/group`, `PATCH /admin/group/:id`, `DELETE /admin/group/:id`, `POST /admin/group/:id/regenerate-code` |
| Membership (PIC) | `POST /admin/group/:id/members/:jemaatId`, `DELETE /admin/group/:id/members/:jemaatId` |
| Self-service | `POST /admin/group/:id/join`, `POST /admin/group/join-by-code`, `DELETE /admin/group/:id/leave` |
| My groups | `GET /admin/me/group-membership` |

**Guest / public browse (tanpa JWT)** — belum di-expose. Kalau perlu, kirim `backend-request-group-public.md`.

---

## Mobile action items — hal yg bisa mobile terusin

### Sudah bisa dipakai sekarang (tanpa BE new work)

- [ ] Portal admin bisa lihat 14 field baru di Jemaat detail page (via existing CRUD generic UI)
- [ ] Portal admin bisa lihat sample Group data via Prisma Studio (dev only)
- [ ] Mobile app existing tetap jalan — semua field baru optional, backward compat

### Perlu diskusi feature (kalau mau expose Group ke mobile)

- [ ] **Directory jemaat by kantor/pendidikan** — filter jemaat pakai `pendidikanTerakhir`, `statusPekerjaan`, `namaKantor` (data baru dari SpecialAttrs)
- [ ] **Baptism status** di profile jemaat — tampilkan `sudahBaptisAir` + `sudahBaptisRohKudus` badge
- [ ] **Bapa Rohani directory** — jemaat pilih mentor mereka, mobile bisa show "anak rohani lo siapa aja"
- [ ] **Group browse & join** — mobile fitur baru "cari komunitas/family/ministry", user browse + minta join. Butuh 3-4 endpoint baru.

### Fitur Group-specific yg mungkin useful

- **Directory keluarga** — filter `Group WHERE jenis = 'FAMILY'`, jemaat lihat siapa aja anggota family circle mereka (dari import Shiftsoft)
- **Direktori pelayanan** — filter `jenis = 'MINISTRY'`, jemaat lihat opsi bergabung ke tim pelayanan (Bandung Leaders, Ministry Volunteers, dll)
- **Community fellowship** — filter `jenis = 'COMMUNITY'`, list fellowship groups (BRIDGE, dll)

---

## Deferred untuk Phase 4+ (belum di-migrate)

Berikut yg **tidak** ter-import dari Shiftsoft, bisa lo request kalau dibutuhkan mobile:

1. **Family relations** (`FamilyRelation` — module existing di ECC) — Ayah/Ibu/Pasangan/Anak dari `SpecialAttrs.Nama_Lengkap_Ayah/Ibu/Pasangan/Anak_[Pertama..Keempat]`. Perlu fuzzy match by name ke jemaat existing, complex.

2. **Role mapping** — legacy `RoleID` (mis. 1031 = admin) → ECC `Role` UUID. Belum ada mapping table. Semua imported jemaat sekarang **tidak punya role assignment** — admin harus assign role manual via portal `/dashboard/role`.

3. **Foto profil jemaat** — per keputusan mobile 2026-07-28: skip dari BE migrate, mobile handle sendiri via upload endpoint yg existing.

4. **Homecell traditional** — Homecell (module 10) tetap kosong. Kalau ECC pakai flow homecell strict (dengan Zone Leader / Homecell Leader dari Pelayanan Penggembalaan), admin bikin manual via portal. Group import tidak masuk ke Homecell (sengaja dipisah biar constraint intact).

---

## Deployment status

**Local:** ✅ Selesai
**VPS Production:** 🚀 **LIVE per 2026-07-29** — schema deployed, data import bertahap.

**Import method di prod:** admin trigger via portal UI `https://portal.eccchurch.global/dashboard/shiftsoft-sync` (Fulltimer-only). Preview + review + commit wizard — bisa per-tenant, per-record action untuk redundant record (skip / null-noHp / null-email). Fallback CLI script tetap tersedia untuk BE ops di `docs/sprint-2-deploy-checklist.md`.

**Untuk mobile:** semua endpoint Jemaat sudah return field baru (14 kolom + `onboardedAt`). Mobile bisa langsung test consume via prod API. Sample test:
```bash
# Pakai JWT admin
curl -H "Authorization: Bearer <JWT>" \
  https://api.eccchurch.global/admin/jemaat/<any-id>
# Response include: tanggalBergabungGereja, pendidikanTerakhir, statusPekerjaan,
# namaKantor, alamatKantor, statusPernikahan, tanggalPernikahan, sudahBaptisAir,
# tanggalBaptisAir, sudahBaptisRohKudus, tanggalBaptisRohKudus,
# spiritualJourneyLevel, bapaRohaniJemaatId, legacyShiftsoftId, onboardedAt
```

---

## Reference — script CLI (untuk BE ops)

Semua script di `packages/database/prisma/scripts/migrate-shiftsoft/`:

| Script | Purpose |
|---|---|
| `run.ts` | Import Jemaat (top-level + SpecialAttrs → new fields) |
| `run-groups.ts` | Import Group + GroupMember (3-pass) |
| `cleanup-system-accounts.ts` | Deactivate 46 system placeholder accounts |
| `check-duplicates.ts` | Validator 6 kategori duplicate |
| `seed-cabang.ts` | Bootstrap 8 CabangGereja idempotent |

CLI commands (root repo):

```bash
pnpm --filter @ecc/database db:migrate-shiftsoft -- --slug=<t> [--commit] [--limit=N] [--exclude-system]
pnpm --filter @ecc/database db:migrate-shiftsoft-groups -- --slug=<t> [--commit] [--limit=N] [--include-empty]
```

Support `--all` untuk semua 8 tenant sekaligus.

---

## Contact + Follow-up

- **BE team:** IDEA dev (via ECC repo issue atau langsung)
- **Docs BE lengkap:** `packages/database/prisma/scripts/migrate-shiftsoft/README.md`

Kalau mobile mau feature baru (browse group, filter jemaat by field baru, dll), tulis `backend-request-*.md` di folder ini + tag BE. Turnaround BE ~1-2 hari per endpoint.

---

*Doc versi: 1.2 — 2026-07-29. Update log: v1.2 status DEPLOYED PRODUCTION, tambah pointer ke Shiftsoft Sync UI. v1.1 tambah `isPublic`+`joinCode` di Group schema.*
