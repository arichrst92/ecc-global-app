/**
 * Ulasan ibadah / event dari tiket — /admin/me/reviews
 */
import { api } from './client';

export type ReviewKind = 'IBADAH' | 'EVENT';
export type ReviewReason = 'NOT_STARTED' | 'CLOSED' | 'CANCELLED' | 'NOT_OWNER';

export interface ReviewState {
  window: { open: boolean; reason: ReviewReason | null; reasonText: string | null; startsAt: string; closesAt: string };
  review: { rating: number; komentar: string | null; isAnonim: boolean; updatedAt: string } | null;
}

export const getReviewState = (kind: ReviewKind, ticketId: string) =>
  api.get<ReviewState>(`/admin/me/reviews?kind=${kind}&ticketId=${ticketId}`);

export const saveReview = (body: { kind: ReviewKind; ticketId: string; rating: number; komentar?: string | null; isAnonim?: boolean }) =>
  api.put<ReviewState>('/admin/me/reviews', body);
