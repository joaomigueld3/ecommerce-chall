export function formatPrice(value) {
  const number = Number(value);
  return `R$ ${Number.isFinite(number) ? number.toFixed(2) : '0.00'}`;
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}
