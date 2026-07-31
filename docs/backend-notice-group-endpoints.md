# Backend Notice — Group Endpoints (Module 23)

**Dari:** Tim Backend ECC (IDEA)
**Untuk:** Tim Mobile (Ari)
**Tanggal:** 2026-07-28
**Status:** 🚀 **DEPLOYED PRODUCTION** per 2026-07-29 — 12 endpoint `/admin/group/*` + `/admin/me/group-membership` live di `api.eccchurch.global`. Table `church_group` + `group_member` ready. Mobile UI bisa langsung consume.
**Related:** [`backend-notice-shiftsoft-migration.md`](./backend-notice-shiftsoft-migration.md) (Group schema + import data)

---

## TL;DR

12 endpoint baru untuk consume Group data (module 23). Group adalah **generic grouping** — family/ministry/community/homecell-style — terpisah dari Homecell yg strict cellgroup.

Fitur utama untuk mobile:
- **Browse group** per cabang + filter jenis
- **Public vs Private group** — private group hidden dari listing, join hanya via **kode invitation** (QR scan)
- **Self-service** join public group + leave
- **PIC actions** — add/remove member, rotate joinCode, dismiss group
- **Notif WA otomatis** — member ditambah/dikeluarkan/group dismissed

Current data di local (belum production):
- **314 Group** cross 8 cabang (dominant: Bandung 218, Jakarta 79)
- **2802 memberships**
- Semua Shiftsoft imported → `isPublic=true` default

---

## Konteks

Setelah migrate 523 Shiftsoft Circle jadi 314 ECC Group (filter store + empty), mobile team perlu endpoint untuk expose ini ke user. Group beda dari Homecell:

| Aspek | Homecell (module 10) | Group (module 23) |
|---|---|---|
| Purpose | Strict cellgroup pemuridan | Generic grouping (family/ministry/community/homecell-style) |
| PIC constraint | Wajib Pelayanan "Penggembalaan" role Zone/Homecell Leader | Bebas (any jemaat, atau null) |
| Hierarchy | 2 level (Area → Homecell) | N-level (self-relation parentId) |
| Visibility | Semua visible | Public (visible ke semua) atau Private (hidden, invitation only) |
| Join method | Admin add | Self-join (public) atau kode invitation (private) |

---

## Base URL & Auth

**Base:** `/admin/group`
**Auth:** WAJIB Bearer JWT untuk semua endpoint (dari `/auth/otp/verify` atau `/auth/email/verify-magic-link`).

**Rate limit:** admin-tier (300/menit/user) — cukup untuk normal usage.

---

## Endpoint Reference

### 📋 List & Detail

#### `GET /admin/group`

List semua group (filter opsional). Private group otomatis hidden dari non-member/non-PIC/non-admin.

**Query params:**
| Param | Type | Deskripsi |
|---|---|---|
| `page` | int | default 1 |
| `limit` | int | default 20, max 100 |
| `sortBy` | string | default `nama` |
| `sortOrder` | asc/desc | default `asc` |
| `search` | string | contains match di `nama` (case-insensitive) |
| `cabangId` | uuid | filter by cabang |
| `jenis` | enum | FAMILY / MINISTRY / COMMUNITY / HOMECELL_STYLE / SYSTEM / LAINNYA |
| `parentId` | uuid or `"root"` or `"null"` | filter hierarchy (root = ParentID null) |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "cabangId": "uuid",
      "parentId": "uuid|null",
      "nama": "Homecell Kelapa Gading",
      "deskripsi": "Setiap Kamis...",
      "jenis": "HOMECELL_STYLE",
      "alamat": "Jl. Sudirman No. 12",
      "gps": "-6.2088, 106.8456",
      "hari": "KAMIS",
      "jam": "19:00",
      "picJemaatId": "uuid|null",
      "isPublic": true,
      "joinCode": null,           // null kalau public, atau hidden kalau bukan PIC/admin
      "isActive": true,
      "legacyShiftsoftCircleId": 2284,
      "createdAt": "2026-07-...",
      "updatedAt": "2026-07-...",
      "cabang": { "id": "uuid", "nama": "ECC Bandung", "kode": "BDG" },
      "picJemaat": { "id": "uuid", "namaLengkap": "Pak Jerry", "fotoUrl": null },
      "memberCount": 15,
      "childrenCount": 2
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 218, "totalPages": 11 }
}
```

**Visibility rules:**
- Public group: visible ke siapa saja
- Private group: hidden kalau requester **bukan** member, PIC, atau `isFulltimer=true`
- `joinCode` hanya visible untuk PIC group itu atau `isFulltimer=true`

#### `GET /admin/group/:id`

Detail group + members + children. Access denied (404) kalau private + bukan member/PIC/admin.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nama": "Bandung Leaders",
    "jenis": "MINISTRY",
    "isPublic": false,
    "joinCode": "A3F7K9M2",       // hanya untuk PIC/admin
    "cabang": {...},
    "parent": { "id": "uuid", "nama": "Professional & Family" },
    "children": [
      { "id": "uuid", "nama": "Youth Leaders", "jenis": "MINISTRY", "_count": {"members": 8} }
    ],
    "picJemaat": {...},
    "members": [
      {
        "id": "membership-uuid",
        "groupId": "uuid",
        "jemaatId": "uuid",
        "tanggalBergabung": "2026-06-15",
        "tanggalKeluar": null,
        "isActive": true,
        "catatan": null,
        "jemaat": {
          "id": "uuid",
          "namaLengkap": "Budi Santoso",
          "fotoUrl": "/uploads/...",
          "noHp": "+628123..."
        }
      }
    ],
    "memberCount": 15
  }
}
```

