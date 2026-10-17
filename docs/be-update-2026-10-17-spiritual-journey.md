# BE Update: Spiritual Journey

**Date**: 2026-10-17

## `GET /admin/me/spiritual-journey`

```jsonc
{
  "total": 5, "achievedCount": 2, "nextIndex": 2,
  "steps": [{
    "id": "…", "urutan": 1, "judul": "Expand Class", "deskripsi": "…", "caraMendapatkan": "…", "ikon": "🌱",
    "syarat": { "role": "Jemaat", "subRole": "Jemaat Tetap", "status": "Expand" },
    "achieved": false, "isNext": true,
    "events": [{ "id": "…", "judul": "Kelas Expand Okt", "tanggalMulai": "…", "jamMulai": "19:00", "lokasi": "…", "cabang": { "id": "…", "nama": "…" } }]
  }]
}
```

- **Tahap global dan berurutan**, diatur di portal (menu Spiritual Journey). Hanya tahap yang aktif yang dikirim.
- **`achieved`:** jemaat punya JemaatRole aktif yang cocok dengan role, sub role (opsional), dan status (opsional) tahap tersebut.
- **`isNext`:** tahap pertama yang belum tercapai.
- **`events`:** maksimal 3 event mendatang dari cabang saya atau global, published, yang role/status-nya sesuai syarat tahap. Hanya terisi untuk tahap yang belum tercapai.

## Mobile

- **Profil:** kartu `JourneyCard` menampilkan progres dan tahap berikutnya. Kartu ini tersembunyi kalau gereja belum membuat tahap.
- **Layar `app/spiritual-journey.tsx`:** timeline yang menampilkan status, syarat, cara mendapatkan, dan event terkait.
