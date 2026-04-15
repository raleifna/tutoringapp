export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function getPositivePageNumber(value, fallback = 1) {
  const next = Number.parseInt(String(value || fallback), 10);
  return Number.isFinite(next) && next > 0 ? next : fallback;
}
