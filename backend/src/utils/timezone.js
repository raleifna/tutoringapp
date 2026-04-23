const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function isValidTimezone(timezone) {
  if (!timezone || typeof timezone !== 'string') return false;

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function normalizeTimezone(timezone, fallback = 'UTC') {
  return isValidTimezone(timezone) ? timezone : fallback;
}

function getZonedParts(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'long',
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
  const parts = getZonedParts(date, timezone);
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

function zonedTimeToUtc({ year, month, day, hour = 0, minute = 0, second = 0 }, timezone) {
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  let utc = localAsUtc - getTimezoneOffset(new Date(localAsUtc), timezone);
  utc = localAsUtc - getTimezoneOffset(new Date(utc), timezone);
  return new Date(utc);
}

function addDaysToLocalDate({ year, month, day }, days) {
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function getCurrentWeekMondayInTimezone(timezone) {
  const parts = getZonedParts(new Date(), timezone);
  const daysFromMonday = (parts.dayOfWeek + 6) % 7;
  return addDaysToLocalDate(parts, -daysFromMonday);
}

function timeToHour(value, fallback = 0) {
  const hour = Number.parseInt(String(value || '').slice(0, 2), 10);
  return Number.isNaN(hour) ? fallback : hour;
}

function formatHour(hour) {
  return `${String(hour).padStart(2, '0')}:00`;
}

function timeToMinutes(value) {
  const [rawHour, rawMinute] = String(value || '00:00').split(':');
  const hour = Number.parseInt(rawHour, 10);
  const minute = Number.parseInt(rawMinute, 10);
  return (Number.isNaN(hour) ? 0 : hour) * 60 + (Number.isNaN(minute) ? 0 : minute);
}

/**
 * 格式化时间显示（用指定时区）
 * @param {Date} date - 日期对象
 * @param {string} timezone - IANA 时区字符串 (e.g., 'Australia/Sydney')
 * @returns {string} 格式化的时间字符串
 */
function formatInTimezone(date, timezone) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

/**
 * 获取特定时区的当前时间（HH:MM 格式）
 * @param {Date} date - 日期对象
 * @param {string} timezone - 时区
 * @returns {string} 'HH:MM' 格式
 */
function getTimeInTimezone(date, timezone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const hour = formatter.formatToParts(date).find((part) => part.type === 'hour')?.value || '00';
  const minute = formatter.formatToParts(date).find((part) => part.type === 'minute')?.value || '00';
  return `${String(Number(hour) % 24).padStart(2, '0')}:${minute}`;
}

/**
 * 获取特定时区的星期几
 * @param {Date} date - 日期对象
 * @param {string} timezone - 时区
 * @returns {number} 0-6 (Sunday-Saturday)
 */
function getDayOfWeekInTimezone(date, timezone) {
  return getZonedParts(date, timezone).dayOfWeek;
}

/**
 * 转换导师的可用时间槽，添加学生端的显示标签
 * @param {Array} slots - 导师的时间槽 [{dayOfWeek, startTime, endTime, timezone}]
 * @param {string} tutorTimezone - 导师的时区
 * @returns {Array} 添加了显示标签的时间槽
 */
function convertAvailabilityForStudent(slots, tutorTimezone, requesterTimezone = tutorTimezone) {
  const sourceTimezone = normalizeTimezone(tutorTimezone);
  const targetTimezone = normalizeTimezone(requesterTimezone, sourceTimezone);
  const weekMonday = getCurrentWeekMondayInTimezone(sourceTimezone);
  const convertedCells = new Set();

  slots.forEach((slot) => {
    const dayOffset = Number(slot.dayOfWeek) === 0 ? 6 : Number(slot.dayOfWeek) - 1;
    const localDate = addDaysToLocalDate(weekMonday, dayOffset);
    const startHour = timeToHour(slot.startTime, 0);
    const endHour = timeToHour(slot.endTime, startHour);

    for (let hour = startHour; hour < endHour; hour += 1) {
      const utcDate = zonedTimeToUtc({ ...localDate, hour }, sourceTimezone);
      const targetParts = getZonedParts(utcDate, targetTimezone);
      convertedCells.add(`${targetParts.dayOfWeek}-${targetParts.hour}`);
    }
  });

  return WEEKDAYS.flatMap((_, dayOfWeek) => {
    const hours = Array.from({ length: 24 }, (__, hour) => hour).filter((hour) =>
      convertedCells.has(`${dayOfWeek}-${hour}`)
    );
    if (!hours.length) return [];

    const groups = [];
    let start = hours[0];
    let prev = hours[0];

    for (let index = 1; index < hours.length; index += 1) {
      const current = hours[index];
      if (current === prev + 1) {
        prev = current;
        continue;
      }

      groups.push({ dayOfWeek, startTime: formatHour(start), endTime: formatHour(prev + 1) });
      start = current;
      prev = current;
    }

    groups.push({ dayOfWeek, startTime: formatHour(start), endTime: formatHour(prev + 1) });
    return groups.map((item) => ({
      ...item,
      timezone: targetTimezone,
      sourceTimezone,
      displayTimezone: targetTimezone,
      displayText: `${item.startTime}-${item.endTime} (${targetTimezone})`,
    }));
  });
}

/**
 * 验证预订时间是否在导师的可用时间内
 * @param {Date} bookingDatetime - 预订时间 (UTC)
 * @param {string} tutorTimezone - 导师的时区
 * @param {Array} tutorAvailableSlots - 导师的可用时间槽
 * @returns {object} { isValid: boolean, message: string }
 */
function validateBookingTime(bookingDatetime, tutorTimezone, tutorAvailableSlots, duration = 60) {
  // 获取导师所在时区的当前时间
  const tutorTime = getTimeInTimezone(bookingDatetime, tutorTimezone);
  const tutorDay = getDayOfWeekInTimezone(bookingDatetime, tutorTimezone);
  const bookingEnd = new Date(bookingDatetime.getTime() + Number(duration || 60) * 60 * 1000);
  const tutorEndTime = getTimeInTimezone(bookingEnd, tutorTimezone);
  const tutorEndDay = getDayOfWeekInTimezone(bookingEnd, tutorTimezone);
  const startMinutes = timeToMinutes(tutorTime);
  const endMinutes =
    tutorEndDay === tutorDay ? timeToMinutes(tutorEndTime) : 24 * 60 + timeToMinutes(tutorEndTime);

  // 查找该星期几是否有可用时间段
  const daySlots = tutorAvailableSlots.filter(slot => slot.dayOfWeek === tutorDay);
  
  if (daySlots.length === 0) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return {
      isValid: false,
      message: `Tutor has no availability on ${days[tutorDay]}`
    };
  }

  // 检查预订时间是否在任何一个可用时间段内
  const isInSlot = daySlots.some(slot => {
    const slotStart = timeToMinutes(slot.startTime);
    const slotEnd = timeToMinutes(slot.endTime);
    return startMinutes >= slotStart && endMinutes <= slotEnd;
  });

  if (!isInSlot) {
    return {
      isValid: false,
      message: `Booking time ${tutorTime}-${tutorEndTime} is outside tutor's availability. Available slots: ${daySlots.map(s => `${s.startTime}-${s.endTime}`).join(', ')}`
    };
  }

  return {
    isValid: true,
    message: 'Booking time is valid',
    tutorLocalTime: tutorTime
  };
}

/**
 * 格式化预订显示（用指定时区）
 * @param {Date} scheduledAt - 预订时间 (UTC)
 * @param {string} timezone - 显示用的时区
 * @returns {object} { dateStr, timeStr, display }
 */
function formatBookingInTimezone(scheduledAt, timezone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  
  const display = formatter.format(scheduledAt);
  const [dateStr, timeStr] = display.split(', ');

  return {
    dateStr,
    timeStr,
    display: `${dateStr} at ${timeStr} (${timezone})`,
    timezone
  };
}

module.exports = {
  isValidTimezone,
  normalizeTimezone,
  formatInTimezone,
  getTimeInTimezone,
  getDayOfWeekInTimezone,
  convertAvailabilityForStudent,
  validateBookingTime,
  formatBookingInTimezone
};
