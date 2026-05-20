/**
 * News & Renungan API — mobile-api-guide section 7.
 */

import { api } from './client';
import type { NewsItem, RenunganItem } from '@/types/content';

type ListOptions = {
  page?: number;
  limit?: number;
};

function buildQuery(opts: ListOptions, extras: Record<string, string> = {}): string {
  const params = new URLSearchParams({ isPublished: 'true', ...extras });
  if (opts.page) params.set('page', String(opts.page));
  if (opts.limit) params.set('limit', String(opts.limit));
  return params.toString();
}

/** GET /admin/news?isPublished=true */
export function listNews(opts: ListOptions = {}) {
  return api.get<NewsItem[]>(`/admin/news?${buildQuery(opts)}`);
}

/** GET /admin/news/:idOrSlug */
export function getNewsDetail(idOrSlug: string) {
  return api.get<NewsItem>(`/admin/news/${idOrSlug}`);
}

/** GET /admin/renungan?isPublished=true */
export function listRenungan(opts: ListOptions = {}) {
  return api.get<RenunganItem[]>(`/admin/renungan?${buildQuery(opts)}`);
}

/** GET /admin/renungan/:idOrSlug */
export function getRenunganDetail(idOrSlug: string) {
  return api.get<RenunganItem>(`/admin/renungan/${idOrSlug}`);
}
