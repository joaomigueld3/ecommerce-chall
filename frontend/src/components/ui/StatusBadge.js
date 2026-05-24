const STATUS_COLORS = {
  Received: '#2456d6',
  'In Preparation': '#b7791f',
  Dispatched: '#6b46c1',
  Delivered: '#1d6334',
  Cancelled: '#8a1f12',
};

export default function StatusBadge({ status }) {
  return (
    <span className="badge" style={{ background: STATUS_COLORS[status] || '#6b7280' }}>
      {status}
    </span>
  );
}
