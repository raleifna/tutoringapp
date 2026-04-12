const LOCALE = 'en-AU';

const SHORT_DATE_TIME_FORMAT = {
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
};

const DATE_TIME_WITH_YEAR_FORMAT = {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
};

const MONTH_DAY_FORMAT = {
  month: 'short',
  day: 'numeric',
};

function formatDateValue(value, options) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat(LOCALE, options).format(date);
}

export function formatShortDateTime(value) {
  return formatDateValue(value, SHORT_DATE_TIME_FORMAT);
}

export function formatDateTimeWithYear(value) {
  return formatDateValue(value, DATE_TIME_WITH_YEAR_FORMAT);
}

export function formatMonthDay(value) {
  return formatDateValue(value, MONTH_DAY_FORMAT);
}

export function formatCurrency(amount, currency = 'AUD') {
  const value = Number(amount || 0);
  if (Number.isNaN(value)) return '$0';

  try {
    return new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency: currency || 'AUD',
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value}`;
  }
}

export function formatTimeAgo(value) {
  const timestamp = typeof value === 'string' ? new Date(value) : value;
  if (!(timestamp instanceof Date) || Number.isNaN(timestamp.getTime())) {
    return 'Just now';
  }

  const diff = new Date() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function formatDuration(minutes) {
  const value = Number(minutes || 0);
  if (!value) return '0 mins';
  if (value % 60 === 0) return `${value / 60} hr`;
  return `${value} mins`;
}
