export default function EmptyState({ message, children }) {
  return (
    <p className="muted">
      {message}
      {children && <> {children}</>}
    </p>
  );
}