**Errors:**
- `404` — group tidak ditemukan / dismissed / private + no access

---

### ➕ Create / Update / Dismiss

#### `POST /admin/group`

Create group baru. Any authenticated jemaat bisa create (untuk community grouping).

**Body:**
```json
{
  "cabangId": "uuid",              // wajib
  "parentId": "uuid",              // opsional
  "nama": "Cell KFC Kelapa Gading", // wajib
  "deskripsi": "Homecell area KFC...",
  "jenis": "HOMECELL_STYLE",       // default LAINNYA
  "alamat": "Jl. Boulevard Raya",
  "gps": "-6.2088, 106.8456",
  "hari": "KAMIS",
  "jam": "19:00",
  "picJemaatId": "uuid",           // default = requester
  "isPublic": true,                // default true
  "isActive": true
}
```

Kalau `isPublic=false`, backend auto-generate `joinCode` unique 8-char. Kalau `picJemaatId` tidak di-set, PIC default = requester (creator).

**Response 201:** created Group object.

#### `PATCH /admin/group/:id`

Update group (PIC atau `isFulltimer=true` only). Semua field opsional.

**Body:** subset dari create schema. `null` untuk clear.

**Toggle visibility:**
- `isPublic: false` → auto-generate `joinCode` baru
- `isPublic: true` → auto-clear `joinCode` (set NULL)

**Response 200:** updated Group.

**Errors:** `403` (bukan PIC/admin), `404` (not found).

#### `DELETE /admin/group/:id`

Dismiss group (soft delete — `isActive=false`). Trigger **notif WA ke semua member** dengan pesan "Group X telah ditutup".

**Response 200:**
```json
{
  "success": true,
  "message": "Group \"Nama\" dismissed. 15 members di-notif.",
  "data": {...updated group}
}
```

**Auth:** PIC / admin.

#### `POST /admin/group/:id/regenerate-code`

Rotate `joinCode` (private group only). Untuk kasus kode leak — dulu kode di-share ke wrong person.

**Response 200:**
```json
{ "success": true, "data": { "id": "uuid", "joinCode": "X9K3M2P7" } }
```

**Errors:**
- `400` — kalau group public (public gak punya joinCode)
- `403` — bukan PIC/admin

---

### 👥 Membership actions

#### `POST /admin/group/:id/members/:jemaatId`

PIC add member direct (bypass approval workflow). Trigger **notif WA** ke jemaat "Anda baru saja bergabung ke Group X".

**Body (optional):**
```json
{ "catatan": "Direct add oleh Pak Jerry" }
```

**Response 200/201:**
```json
{
  "success": true,
  "message": "Budi Santoso berhasil ditambahkan",
  "data": { "alreadyMember": false }
}
```

**Idempotent** — kalau jemaat sudah ex-member (isActive=false), reactivate.

**Auth:** PIC / admin.

#### `DELETE /admin/group/:id/members/:jemaatId`

PIC remove member (soft — set isActive=false + tanggalKeluar=now). Trigger **notif WA** ke jemaat.

**Response 200:**
```json
{
  "success": true,
  "message": "Budi Santoso dikeluarkan dari group"
}
```

**Idempotent** — kalau sudah out sebelumnya, return `meta.alreadyRemoved: true`.

**Auth:** PIC / admin.

---

### 🚪 Self-service (member)

#### `POST /admin/group/:id/join`

**Untuk public group only.** Self-join tanpa approval.

**Response 200:**
```json
{
  "success": true,
  "message": "Berhasil bergabung ke Cell KFC Kelapa Gading"
}
```

