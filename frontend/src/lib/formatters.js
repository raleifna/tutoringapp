const LOCALE = 'en-AU';
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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

function formatDateValue(value, options, timezone = null) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  const formatOptions = { ...options };
  if (timezone) {
    formatOptions.timeZone = timezone;
  }

  try {
    return new Intl.DateTimeFormat(LOCALE, formatOptions).format(date);
  } catch {
    return new Intl.DateTimeFormat(LOCALE, options).format(date);
  }
}

export function getUserTimezone(user, fallback = 'Australia/Sydney') {
  return user?.timezone?.trim() || user?.timeZone?.trim() || fallback;
}

export function getDatePartsInTimezone(value, timezone) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'long',
    hour12: false,
  }).formatToParts(date);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hour: Number(lookup.hour) % 24,
    minute: Number(lookup.minute),
    second: Number(lookup.second),
    dayOfWeek: WEEKDAYS.indexOf(lookup.weekday),
  };
}

function getTimezoneOffset(date, timezone) {
  const parts = getDatePartsInTimezone(date, timezone);
  if (!parts) return 0;

  const localAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  return localAsUtc - date.getTime();
}

export function zonedTimeToUtc({ year, month, day, hour = 0, minute = 0, second = 0 }, timezone) {
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  let utc = localAsUtc - getTimezoneOffset(new Date(localAsUtc), timezone);
  utc = localAsUtc - getTimezoneOffset(new Date(utc), timezone);
  return new Date(utc);
}

export function formatShortDateTime(value, timezone = null) {
  return formatDateValue(value, SHORT_DATE_TIME_FORMAT, timezone);
}

export function formatDateTimeWithYear(value, timezone = null) {
  return formatDateValue(value, DATE_TIME_WITH_YEAR_FORMAT, timezone);
}

export function formatMonthDay(value, timezone = null) {
  return formatDateValue(value, MONTH_DAY_FORMAT, timezone);
}

/**
 * 使用指定时区格式化日期时间
 * @param {Date|string} value - 日期
 * @param {string} timezone - IANA 时区 (e.g., 'Australia/Sydney')
 * @returns {string} 格式化的日期时间
 */
export function formatDateInTimezone(value, timezone) {
  if (!value || !timezone) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  };

  return new Intl.DateTimeFormat(LOCALE, options).format(date);
}

/**
 * 获取特定时区中时间的小时部分
 * @param {Date|string} value - 日期
 * @param {string} timezone - IANA 时区
 * @returns {number} 0-23 的小时
 */
export function getHourInTimezone(value, timezone) {
  if (!value || !timezone) return 0;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;

  const options = {
    hour: '2-digit',
    hour12: false,
    timeZone: timezone,
  };

  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(date);
  const hourPart = parts.find(p => p.type === 'hour');
  return parseInt(hourPart?.value || 0, 10) % 24;
}

/**
 * 获取特定时区中的星期几
 * @param {Date|string} value - 日期
 * @param {string} timezone - IANA 时区
 * @returns {number} 0-6 (Sunday-Saturday)
 */
export function getDayOfWeekInTimezone(value, timezone) {
  if (!value || !timezone) return 0;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;

  return getDatePartsInTimezone(date, timezone)?.dayOfWeek ?? 0;
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
