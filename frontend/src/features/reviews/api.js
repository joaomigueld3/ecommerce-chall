import { request } from '@/lib/api-client';

export function getAllReviews(token, filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.productId) params.set('productId', String(filters.productId));
  const qs = params.toString();
  return request(qs ? `/reviews?${qs}` : '/reviews', { token });
}

export function updateReviewStatus(token, reviewId, status) {
  return request(`/reviews/${reviewId}/status`, {
    method: 'PATCH',
    body: { status },
    token,
  });
}

export function getAllQuestions(token, filters = {}) {
  const params = new URLSearchParams();
  if (filters.unanswered) params.set('unanswered', 'true');
  if (filters.status) params.set('status', filters.status);
  const qs = params.toString();
  return request(qs ? `/questions?${qs}` : '/questions', { token });
}

export function answerQuestion(token, questionId, answer) {
  return request(`/questions/${questionId}/answer`, {
    method: 'PATCH',
    body: { answer },
    token,
  });
}

export function updateQuestionStatus(token, questionId, status) {
  return request(`/questions/${questionId}/status`, {
    method: 'PATCH',
    body: { status },
    token,
  });
}
