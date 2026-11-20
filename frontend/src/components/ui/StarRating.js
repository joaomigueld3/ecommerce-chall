'use client';

export default function StarRating({ rating = 0, count = null, size = 'sm' }) {
  const value = Math.max(0, Math.min(5, Number(rating) || 0));
  const rounded = Math.round(value);

  return (
    <span className={`star-rating star-rating-${size}`} aria-label={`Rating ${value.toFixed(1)} out of 5`}>
      <span className="star-icons" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={star <= rounded ? 'star-filled' : 'star-empty'}>
            ★
          </span>
        ))}
      </span>
      {value > 0 && <span className="star-value">{value.toFixed(1)}</span>}
      {count !== null && <span className="muted">({count})</span>}
    </span>
  );
}
