# Backend Request: Multi-donation untuk Event Penggalangan Dana

**Untuk**: Tim Backend ECC (IDEA dev team)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-20
**Priority**: 🟡 **MEDIUM** — feature request untuk fundraising events
**Status**: ✅ **RESOLVED 2026-05-21** — Opsi B (sub-table EventDonation) di-implement. Lihat section "Implementation Summary" di akhir doc.

---

## TL;DR

Saat ini event dengan `tipeBayar=NOMINAL_BEBAS` (penggalangan dana / persembahan sukarela) hanya support **1 partisipasi per jemaat per event**. User yang ingin memberi donasi kedua/ketiga ke event yang sama (mis. fundraising pembangunan gedung) tidak bisa karena BE return 409 CONFLICT.

**Permintaan**: design pattern untuk support multi-donation per jemaat per event.

---

## Problem statement

### Current model (1-to-1)

```
Jemaat A → Event Fundraising Gedung
  └── EventParticipation { id, jemaatId, eventId, nominalBayar=500_000, status=BAYAR }

Jemaat A tap "Daftar" lagi (mau donasi 200_000 lagi)
  → POST /admin/event/:id/peserta
  → BE: 409 CONFLICT — sudah terdaftar
  → User tidak bisa donasi lagi
```

### Use cases yang broken

1. **Fundraising pembangunan** — jemaat sering memberi cicilan setiap bulan (Rp 500k Januari, Rp 500k Februari, dst). Pattern Jan + Feb adalah 2 donasi terpisah ke 1 event.
2. **Persembahan misi** — event galang dana misi ke negara X, jemaat mungkin memberi initial Rp 1jt lalu top-up Rp 500k 2 minggu kemudian.
3. **Akhir tahun** — event "Persembahan Tahunan", jemaat memberi via app berkali-kali (gajian, bonus, dll).

Saat ini workaround: user pakai **Persembahan tab** (rekening cabang langsung) untuk donasi berikutnya. Tapi:
- Data tidak ter-link ke event spesifik
- Admin tidak bisa report "total fundraising event X"
- Jemaat tidak punya history donasi per event

---

## Opsi design

### Opsi A — Multiple participations per jemaat-event (model change)

Hapus unique constraint `(eventId, jemaatId)` di EventParticipation. Setiap "donasi" = row baru dengan status BAYAR + bukti terpisah.

**Pro**:
- Clean data model untuk fundraising
- Setiap donasi punya bukti transfer & timestamp sendiri
- Admin bisa lihat list semua donasi per event
- Mobile bisa tampil "Anda sudah memberi 3x total Rp 1.500.000 untuk event ini"

**Con**:
- Breaking change di unique constraint
- Migration untuk existing data
- Confusing untuk event reguler (mis. retreat) — apa user bisa "daftar 2x"?
- BE perlu kondisi: NOMINAL_BEBAS bolehkan multi, NOMINAL_TETAP/GRATIS tidak
- UI mobile butuh "Tambah Donasi" button (bukan "Daftar Sekarang") setelah donasi pertama

**Endpoint changes**:
- `POST /admin/event/:id/peserta` — kalau NOMINAL_BEBAS, allow create row baru walau sudah ada
- `GET /admin/event/:id/peserta/me` — return SEMUA donations user ini (array, not single)
- `myParticipation` di detail jadi `myParticipations: EventParticipation[]`
- Cancel endpoint — `DELETE /admin/event/:id/peserta/me/:participationId` (per row)

### Opsi B — Sub-table "Donations" untuk fundraising

EventParticipation tetap 1-to-1 (registration commitment). Tambah table baru `EventDonation`:

```
EventParticipation
  - id, jemaatId, eventId, status (DAFTAR commitment)
  - totalDonatedAmount (derived dari sum donations)

EventDonation
  - id, participationId, nominalBayar, buktiTransferUrl, paidAt, status (MENUNGGU_VERIFIKASI / BAYAR)
```

**Pro**:
- Separation of concerns — registration ≠ donation
- Bisa register tanpa donasi (commitment), donasi tanpa register (anonymous)
- Multi-donation natural per donation row
- Tidak breaking existing event flow (retreat, kkr tetap pakai EventParticipation only)

**Con**:
- Lebih complex schema
- BE endpoint baru: `POST/GET/DELETE /admin/event/:id/donations/me`
- Mobile flow: register sekali → tap "Beri Donasi" berkali-kali

### Opsi C — Pakai existing Persembahan tab + tag event (lightweight)

Tetap pakai endpoint Persembahan rekening, tapi tambah optional `eventId` di body. BE simpan donation rekening dengan tag event.