Idempotent — kalau sudah member, return `alreadyMember: true`.

**Errors:**
- `403` — kalau group private ("Gunakan kode invitation via POST /admin/group/join-by-code")
- `404` — group tidak ditemukan / dismissed

#### `POST /admin/group/join-by-code`

Join private group via **kode invitation** (dari QR scan atau input manual).

**Body:**
```json
{ "code": "A3F7K9M2" }
```

**Response 200:**
```json
{
  "success": true,
  "message": "Berhasil bergabung ke Bandung Leaders",
  "data": { "groupId": "uuid", "groupNama": "Bandung Leaders" }
}
```

Idempotent + trigger notif WA "Anda baru bergabung".

**Errors:**
- `404` — kode tidak valid / expired / group dismissed

#### `DELETE /admin/group/:id/leave`

Self leave (member yg mundur voluntarily).

**Response 200:**
```json
{ "success": true, "message": "Keluar dari Cell KFC Kelapa Gading" }
```

Idempotent. **Auth:** any authenticated jemaat.

---

### 📱 Mobile "My Groups"

#### `GET /admin/me/group-membership`

List group yg current jemaat ikut (untuk tab "My Groups" di mobile).

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "membershipId": "uuid",
      "tanggalBergabung": "2026-06-15",
      "group": {
        "id": "uuid",
        "nama": "Cell KFC Kelapa Gading",
        "jenis": "HOMECELL_STYLE",
        "isPublic": true,
        "cabang": { "id": "uuid", "nama": "ECC Bandung" },
        "picJemaat": { "id": "uuid", "namaLengkap": "Pak Jerry", "fotoUrl": null },
        "memberCount": 15
      }
    }
  ]
}
```

Filter: `isActive=true` untuk membership DAN group.

---

## Mobile UX Recommendations

### 1. Browse Group Screen

```
┌──────────────────────────────────────┐
│  ← Group                              │
├──────────────────────────────────────┤
│  🔍 [ Search ...            ]         │
│                                       │
│  Filter: [Semua Cabang ▼] [Semua ▼]  │
│                                       │
│  ┌─ Cell KFC Kelapa Gading ─────────┐│
│  │ 🏠 HOMECELL_STYLE · Public       ││
│  │ ECC Bandung · Kamis 19:00        ││
│  │ 15 members · PIC: Pak Jerry      ││
│  │                          [ Join ] ││
│  └────────────────────────────────────┘│
│  ┌─ BRIDGE ────────────────────────┐│
│  │ 🤝 COMMUNITY · Public            ││
│  │ ...                              ││
│  └────────────────────────────────────┘│
└──────────────────────────────────────┘
```

Filter defaults:
- Cabang: user's cabang
- Jenis: semua

Backend call: `GET /admin/group?cabangId=<userCabang>&limit=50`

**Note**: private group tidak muncul di sini (backend filter). User cuma bisa akses via QR scan.

### 2. QR Scan Join

Mobile scan QR code yg contain joinCode (`A3F7K9M2`). Extract code → POST `/admin/group/join-by-code` `{code}` → response redirect ke group detail.

QR format rekomendasi: URL scheme `ecc://group/join?code=A3F7K9M2` (deeplink) atau plain text `A3F7K9M2` (fallback manual input).

### 3. Group Detail Screen

```
┌──────────────────────────────────────┐
│  ← Bandung Leaders                    │
│  🤝 MINISTRY · 🔒 Private             │
├──────────────────────────────────────┤
│  📍 Grand Ballroom Hotel Aston        │
│  📅 Kamis 19:00                       │
│                                       │
│  📝 Untuk leader & Zone Leader ECC   │
│      Bandung. Meeting mingguan...    │
│                                       │
│  👤 PIC: Pak Jerry                   │
│  👥 15 anggota                        │
│                                       │
│  [ Leave Group ]        (or)         │
│                                       │
│  ┌── Members ──────────────────────┐ │
│  │ • Budi Santoso                  │ │
│  │ • Maria Lestari                 │ │
│  │ ...                              │ │
│  └────────────────────────────────────┘│
└──────────────────────────────────────┘
```

**PIC view** (extra buttons):
```
  [ Add Member ] [ Regenerate Code ] [ Dismiss Group ]
```

### 4. Create Group Wizard

Multi-step form:
- Step 1: Cabang + Nama + Jenis
- Step 2: Deskripsi + Alamat + GPS (optional)
- Step 3: Jadwal (hari + jam optional)
- Step 4: Visibility (public/private) + assign PIC (default = self)
- Submit → POST /admin/group

