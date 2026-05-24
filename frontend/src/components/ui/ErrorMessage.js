export default function ErrorMessage({ message, onRetry }) {
  return (
    <div className="alert error" role="alert">
      {message || 'Something went wrong.'}
      {onRetry && (
        <>
          {' '}
          <button type="button" className="secondary" onClick={onRetry}>Retry</button>
        </>
      )}
    </div>
  );
}
