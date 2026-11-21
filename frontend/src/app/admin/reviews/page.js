'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RequireRole from '@/features/auth/RequireRole';
import { useAuth } from '@/features/auth/AuthContext';
import {
  answerQuestion,
  getAllQuestions,
  getAllReviews,
  updateQuestionStatus,
  updateReviewStatus,
} from '@/features/reviews/api';
import { formatDate } from '@/lib/format';
import Loading from '@/components/ui/Loading';
import ErrorMessage from '@/components/ui/ErrorMessage';
import EmptyState from '@/components/ui/EmptyState';
import StarRating from '@/components/ui/StarRating';

function ReviewsModerationContent() {
  const { token, logout } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState('reviews');
  const [reviews, setReviews] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [message, setMessage] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [answerDrafts, setAnswerDrafts] = useState({});

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const [revRes, qRes] = await Promise.all([
          getAllReviews(token),
          getAllQuestions(token),
        ]);
        if (ignore) return;
        setReviews(Array.isArray(revRes?.reviews) ? revRes.reviews : []);
        setQuestions(Array.isArray(qRes?.questions) ? qRes.questions : []);
        setError(null);
      } catch (err) {
        if (ignore) return;
        if (err.status === 401) {
          logout();
          router.replace('/login');
          return;
        }
        setError(err.message || 'Failed to load moderation data.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [token, reloadKey, logout, router]);

  function refresh() {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }

  async function handleReviewStatus(reviewId, status) {
    setMessage(null);
    setActionError(null);
    try {
      await updateReviewStatus(token, reviewId, status);
      setMessage(`Review #${reviewId} marked as ${status}.`);
      refresh();
    } catch (err) {
      setActionError(err.message || 'Failed to update review.');
    }
  }

  async function handleAnswerSubmit(event, questionId) {
    event.preventDefault();
    const text = (answerDrafts[questionId] || '').trim();
    if (!text) return;
    setMessage(null);
    setActionError(null);
    try {
      await answerQuestion(token, questionId, text);
      setMessage(`Question #${questionId} answered.`);
      setAnswerDrafts((prev) => ({ ...prev, [questionId]: '' }));
      refresh();
    } catch (err) {
      setActionError(err.message || 'Failed to publish answer.');
    }
  }

  async function handleQuestionStatus(questionId, status) {
    setMessage(null);
    setActionError(null);
    try {
      await updateQuestionStatus(token, questionId, status);
      setMessage(`Question #${questionId} marked as ${status}.`);
      refresh();
    } catch (err) {
      setActionError(err.message || 'Failed to update question.');
    }
  }

  if (loading) return <Loading message="Loading reviews & Q&A..." />;
  if (error) return <ErrorMessage message={error} onRetry={refresh} />;

  const unansweredCount = questions.filter((q) => !q.answer).length;

  return (
    <section className="stack">
      <div className="page-header">
        <h1>Reviews &amp; Q&amp;A Moderation</h1>
        <div className="chip-row">
          <button
            type="button"
            className={`chip ${tab === 'reviews' ? 'chip-active' : ''}`}
            onClick={() => setTab('reviews')}
          >
            Reviews ({reviews.length})
          </button>
          <button
            type="button"
            className={`chip ${tab === 'questions' ? 'chip-active' : ''}`}
            onClick={() => setTab('questions')}
          >
            Q&amp;A ({questions.length} · {unansweredCount} unanswered)
          </button>
        </div>
      </div>

      {message && <p className="alert alert-success">{message}</p>}
      {actionError && <p className="alert alert-error">{actionError}</p>}

      {tab === 'reviews' && (
        reviews.length === 0 ? (
          <EmptyState message="No customer reviews submitted yet." />
        ) : (
          <div className="stack">
            {reviews.map((rev) => (
              <article key={rev.reviewId} className="card">
                <div className="page-header">
                  <div className="actions-row">
                    <StarRating rating={rev.rating} />
                    <strong>{rev.title}</strong>
                    {rev.verifiedPurchase && <span className="verified-pill">Verified Purchase</span>}
                    <span className="badge">{rev.status}</span>
                  </div>
                  <div className="actions-row">
                    {rev.status !== 'Approved' && (
                      <button
                        type="button"
                        className="btn amz-btn-primary btn-sm"
                        onClick={() => handleReviewStatus(rev.reviewId, 'Approved')}
                      >
                        Approve
                      </button>
                    )}
                    {rev.status !== 'Hidden' && (
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleReviewStatus(rev.reviewId, 'Hidden')}
                      >
                        Hide
                      </button>
                    )}
                  </div>
                </div>
                <p className="muted">
                  Product: <strong>{rev.Product?.productName || `#${rev.productId}`}</strong> • By {rev.authorName} • {formatDate(rev.createdAt)}
                </p>
                <p>{rev.comment}</p>
              </article>
            ))}
          </div>
        )
      )}

      {tab === 'questions' && (
        questions.length === 0 ? (
          <EmptyState message="No customer questions submitted yet." />
        ) : (
          <div className="stack">
            {questions.map((q) => (
              <article key={q.questionId} className="card">
                <div className="page-header">
                  <div>
                    <p><strong>Q: {q.question}</strong></p>
                    <p className="muted">
                      Product: <strong>{q.Product?.productName || `#${q.productId}`}</strong> • By {q.authorName} • {formatDate(q.createdAt)}
                    </p>
                  </div>
                  <div className="actions-row">
                    <span className="badge">{q.status}</span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleQuestionStatus(q.questionId, q.status === 'Hidden' ? 'Published' : 'Hidden')}
                    >
                      {q.status === 'Hidden' ? 'Publish' : 'Hide'}
                    </button>
                  </div>
                </div>

                {q.answer && (
                  <p className="qa-answer">
                    <strong>Current Answer:</strong> {q.answer}{' '}
                    <span className="muted">({q.answeredByName})</span>
                  </p>
                )}

                <form onSubmit={(e) => handleAnswerSubmit(e, q.questionId)} className="actions-row">
                  <input
                    type="text"
                    className="qa-input"
                    placeholder={q.answer ? 'Update store answer...' : 'Write official store answer...'}
                    value={answerDrafts[q.questionId] ?? ''}
                    onChange={(e) => setAnswerDrafts((prev) => ({ ...prev, [q.questionId]: e.target.value }))}
                    required
                  />
                  <button type="submit" className="btn amz-btn-primary btn-sm">
                    {q.answer ? 'Update answer' : 'Publish answer'}
                  </button>
                </form>
              </article>
            ))}
          </div>
        )
      )}
    </section>
  );
}

export default function ReviewsAdminPage() {
  return (
    <RequireRole allowedRoles={['Admin']}>
      <ReviewsModerationContent />
    </RequireRole>
  );
}