```
POST /admin/persembahan
{
  "rekeningId": "rek-555-...",
  "nominalBayar": 200_000,
  "buktiTransferUrl": "...",
  "eventId": "evt-fundraising-..." // OPTIONAL — tag ke event
}
```

**Pro**:
- Reuse existing flow (jemaat sudah familiar dengan Persembahan tab)
- Minimal BE change — just add optional field
- Multi-donation natural (Persembahan endpoint sudah multi by design)

**Con**:
- Belum jelas apakah ada endpoint POST /admin/persembahan saat ini (saya cek di api guide tidak ada — perlu konfirmasi)
- Persembahan table mungkin belum ada di BE
- Bukti transfer di donations terpisah dari event participation row

### Opsi D — Status quo + Persembahan tab (no BE change)

User cuma register 1x dengan nominal initial commitment. Untuk top-up, user pakai Persembahan tab biasa. Mobile tampil notice di event fundraising:

> "Sudah memberi? Lanjutkan persembahan via menu Persembahan / Rekening Cabang."

**Pro**:
- Zero BE change
- Cepat ship

**Con**:
- Data terpisah — admin tidak tahu top-up via Persembahan itu untuk event mana
- No history per event untuk user
- UX kurang clean — user perlu navigate ke tab terpisah

---

## Rekomendasi mobile

**Short-term (sambil diskusi design)**: Opsi D — tampil notice di event NOMINAL_BEBAS yang sudah punya participation user, arahkan ke Persembahan tab untuk top-up.

**Long-term**: Opsi B (sub-table Donations) — paling clean separation, tidak breaking existing flow, support natural multi-donation.

Opsi A risky karena breaking existing constraint dan butuh complex BE logic untuk distinguish NOMINAL_BEBAS vs others.

---

## Questions untuk BE team

1. **Apakah ada concrete request dari admin** untuk fitur multi-donation ini? Atau speculative future need?
2. **Apakah ada table `Persembahan`/`Donation` di BE** yang sudah track giving per cabang? Kalau ada, mungkin tinggal extend dengan optional eventId.
3. **Apakah admin perlu report "Total fundraising per event"** yang membedakan komitmen vs realisasi? Itu menentukan apakah commitment + donations dipisah (opsi B) atau cukup multi-row participation (opsi A).
4. **Timeline urgensi** — apakah ada event fundraising besar yang akan launch dalam 1-2 bulan? Kalau ya, butuh keputusan cepat.

---

## Action items

- [ ] BE + Mobile + Admin team meeting untuk align design (rekomendasi: 30 menit)
- [ ] Decide opsi A / B / C / D
- [ ] Update mobile-api-guide.md dengan spec final
- [ ] Implementation (BE + mobile)

---

## Kontak

Mobile dev — Ari Christian (`arichrst@ide.asia`)

---

# Backend Analysis — 2026-05-21

**Dari**: Tim Backend ECC (IDEA dev team)
**Untuk**: Mobile dev (Ari Christian) + Product Owner
**Status**: 🔵 **AWAITING PRODUCT DECISION** — code belum di-implement sampai opsi di-finalize.

## Jawaban 4 questions dari mobile

### 1. Apakah ada concrete request dari admin untuk multi-donation?

**Belum**, sepanjang yang kami tahu. Tapi pattern fundraising berulang (event "Pembangunan Gedung", "Persembahan Misi", "Tahunan") **memang realistic** untuk gereja ECC — bukan speculative future need. Sebaiknya ditanyakan ke product owner / admin cabang sebelum decide.

### 2. Apakah ada table `Persembahan`/`Donation` di BE?

**Belum**. Schema saat ini tidak punya tabel khusus untuk giving generic. Yang ada:
- `EventParticipation` — registrasi event dengan optional `nominalBayar` + `buktiTransferUrl` (1-to-1 jemaat-event via unique constraint)
- `CabangRekening` — info rekening per cabang (mis. "Persembahan Umum", "Pembangunan Gedung") dengan QRIS, tapi **tidak ada track transaksi giving** yang masuk ke rekening tersebut

Artinya saat ini admin tidak punya cara digital untuk lihat siapa yang sudah giving ke rekening cabang — itu masih manual (cek mutasi bank, rekonsiliasi spreadsheet).

Implikasi: **opsi C** (extend Persembahan endpoint) **tidak applicable** karena endpoint Persembahan generic belum ada. Kalau mau lanjutin opsi C, perlu build tabel `Persembahan` dari scratch dulu — itu sendiri sebuah project.

### 3. Admin perlu report "Total fundraising per event"?

