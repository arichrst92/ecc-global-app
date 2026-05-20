# Backend Request: Multi-donation untuk Event Penggalangan Dana

**Untuk**: Tim Backend ECC (IDEA dev team)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-20
**Priority**: 🟡 **MEDIUM** — feature request untuk fundraising events
**Status**: 🔵 **DISCUSSION** — perlu alignment design dulu sebelum implement

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