Kalau private, response include `joinCode` — show ke user: "Kode invitation: **A3F7K9M2** [ Copy ] [ Show QR ]"

### 5. "My Groups" Tab (bottom nav)

Endpoint: `GET /admin/me/group-membership`

Sorted by tanggalBergabung desc. Tap group → detail screen.

---

## Notif WA — kapan trigger

Backend auto-trigger notif via `NotificationLog` (existing WA gateway Fonnte):

| Trigger | Type | Message |
|---|---|---|
| PIC add member manual | `GROUP_MEMBER_ADDED` | "Halo {nama}, Anda baru saja bergabung ke Group {nama}. Cek detail di aplikasi ECC." |
| User join via QR code | `GROUP_MEMBER_ADDED` | same |
| PIC remove member | `GROUP_MEMBER_REMOVED` | "Halo {nama}, Anda telah dikeluarkan dari Group {nama}. Kalau ada pertanyaan, hubungi PIC group." |
| PIC dismiss group | `GROUP_DISMISSED` | "Halo {nama}, Group {nama} telah ditutup. Kalau perlu group baru, hubungi PIC atau admin cabang." (1 notif per active member) |

Mobile tidak perlu handle notif (server-side via Fonnte WA gateway). Cuma perlu ensure jemaat.noHp valid supaya notif sampai.

---

## Rate limits

Semua endpoint di-wrap `adminLimiter` (300 req/menit/user). Normal usage aman.

Untuk join-by-code, rekomendasi mobile client:
- Cache last scanned QR selama 30 detik supaya user gak accidentally double-tap trigger duplicate join

---

## Error handling

| HTTP | Kondisi | Mobile UX |
|---|---|---|
| 400 | Invalid input / private group public join / regenerate on public | Show toast "Cek input Anda" |
| 401 | JWT invalid/expired | Auto-refresh via /auth/refresh, retry |
| 403 | Bukan PIC/admin untuk action | Hide button di UI (double-check backend) |
| 404 | Group tidak ada / dismissed / private + no access / invalid joinCode | Redirect ke browse list, show "Group tidak ditemukan" |
| 409 | (rare) duplicate constraint | Retry logic |

---

## Testing

Sample requests untuk local test (setelah dev server jalan):

```bash
# Get JWT dulu dari /auth/otp/verify
JWT="eyJ..."

# List Bandung groups
curl -H "Authorization: Bearer $JWT" \
  "http://localhost:4100/admin/group?cabangId=<bandung-uuid>&limit=5"

# Join via code
curl -X POST -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"code":"A3F7K9M2"}' \
  "http://localhost:4100/admin/group/join-by-code"

# My groups
curl -H "Authorization: Bearer $JWT" \
  "http://localhost:4100/admin/me/group-membership"
```

---

## Action items untuk Mobile

- [ ] Build **Browse Group** screen (list + filter cabang/jenis + search)
- [ ] Build **Group Detail** screen (info + members + PIC actions kalau applicable)
- [ ] Build **My Groups** tab (from `/me/group-membership`)
- [ ] Implement **QR scanner** untuk join-by-code (reuse existing scanner)
- [ ] Implement **QR generator** di group detail (untuk PIC share joinCode)
- [ ] Handle deeplink `ecc://group/join?code=xxx` (kalau mau)
- [ ] Notif in-app / push kalau di-add/removed dari group (optional — WA notif sudah cover)

---

## Deployment status

🚀 **LIVE per 2026-07-29** di `https://api.eccchurch.global`.

Sample test dari mobile dev (setelah punya JWT):
```bash
JWT="<paste-your-token>"

# List group Bandung
curl -H "Authorization: Bearer $JWT" \
  "https://api.eccchurch.global/admin/group?limit=10"

# My groups
curl -H "Authorization: Bearer $JWT" \
  "https://api.eccchurch.global/admin/me/group-membership"
```

Data import legacy bertahap via portal admin — beberapa cabang bisa masih kosong sementara admin selesaikan sync. Panggil `GET /admin/group?cabangId=X` untuk cek data availability per cabang.

---

## Contact + Follow-up

- **BE team:** IDEA dev (ping via ECC repo issue atau langsung)
- **Related docs:**
  - `backend-notice-shiftsoft-migration.md` — Group schema + 314 imported data
  - `backend-notice-magic-link-email-login.md` — login flow untuk legacy jemaat

Feature request/questions → `backend-request-group-*.md` di folder ini.

---

*Doc versi: 1.1 — 2026-07-29. Update log: v1.1 status DEPLOYED PRODUCTION + sample curl test.*