Sangat mungkin **ya** untuk event fundraising (admin perlu tau progress vs target). Tapi belum ada spec eksplisit. Kalau memang dibutuhkan, ini mendukung **opsi B** (sub-table Donations) — karena registrasi commitment vs realisasi donation perlu di-track terpisah.

Untuk event reguler (retreat, KKR, ibadah khusus), report-nya lebih simple — counts peserta + total nominal terbayar. Opsi current sudah cukup.

### 4. Timeline urgensi?

Saat ini **tidak ada event fundraising besar yang launching dalam 1-2 bulan** yang kami tahu. Kalau ada planning, mohon di-flag. Tanpa pressure deadline, lebih baik decide design carefully daripada rush.

## BE evaluation per opsi

### Opsi A — Multiple participations per (event, jemaat)

**Verdict BE**: ⚠ **Tidak rekomendasi**.

- Drop unique constraint `(eventId, jemaatId)` adalah migration **mahal** — semua existing pattern dan endpoint assume 1-to-1 (mis. `myParticipation` di event detail, `idempotent register` flow, `self-cancel` endpoint).
- BE perlu kondisi compleks: NOMINAL_BEBAS bolehkan multi, NOMINAL_TETAP/GRATIS tidak. Easy untuk salah.
- Edge case mengkhawatirkan: kalau user salah register 2x untuk event retreat (NOMINAL_TETAP), mereka punya 2 row dan slot kuota ke-count 2 — admin hapus salah satu? Mana yang "real"?
- Refactor banyak endpoint: get/cancel/list/myParticipation semua jadi handle array.

### Opsi B — Sub-table Donations

**Verdict BE**: ✅ **Rekomendasi long-term**.

- Pisah concern: `EventParticipation` = commitment, `EventDonation` = transaksi realisasi.
- Tidak breaking existing flow — event retreat/KKR tetap pakai EventParticipation only (donations[] kosong).
- Multi-donation natural per donation row, dengan bukti transfer + paidAt sendiri per donation.
- Schema proposed BE-side:

```prisma
model EventParticipation {
  // ... existing fields tetap
  donations EventDonation[]
  // Optional derived field via @@view atau computed di handler:
  // totalDonatedAmount = SUM(donations.nominalBayar WHERE status=BAYAR)
}

model EventDonation {
  id                String   @id @default(uuid()) @db.Uuid
  participationId   String   @map("participation_id") @db.Uuid
  nominalBayar      Decimal  @db.Decimal(15, 2)
  buktiTransferUrl  String?  @map("bukti_transfer_url") @db.Text
  status            EventDonationStatus @default(MENUNGGU_VERIFIKASI)
  paidAt            DateTime? @map("paid_at")
  approvedBy        String?  @map("approved_by") @db.Uuid
  approvedAt        DateTime? @map("approved_at")
  catatan           String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  participation EventParticipation @relation(fields: [participationId], references: [id], onDelete: Cascade)
  approver      Jemaat? @relation(fields: [approvedBy], references: [id], onDelete: SetNull)

  @@index([participationId])
  @@index([status])
  @@map("event_donation")
}

enum EventDonationStatus {
  MENUNGGU_VERIFIKASI
  BAYAR
  BATAL
}
```

Endpoint:
```
POST   /admin/event/:id/donations           # mobile create donation baru
GET    /admin/event/:id/donations           # admin list semua donations
GET    /admin/event/:id/donations/me        # mobile list donations user
POST   /admin/event/:id/donations/:donationId/bukti  # upload bukti per donation
POST   /admin/event/:id/donations/:donationId/approve  # admin approve
DELETE /admin/event/:id/donations/:donationId  # admin / owner cancel donation
```

**Effort estimasi BE**: 2-3 hari implement + test, plus migration script untuk move existing `EventParticipation.nominalBayar/buktiTransferUrl` jadi single `EventDonation` row per existing participation.

### Opsi C — Pakai Persembahan endpoint + tag eventId

**Verdict BE**: ❌ **Tidak feasible saat ini**.

Tabel `Persembahan` generic belum ada. Build dari scratch = bigger project daripada opsi B. Defer.

### Opsi D — Status quo + redirect ke Persembahan tab

**Verdict BE**: ✅ **Acceptable untuk short-term**, **❌ tidak cocok untuk long-term**.

Pro: zero BE change, cepat ship.

Con yang signifikan:
- Data persembahan top-up via rekening tidak ter-link ke event. Admin tidak bisa report "total fundraising event X" — harus manual rekonsiliasi.
- Jemaat tidak punya history giving per event di app.
- "Persembahan tab" pun belum ada concrete BE endpoint, jadi mobile harus tampil rekening manual (sudah ada via `GET /admin/cabang/:id/rekening`).

