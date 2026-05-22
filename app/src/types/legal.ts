// Legal document types per BE patch 22b.
// Endpoint: GET /public/legal/:key?lang=id|en
// :key = 'TERMS' | 'PRIVACY' (case-sensitive enum per BE)

export type LegalKey = 'TERMS' | 'PRIVACY';

export type LegalDocument = {
  key: LegalKey;
  language: 'id' | 'en';
  title: string;
  content: string; // markdown
  version: string; // ISO date "2026-05-22" — bump untuk re-acceptance
  publishedAt: string;
  updatedAt: string;
};
