# Backend Request: Ibadah Detail Petugas / Volunteer Display

**Untuk**: Tim Backend ECC (IDEA dev team)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-22
**Priority**: 🟡 **MEDIUM** — UX clarity, data udah ada tapi belum muncul
**Status**: 🆕 **PROPOSED**

## TL;DR

Mobile rendering UI sudah ready untuk tampil **petugas pelayanan (volunteer)**
di halaman detail ibadah, tapi BE response `GET /admin/ibadah/:id` tidak
return field `petugas` (atau return empty array). User feedback iter 11:
"data volunteer di detail ibadah belum muncul".

Mobile saat ini fallback ke text "Petugas akan diumumkan" (TBA) — tidak ideal
karena admin sudah assign petugas di portal.

## Mobile expectation

Type sudah didefinisikan di `src/types/ibadah.ts`:

```typescript
export type IbadahDetail = IbadahListItem & {
  deskripsi?: string | null;
  petugas?: IbadahPetugas[];
};

export type IbadahPetugas = {
  id: string;
  pelayananNama: string;  // mis. "Worship", "Multimedia", "Usher"
  jemaat: {
    id: string;
    namaLengkap: string;
    fotoUrl?: string | null;
  };
  role: string;  // "Leader", "Member"
};
```

Tampilan mobile (lihat `app/ibadah/[id].tsx` line ~129-149):
- Section "Petugas Pelayanan" dengan icon Users
- List tiap petugas: avatar + nama jemaat + `{pelayananNama} · {role}` sub
- Empty state: "Petugas akan diumumkan" (`team_tba` i18n key)

## Apa yang BE perlu confirm

1. **Endpoint shape**: Apakah `GET /admin/ibadah/:id` sekarang include
   field `petugas`? Cek query Prisma — apakah include relation `IbadahPetugas`
   (atau apa pun nama BE model-nya)?

2. **Source of truth**: Petugas di-assign via portal admin halaman mana?
   `/dashboard/ibadah/:id` ada section "Assign Petugas"? Kalau iya, data
   tersimpan di table apa? `ibadah_petugas`? Kemungkinan model name:
   - `IbadahPetugas` (junction table jemaat × ibadah dengan role + pelayanan)
   - OR `Jadwal` (per-occurrence assignment)
   - OR pakai existing `JemaatPelayanan` (ministry membership) + ibadah relationship

3. **Per-occurrence vs per-ibadah-master**: Mobile saat ini terima `tanggal`
   query param di route `/ibadah/:id?tanggal=<date>`. Petugas bisa berbeda
   per minggu (mis. "Worship Leader rotasi: Minggu 1 Andi, Minggu 2 Budi").
   Apakah BE return petugas spesifik untuk tanggal yang diminta, atau
   default petugas tetap dari master schedule?

   **Mobile rekomendasi**: BE accept query param `?tanggal=YYYY-MM-DD` di
   `GET /admin/ibadah/:id` dan return petugas spesifik untuk occurrence
   tersebut. Kalau tidak ada assignment khusus → fallback ke default master.

4. **Field naming consistency**: Confirm field names match — `pelayananNama`
   (string) bukan `pelayananId` (uuid). Mobile butuh display name langsung
   tanpa join tambahan ke /admin/pelayanan.

## Expected response shape

```json
{
  "success": true,
  "data": {
    "id": "ibadah-id",
    "nama": "Ibadah Minggu",
    "tipeJadwal": "WEEKLY",
    "hari": "Minggu",
    "tanggalMulai": "2026-01-01T00:00:00.000Z",
    "jamMulai": "09:00",
    "jamSelesai": "11:00",
    "lokasi": "Aula Utama",
    "isOnline": false,
    "cabang": { "id": "...", "nama": "ECC Jakarta" },
    "kategoriIbadah": { "id": "...", "nama": "Umum" },
    "deskripsi": "Ibadah umum tiap Minggu pagi.",
    "petugas": [
      {
        "id": "petugas-row-id",
        "pelayananNama": "Worship",
        "role": "Leader",
        "jemaat": {
          "id": "jemaat-id-1",
          "namaLengkap": "Andi Pratama",
          "fotoUrl": "/uploads/foto/abc.jpg"
        }
      },
      {
        "id": "petugas-row-id-2",
        "pelayananNama": "Multimedia",
        "role": "Operator Sound",
        "jemaat": {
          "id": "jemaat-id-2",
          "namaLengkap": "Budi Santoso",
          "fotoUrl": null
        }
      }
    ]
  }
}
```

## Edge cases

- Kalau ibadah belum ada petugas assigned → return empty array `petugas: []`
  (mobile sudah handle dengan fallback "Petugas akan diumumkan")
- Filter `isActive: true` di jemaat — jangan tampil petugas yang sudah
  nonaktif
- Sort: by `pelayanan.level` DESC (Leader/Senior dulu), lalu by nama

## Catatan tambahan: reservasi ibadah

User juga tanya: "untuk ibadah saat ini apakah perlu reservasi?"

**Jawaban (current design)**: TIDAK. Ibadah model adalah **walk-in**:
- Jemaat datang ke ibadah → admin scan QR jemaat → row Kehadiran tercipta
- Tidak ada flow registrasi pre-event seperti event
- Tidak ada quota peserta (selain kapasitas venue physical)
- Tidak ada bayar untuk hadir ibadah

Beda dengan event yang punya: `register_now` → confirmation → payment/donation
→ upload bukti → status DAFTAR/BAYAR/HADIR. Ibadah hanya HADIR (via scan).

Mobile-side keputusan ini consistent dengan tipe data — `IbadahListItem`
tidak punya field `quotaPeserta`, `tipeBayar`, atau `pesertaCount`.

## Effort estimate BE

- Investigation: apakah BE sudah return petugas?
- Kalau belum: extend query Prisma + serialize: **1-2 jam**
- Kalau sudah ada di portal admin tapi belum exposed mobile: 30 menit
- Kalau perlu schema baru: **3-4 jam**
- Per-occurrence petugas (kalau diputuskan support): tambah **2-3 jam**

Total estimate: **1-4 jam** tergantung state existing.

## Action items BE

- [ ] Confirm: apakah `GET /admin/ibadah/:id` sudah include `petugas` array?
- [ ] Kalau belum, extend response shape sesuai spec di atas
- [ ] Confirm petugas data source (table name + relations)
- [ ] Decision: per-occurrence atau master-level petugas? (rekomendasi
      mobile: per-occurrence via `?tanggal=` query)
- [ ] Test dengan ibadah yang sudah ada petugas assigned via portal
- [ ] Update mobile-api-guide section 4 dengan petugas response shape

## Mobile-side plan

Tidak ada perubahan mobile yang dibutuhkan — UI dan type sudah ready.
Setelah BE return data dengan shape yang benar, petugas section langsung
muncul tanpa code change.

Optional enhancement (future): tap nama petugas → /jemaat/[id] view-only
profile.