## Rekomendasi BE

**Phased rollout**:

1. **Now (no BE change)**: Pakai opsi D — di event detail NOMINAL_BEBAS yang user sudah punya participation, tampil info card:

   > 💡 Sudah memberi? Untuk top-up donasi, transfer langsung ke rekening cabang via menu **Persembahan**.

   Mobile bisa link ke `/cabang/{userCabangId}/rekening` atau Persembahan tab.

2. **Phase 2 (kalau ada concrete need fundraising)**: Implement opsi B (sub-table `EventDonation`). BE estimate 2-3 hari + migration. Mobile adopt: tambah "Beri Donasi" button + list donations history per event.

3. **Long-term**: Build separate `Persembahan` / `Donation` table generic (terpisah dari event) untuk track all giving — opsional tag dengan `eventId`. Ini lebih besar scope dan terpisah dari iteration ini.

## Decision needed (product owner)

| Pertanyaan | Decision |
|---|---|
| Apakah ada concrete plan event fundraising 1-3 bulan ke depan? | ☐ Ya — proceed opsi B / ☐ Tidak — opsi D dulu |
| Admin butuh "total fundraising per event" report? | ☐ Ya — opsi B / ☐ Tidak — opsi D cukup |
| Apakah perlu giving history per jemaat (UX feature)? | ☐ Ya — opsi B / ☐ Tidak — opsi D cukup |
| Timeline target? | ☐ Now / ☐ 1-2 bulan / ☐ Defer |

Setelah product decision, BE akan:
- Opsi D → mobile patch only (BE tidak ada work)
- Opsi B → BE implement 2-3 hari sprint, update KB + mobile-api-guide

## File yang BELUM berubah

**Penting**: code belum di-modify. Setelah opsi di-finalize, baru BE akan implement. Saat ini analysis only.

## Note untuk product owner

Saran: ini bisa dibahas di sync meeting 30 menit (mobile + BE + product). Bawa:
- Use case concrete fundraising 6 bulan terakhir (kalau ada)
- Forecast event fundraising 1 tahun ke depan
- Decision keempat pertanyaan di atas

Setelah meeting, update doc ini dengan keputusan, lalu BE proceed implement.

---

*Analysis closed 2026-05-21. Awaiting product owner decision sebelum implementation.*

---

# Implementation Summary — 2026-05-21 (Opsi B)

**Dari**: Tim Backend ECC (IDEA dev team)
**Status**: ✅ **DELIVERED**
**Product decision**: Opsi B (sub-table `EventDonation`).
**Swagger**: `{BASE_URL}/docs#/Movement-·-Event` — tag "Movement · Event" sekarang punya 7 endpoint donation baru.

## Schema

```prisma
model EventDonation {
  id              String   @id @default(uuid()) @db.Uuid
  participationId String   @db.Uuid
  nominalBayar    Decimal  @db.Decimal(15, 2)
  buktiTransferUrl String? @db.Text
  status          EventDonationStatus @default(MENUNGGU_VERIFIKASI)
  catatan         String?  @db.Text
  paidAt          DateTime?
  approvedBy      String?  @db.Uuid
  approvedAt      DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  participation EventParticipation @relation(...)
  approver      Jemaat? @relation("EventDonationApprover")

  @@index([participationId])
  @@index([status])
  @@index([paidAt])
}

enum EventDonationStatus {
  MENUNGGU_VERIFIKASI | BAYAR | BATAL
}
```

`EventParticipation.nominalBayar/buktiTransferUrl/paidAt/approvedBy/approvedAt` **tetap di schema** untuk backward-compat. New code harus pakai `EventDonation`.

## Migration

`packages/database/prisma/migrations/20260521150000_event_donation/migration.sql`:
1. Create enum `event_donation_status`
2. Create table `event_donation` + FK + 3 index
3. Backfill: untuk setiap `EventParticipation` yang punya payment data (nominalBayar > 0 OR buktiTransferUrl IS NOT NULL OR status MENUNGGU/BAYAR), INSERT 1 `EventDonation` row dengan status mapping sesuai EventParticipation.status

