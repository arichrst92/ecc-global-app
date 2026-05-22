# Backend Request: Legal Pages (Terms & Conditions, Privacy Policy) — Configurable

**Untuk**: Tim Backend ECC (IDEA dev team)
**Dari**: Mobile dev (Ari Christian)
**Tanggal**: 2026-05-22
**Priority**: 🟡 **MEDIUM** — Compliance + UX, blocking apps store submission (App Store + Play Store require Privacy Policy URL)
**Status**: 🆕 **PROPOSED**

## TL;DR

Mobile butuh halaman **Terms & Conditions (Syarat & Ketentuan)** dan **Privacy Policy (Kebijakan Privasi)** yang:

1. Configurable dari admin portal (legal team bisa update sendiri tanpa rebuild app)
2. Clickable dari login screen (audit trail "user accepted ToS")
3. Accessible juga dari profile/about page
4. Markdown-rendered content untuk formatting (heading, list, link, dll)

## Endpoint Request

```http
GET /admin/legal/:key
Authorization: optional (public endpoint — bisa diakses pre-login)

Where :key = "terms" | "privacy"

Response 200: {
  "success": true,
  "data": {
    "key": "terms" | "privacy",
    "title": "Syarat & Ketentuan ECC Global App",
    "content": "# Syarat & Ketentuan\n\n## 1. Penerimaan...\n\n...",  // markdown
    "version": "2026-05-22",        // ISO date — kalau berubah, mobile boleh re-prompt user
    "publishedAt": "2026-05-22T10:00:00Z",
    "updatedAt": "2026-05-22T10:00:00Z",
    "languages": {                   // optional, kalau multi-language
      "id": { "title": "...", "content": "..." },
      "en": { "title": "...", "content": "..." }
    }
  }
}
```

Mobile akan minta dengan locale preference: `?lang=id` / `?lang=en`. BE return content sesuai lang (kalau ada), fallback ke `id` kalau tidak ada terjemahan.

## Admin Portal Side

Admin (legal team) perlu page CRUD:
- 2 documents: Terms + Privacy (key fixed, content editable)
- Markdown editor untuk content
- Multi-language support (id wajib, en opsional)
- Publish version (bump `version` ISO date saat update)
- View history (audit trail siapa update kapan)

Schema suggestion:
```prisma
model LegalDocument {
  id              String   @id @default(uuid())
  key             LegalKey // enum TERMS | PRIVACY
  language        String   // "id" | "en"
  title           String
  content         String   @db.Text  // markdown
  version         String   // "2026-05-22" — bumped on each publish
  isPublished     Boolean  @default(true)
  publishedAt     DateTime
  createdAt, updatedAt
  publishedByUserId String
  @@unique([key, language])
}
enum LegalKey { TERMS  PRIVACY }
```

Hanya 1 row per (key, language) combination — newer publish overrides previous.

## Where it's used di mobile

1. **Login screen** — link kecil di bottom: "Dengan masuk, Anda menyetujui [Syarat & Ketentuan] dan [Kebijakan Privasi]"
2. **Signup screen** — required checkbox "Saya setuju dengan ToS + PP" sebelum submit
3. **Profile → About → Legal section** — links ke kedua halaman untuk re-read
4. **Major version bump of legal docs** — kalau `version` lebih baru dari yang user terakhir-setujui, prompt re-acceptance (future enhancement, not in MVP)

## Pages mobile akan render

- `app/legal/terms.tsx` — fetch GET /admin/legal/terms?lang=<id|en>, render markdown
- `app/legal/privacy.tsx` — same untuk privacy
- Markdown renderer: pakai `react-native-markdown-display` atau equivalent (perlu npm install)

## Effort estimate BE

- Schema + migration + seed initial content: 30 min
- GET endpoint with lang fallback: 30 min
- Admin portal CRUD with markdown editor: 3-4 jam
- Initial T&C + PP content drafting (legal team): 2-4 jam (di luar dev scope)

Total dev: **~4-5 jam BE work**, + legal team time untuk content.

## Action items BE

- [ ] Schema + migration LegalDocument
- [ ] GET /admin/legal/:key dengan lang query param + fallback
- [ ] Admin portal Settings → Legal Documents page
- [ ] Seed initial placeholder content (legal team isi sebelum production)
- [ ] Public endpoint (skipAuth) supaya pre-login bisa akses
- [ ] Document di mobile-api-guide section baru

## Mobile-side plan (after BE ready)

- `src/api/legal.ts` — `getLegalDocument(key, lang)`
- `src/hooks/useLegal.ts` — React Query wrapper
- `app/legal/terms.tsx` + `app/legal/privacy.tsx` — markdown viewer pages
- Login screen — add legal acceptance text dengan 2 clickable links
- Profile About page — add Legal section dengan 2 links
- npm install `react-native-markdown-display` (~50KB, no native deps)

Mobile-side estimasi: **2-3 jam** setelah BE ready (incl npm install + markdown render integration).

## Notes

- **App Store + Play Store wajib**: Privacy Policy URL — di-list di submission form. URL bisa pakai public web hosting (mis. https://ecc.id/privacy) yang fetch sama BE source — OR pakai backend route `https://api.ecc.id/legal/privacy` (BE serve HTML versi) — kedua-nya valid.
- **Versioning** — `version` field bump tiap kali content update, mobile bisa cache + check version untuk avoid unnecessary refetch.
- **Multi-language** — id wajib (Indonesian church), en optional (kalau ada user non-ID). Mobile fallback ke id kalau en tidak tersedia.
