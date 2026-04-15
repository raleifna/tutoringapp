export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const DAY_LABELS = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
};

export const HOURS = Array.from({ length: 24 }, (_, index) => index);

export const buildCellKey = (dayOfWeek, hour) => `${dayOfWeek}-${hour}`;

const readHour = (value, fallback) => {
  const hour = Number.parseInt(String(value || '').slice(0, 2), 10);
  return Number.isNaN(hour) ? fallback : hour;
};

const formatHour = (hour) => `${String(hour).padStart(2, '0')}:00`;

export const cloneSlots = (slots = []) =>
  slots.map((slot) => ({
    dayOfWeek: String(slot?.dayOfWeek),
    startTime: slot?.startTime,
    endTime: slot?.endTime,
    ...(slot?.timezone ? { timezone: slot.timezone } : {}),
  }));

export const slotsToCells = (slots = []) => {
  const cells = new Set();

  slots.forEach((slot) => {
    const dayOfWeek = Number(slot?.dayOfWeek);
    const startHour = readHour(slot?.startTime, 0);
    const endHour = readHour(slot?.endTime, startHour);

    for (let hour = startHour; hour < endHour; hour += 1) {
      cells.add(buildCellKey(dayOfWeek, hour));
    }
  });

  return cells;
};

export const cellsToSlots = (cells) => {
  return DAY_ORDER.flatMap((dayOfWeek) => {
    const hours = HOURS.filter((hour) => cells.has(buildCellKey(dayOfWeek, hour)));
    if (hours.length === 0) return [];

    const groups = [];
    let start = hours[0];
    let prev = hours[0];

    for (let i = 1; i < hours.length; i++) {
      const cur = hours[i];
      if (cur === prev + 1) {
        prev = cur;
        continue;
      }

      groups.push({ dayOfWeek: String(dayOfWeek), startTime: formatHour(start), endTime: formatHour(prev + 1) });
      start = cur;
      prev = cur;
    }

    groups.push({ dayOfWeek: String(dayOfWeek), startTime: formatHour(start), endTime: formatHour(prev + 1) });
    return groups;
  });
};

export const getWeekStart = (date = new Date(), weekOffset = 0) => {
  const base = new Date(date);
  const diff = (base.getDay() + 6) % 7;
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() - diff + weekOffset * 7);
  return base;
};

export const getSlotDate = (dayOfWeek, hour, weekOffset = 0) => {
  const start = getWeekStart(new Date(), weekOffset);
  const date = new Date(start);
  const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  date.setDate(start.getDate() + offset);
  date.setHours(hour, 0, 0, 0);
  return date;
};
