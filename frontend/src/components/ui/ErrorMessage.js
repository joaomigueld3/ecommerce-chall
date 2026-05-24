'use client';

export default function ErrorMessage({ message, onRetry }) {
  return (
    <div className="alert alert-error">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
