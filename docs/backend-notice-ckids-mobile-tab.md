# Backend Notice — CKids Mobile Tab (Point + Hadiah untuk Anak)

**Dari:** Tim Backend ECC (IDEA)
**Untuk:** Tim Mobile (Ari)
**Tanggal:** 2026-08-01
**Status:** ✅ Backend selesai local, pending deploy
**Related:**
- [`backend-notice-kids-ibadah-pickup.md`](./backend-notice-kids-ibadah-pickup.md) (Modul 27 — pickup code untuk kids ibadah)
- [`backend-notice-checkout-ibadah.md`](./backend-notice-checkout-ibadah.md) (Modul 26 — checkout)

---

## TL;DR

Modul 28 — point system + hadiah untuk anak. Admin operate redeem stall di **subdomain terpisah** `ckids.eccchurch.global` (bukan di mobile). Mobile side: cuma tab **CKids** untuk parent lihat point + katalog + history + QR anak.

Mobile deliverable:
1. Tab "CKids" di bottom nav — cuma tampil kalau user punya anak (via JemaatRelasi atau history check-in)
2. Halaman anak: point balance + QR + katalog browse + history redeem sendiri
3. **Tidak ada redeem di mobile** — anak harus datang fisik ke stall

---

## Schema baru (backend, sudah live setelah deploy)

| Tabel | Purpose |
|---|---|
| `hadiah_katalog` | Master hadiah per cabang (nama, foto, point cost, stock) |
| `jemaat_point_balance` | Balance per (jemaat, cabang) — composite PK |
| `point_transaction` | Audit log EARN / SPEND / ADJUST |
| `hadiah_redeem` | Transaksi redeem dgn snapshot nama+foto hadiah |

Enum: `PointTxType (EARN/SPEND/ADJUST)`, `PointSource (KEHADIRAN_KIDS/REDEEM/MANUAL_ADJUST/STOCK_ADD)`.

---

## Endpoints untuk mobile

### 1. Get point balance jemaat (anak)

```
GET /admin/gift-stall/lookup-jemaat?kode=<kode>&cabangId=<uuid>
Authorization: Bearer <JWT parent — atau Fulltimer>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jemaat": { "id": "...", "namaLengkap": "Budi Junior", "fotoUrl": null, "cabang": { "nama": "ECC Bandung" } },
    "cabangId": "uuid",
    "balance": 150,
    "lastUpdate": "2026-08-04T10:00:00Z"
  }
}
```

**Note**: endpoint ini gate Fulltimer di backend. Untuk mobile parent view, butuh endpoint parent-scoped baru:

⚠️ **Belum ada `GET /admin/me/children-points`** — kalau mobile mau, kirim `backend-request-me-children-points.md`. Untuk sementara, mobile bisa consume endpoint admin kalau user-nya Fulltimer parent.

Alternative simpler: extend `GET /admin/jemaat/:id` untuk include balance semua cabang → parent bisa lihat via existing endpoint dgn tambahan field response.

### 2. Get katalog hadiah cabang (browse, read-only)

```
GET /admin/hadiah?cabangId=<uuid>&isActive=true&limit=100
Authorization: Bearer <JWT>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "nama": "Robot LEGO",
      "deskripsi": "Set 45 pieces",
      "fotoUrl": "/uploads/hadiah/lego.webp",
      "pointCost": 200,
      "stock": 5,
      "isActive": true,
      "cabang": { "id": "...", "nama": "ECC Bandung" }
    }
  ],
  "meta": { "page": 1, "limit": 100, "total": 12, "totalPages": 1 }
}
```

### 3. Get history redeem jemaat (anak view)

```
GET /admin/gift-stall/redeems?cabangId=<uuid>&jemaatId=<uuid>
```

⚠️ Current endpoint filter cuma `cabangId + date + hadiahId + adminId`. Kalau perlu filter by jemaatId (untuk mobile parent view anak-nya sendiri), tambah param — trivial patch, kirim backend-request kalau perlu.

### 4. QR anak — sudah ada existing