## 7 Endpoint baru

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/event/:id/donations` | Admin list (paginated) + `meta.totalAmountConfirmed` |
| GET | `/admin/event/:id/donations/me` | Mobile list own + `meta.totalConfirmed` |
| POST | `/admin/event/:id/donations` | Create (auto-resolve/create participation) |
| GET | `/admin/event/:id/donations/:donationId` | Detail |
| PATCH | `/admin/event/:id/donations/:donationId` | Admin update status/nominal |
| POST | `/admin/event/:id/donations/:donationId/bukti` | Upload bukti (multipart, flexImageUpload) |
| POST | `/admin/event/:id/donations/:donationId/approve` | Admin shortcut → BAYAR |
| DELETE | `/admin/event/:id/donations/:donationId` | Soft cancel, idempotent |

## Behavior

**Auto-resolve participation**: kalau user POST /donations tanpa register dulu, BE auto-create `EventParticipation` status DAFTAR. Tidak perlu 2-step flow di mobile.

**Validasi nominal per `event.tipeBayar`**:
- `GRATIS` → 400 BadRequest
- `NOMINAL_TETAP` → harus tepat `== event.nominal`
- `NOMINAL_BEBAS` → harus `>= event.nominal` (kalau di-set minimum)

**Idempotent cancel**: DELETE BATAL row → 200 dengan `meta.alreadyCancelled: true`.

**Soft cancel**: row tidak hard-delete. File bukti di-hapus best-effort.

## Fundraising progress query

Admin endpoint `GET /donations` return:

```json
{
  "data": [...],
  "meta": {
    "page": 1, "limit": 50, "total": 23, "totalPages": 1,
    "totalAmountConfirmed": 12500000
  }
}
```

`totalAmountConfirmed` = aggregate SUM(donations.nominalBayar WHERE status=BAYAR) untuk event ini. Mobile/portal pakai untuk progress bar.

## Storage helper baru

`apps/core-api/src/lib/storage.ts`:
- `saveEventDonationBukti(donationId, buffer)` → `/uploads/content/event/donation-bukti/{donationId}.webp`
- `deleteEventDonationBukti(donationId)`

Per-donation file (vs single per-participation di flow lama). Multi-donation tetap have unique bukti file.

## Mobile UI rekomendasi (dari implementation guide section 5.7)

- **NOMINAL_BEBAS**: tab "Donations history" di event detail dengan list cards + total + tombol "Beri Donasi Lagi"
- **NOMINAL_TETAP**: registration + 1 donation, dengan upload bukti
- **GRATIS**: tidak ada donation UI

## File yang berubah

| File | Perubahan |
|---|---|
| `packages/database/prisma/schema.prisma` | Model `EventDonation` + enum + relasi |
| `packages/database/prisma/migrations/20260521150000_event_donation/migration.sql` | NEW — create + backfill |
| `packages/shared-types/src/schemas/event.ts` | `createEventDonationSchema`, `updateEventDonationSchema`, enum |
| `apps/core-api/src/lib/storage.ts` | `saveEventDonationBukti` + delete |
| `apps/core-api/src/routes/admin/event.ts` | 7 handler donations + helper `ensureParticipation` |
| `apps/core-api/src/openapi.ts` | Register 7 path baru di tag Movement · Event |
| `docs/mobile-api-guide.md` | Section **5.7 Event Donations** lengkap (~250 lines) + Gap Status table |
| `knowledge-base.md` | Section 26 patch **2026-05-21l** |

## Action item untuk mobile team

- [ ] Implement `useEventDonations(eventId)` hook di `src/api/event.ts`
- [ ] Tambah `donationsApi.create(eventId, { nominalBayar, catatan })`, `donationsApi.uploadBukti(donationId, file)`, etc
- [ ] Event detail page (NOMINAL_BEBAS): tab "Donations history" + tombol "Beri Donasi (Lagi)"
- [ ] Sync ke local store `useEventFlowStore` — tambah `donations` array per participation
- [ ] Update form flow: untuk paid event, setelah register optional POST /donations
- [ ] Handle status display: MENUNGGU_VERIFIKASI (kuning), BAYAR (hijau), BATAL (abu-abu)

## Untouched (tetap backward-compat)

- Existing `EventParticipation` fields (`nominalBayar`, `buktiTransferUrl`, `paidAt`, `approvedBy`, `approvedAt`) — masih ada untuk legacy data
- Endpoint lama `/peserta/:participationId/bukti`, `/peserta/:participationId/approve` masih jalan (deprecated, mobile silakan migrate ke `/donations/*` flow)
- `myParticipation` field di event detail tetap di-return tanpa donations[] join (mobile fetch terpisah via `GET /donations/me` kalau butuh)

## User perlu run di local

```bash
pnpm install                                    # Prisma client (kalau ada update)
pnpm db:generate                                 # regenerate Prisma client untuk EventDonation
pnpm --filter @ecc/database db:migrate dev       # apply migration
```

---

*Ticket closed 2026-05-21. Mobile team silakan adopt — endpoint live di Swagger.*
