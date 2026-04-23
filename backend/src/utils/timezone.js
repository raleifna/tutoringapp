/**
 * 简化的时区工具函数
 * 使用浏览器/Node.js 内置 Intl API，避免复杂的手动计算
 */

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
  return formatter.format(date);
}

/**
 * 获取特定时区的星期几
 * @param {Date} date - 日期对象
 * @param {string} timezone - 时区
 * @returns {number} 0-6 (Sunday-Saturday)
 */
function getDayOfWeekInTimezone(date, timezone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long'
  });
  const dayName = formatter.format(date);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days.indexOf(dayName);
}

/**
 * 转换导师的可用时间槽，添加学生端的显示标签
 * @param {Array} slots - 导师的时间槽 [{dayOfWeek, startTime, endTime, timezone}]
 * @param {string} tutorTimezone - 导师的时区
 * @returns {Array} 添加了显示标签的时间槽
 */
function convertAvailabilityForStudent(slots, tutorTimezone) {
  return slots.map(slot => ({
    ...slot,
    displayTimezone: tutorTimezone,
    displayText: `${slot.startTime}-${slot.endTime} (${tutorTimezone})`
  }));
}

/**
 * 验证预订时间是否在导师的可用时间内
 * @param {Date} bookingDatetime - 预订时间 (UTC)
 * @param {string} tutorTimezone - 导师的时区
 * @param {Array} tutorAvailableSlots - 导师的可用时间槽
 * @returns {object} { isValid: boolean, message: string }
 */
function validateBookingTime(bookingDatetime, tutorTimezone, tutorAvailableSlots) {
  // 获取导师所在时区的当前时间
  const tutorTime = getTimeInTimezone(bookingDatetime, tutorTimezone);
  const tutorDay = getDayOfWeekInTimezone(bookingDatetime, tutorTimezone);

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
    return tutorTime >= slot.startTime && tutorTime < slot.endTime;
  });

  if (!isInSlot) {
    return {
      isValid: false,
      message: `Booking time ${tutorTime} is outside tutor's availability. Available slots: ${daySlots.map(s => `${s.startTime}-${s.endTime}`).join(', ')}`
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
  formatInTimezone,
  getTimeInTimezone,
  getDayOfWeekInTimezone,
  convertAvailabilityForStudent,
  validateBookingTime,
  formatBookingInTimezone
};