`Jemaat.kode` field (8-char alphanumeric) yg display sebagai QR. Endpoint: `GET /admin/jemaat/:id` return kode. Mobile generate QR pakai library existing.

---

## Mobile UX Design (recommendation)

### Tab visibility rule

Tampil kalau salah satu:
- User punya relasi anak (`JemaatRelasi WHERE jemaatIdA=self AND tipeRelasi='Anak'`), ATAU
- User pernah check-in child (`Reservasi WHERE checkedInBy=self AND ibadah.isKidsIbadah=true`)

Belum ada endpoint dedicated — mobile bisa panggil `GET /admin/keluarga?jemaatId=self` (existing) + fallback query `Reservasi`. Atau tunggu backend expose `/admin/me/children` shortcut.

### CKids Tab Layout

```
┌─────────────────────────────────┐
│  🧒 CKids                       │
│                                  │
│  Anak: [Budi Junior ▼]          │  ← selector kalau multi anak
│                                  │
│  ┌─────────────────────────┐    │
│  │  Point Balance          │    │
│  │       150 pts            │    │
│  │  ECC Bandung             │    │
│  └─────────────────────────┘    │
│                                  │
│  [ 📱 Tunjukkan QR ke Stall ]   │
│                                  │
│  ─── Katalog Hadiah ───          │
│                                  │
│  ┌────┐ ┌────┐ ┌────┐            │
│  │📦  │ │🧸  │ │🎨  │  Grid       │
│  │200 │ │100 │ │50  │            │
│  └────┘ └────┘ └────┘            │
│                                  │
│  ─── Riwayat Redeem ───          │
│  • Robot LEGO ·  4 Agu  · -200   │
│  • Buku      ·  1 Agu  ·  -50    │
└─────────────────────────────────┘
```

### QR modal (tap tunjukkan QR)

Big QR image (240x240) + kode jemaat text di bawah. Fullscreen recommended untuk mudah di-scan di stall.

---

## Point earn timing

**Backend auto-award saat check-in kids ibadah** — admin scan QR anak masuk ke kids ibadah, dialog dgn input point amount + note (existing `POST /admin/reservasi/checkin` extended). Setelah check-in sukses, admin **secara terpisah** panggil:

```
POST /admin/reservasi/award-point
{ reservasiId, amount, note? }
```

Idempotent (guard via `source=KEHADIRAN_KIDS + referenceId=reservasiId`) — sekali award, tidak bisa ulang.

Ini digunakan **portal admin scanner ibadah**, bukan mobile. Mobile side cuma perlu tampil hasil balance-nya.

---

## Not implemented in mobile

- Redeem hadiah di app → **HARUS ke stall fisik**
- Add stock, adjust point, view report → **admin only di ckids.eccchurch.global**

---

## Deployment

Bundle bareng Modul 26 + 27:
- Migration: `20260801000000` (checkout), `20260801100000` (kids pickup), `20260801200000` (ckids hadiah)
- Backend endpoints: `/admin/reservasi/*` + `/admin/hadiah/*` + `/admin/gift-stall/*`
- New app: `apps/ckids` — deploy di subdomain `ckids.eccchurch.global` (butuh DNS + Nginx + SSL — see `docs/ckids-deploy-guide.md`)

Mobile UI update **tidak block backend deploy** — deploy backend + ckids web dulu, mobile update follows.

---

## Action items mobile

- [ ] Bikin tab "CKids" di bottom nav (conditional visibility)
- [ ] Anak selector (kalau punya multi anak)
- [ ] Point balance display (per cabang home anak)
- [ ] Katalog browse (read-only, tap for detail)
- [ ] QR anak fullscreen modal
- [ ] History redeem tab

Backend-request kalau butuh (belum di-implement):
- [ ] `GET /admin/me/children-points` — shortcut untuk parent lihat balance semua anak dalam 1 call
- [ ] Filter `jemaatId` di `/admin/gift-stall/redeems` (untuk history per anak)

---

*Doc versi: 1.0 — 2026-08-01.*
