import Link from 'next/link';

export default function EmptyState({ message, actionHref, actionLabel }) {
  return (
    <div className="empty-state">
      <p className="muted">{message}</p>
      {actionHref && actionLabel && (
        <Link href={actionHref} className="btn">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
