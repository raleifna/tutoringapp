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
