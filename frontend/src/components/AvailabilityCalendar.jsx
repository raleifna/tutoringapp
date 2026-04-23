'use client';

import { useMemo, useState } from 'react';
import { formatMonthDay as formatDate, getDayOfWeekInTimezone, getHourInTimezone } from '../lib/formatters';
import { DAY_ORDER, DAY_LABELS, HOURS, buildCellKey, cellsToSlots, getSlotDate, getWeekStart, slotsToCells } from '../lib/availability-calendar';

const formatWeekRange = (weekOffset, timezone) => {
  const start = getWeekStart(new Date(), weekOffset, timezone);
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  const format = new Intl.DateTimeFormat('en-AU', {
    month: 'short',
    day: 'numeric',
    ...(timezone ? { timeZone: timezone } : {}),
  });
  return `${format.format(start)} - ${format.format(end)}`;
};

export default function AvailabilityCalendar({
  slots = [],
  mode = 'view',
  onChange,
  onSelect,
  selectedKey = '',
  selectedKeys = [],
  currentWeekSlots = [],
  hasCurrentWeekOverride = false,
  bookedSlots = [],
  fixedWeekOffset,
  hideWeekNavigation = false,
  title,
  timezone = null,
}) {
  const [internalWeekOffset, setInternalWeekOffset] = useState(0);
  const weekOffset = typeof fixedWeekOffset === 'number' ? fixedWeekOffset : internalWeekOffset;
  const baseCells = useMemo(() => slotsToCells(slots), [slots]);
  const overrideCells = useMemo(() => slotsToCells(currentWeekSlots), [currentWeekSlots]);
  const cells = hasCurrentWeekOverride && weekOffset === 0 ? overrideCells : baseCells;
  const bookedCells = useMemo(() => {
    const weekStart = getWeekStart(new Date(), weekOffset, timezone);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextCells = new Set();

    bookedSlots.forEach((slot) => {
      const start = new Date(slot?.scheduledAt);
      if (Number.isNaN(start.getTime())) return;

      const duration = Number(slot?.duration || 60);
      const end = new Date(start.getTime() + duration * 60 * 1000);
      const cursor = new Date(start);
      cursor.setMinutes(0, 0, 0);

      while (cursor < end) {
        if (cursor >= weekStart && cursor < weekEnd) {
          const dayOfWeek = timezone ? getDayOfWeekInTimezone(cursor, timezone) : cursor.getDay();
          const hour = timezone ? getHourInTimezone(cursor, timezone) : cursor.getHours();
          nextCells.add(buildCellKey(dayOfWeek, hour));
        }
        cursor.setTime(cursor.getTime() + 60 * 60 * 1000);
      }
    });

    return nextCells;
  }, [bookedSlots, timezone, weekOffset]);
  const activeSelections = selectedKeys.length ? selectedKeys : selectedKey ? [selectedKey] : [];
  const heading =
    title || (mode === 'edit' ? 'Weekly availability preview' : 'Pick a slot');

  const handleClick = (dayOfWeek, hour) => {
    const key = buildCellKey(dayOfWeek, hour);
    if (mode === 'edit') {
      const next = new Set(cells);
      next.has(key) ? next.delete(key) : next.add(key);
      onChange?.(cellsToSlots(next));
      return;
    }

    if (mode === 'select' && cells.has(key) && !bookedCells.has(key)) {
      onSelect?.({
        key: `${weekOffset}:${key}`,
        dayOfWeek,
        hour,
        date: getSlotDate(dayOfWeek, hour, weekOffset, timezone),
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <div>
          <div className="font-medium text-gray-700">{heading}</div>
          <div className="text-xs text-gray-400">{formatWeekRange(weekOffset, timezone)}</div>
        </div>
        {!hideWeekNavigation && typeof fixedWeekOffset !== 'number' && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setInternalWeekOffset((value) => value - 1)} className="btn-secondary btn-sm">Prev</button>
            <button type="button" onClick={() => setInternalWeekOffset((value) => value + 1)} className="btn-secondary btn-sm">Next</button>
          </div>
        )}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white p-3">
        <div
          className="grid min-w-[820px] gap-2 text-xs"
          style={{ gridTemplateColumns: '58px repeat(7, minmax(104px, 1fr))' }}
        >
          <div />
          {DAY_ORDER.map((dayOfWeek) => (
            <div key={dayOfWeek} className="rounded-lg bg-gray-50 p-2 text-center font-medium text-gray-600">
              <div>{DAY_LABELS[dayOfWeek]}</div>
              <div className="text-[11px] text-gray-400">{formatDate(getSlotDate(dayOfWeek, 0, weekOffset, timezone), timezone)}</div>
            </div>
          ))}
          {HOURS.map((hour) => (
            <FragmentRow
              key={hour}
              hour={hour}
              mode={mode}
              cells={cells}
              bookedCells={bookedCells}
              selectedKeys={activeSelections}
              weekOffset={weekOffset}
              timezone={timezone}
              onClick={handleClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function FragmentRow({ hour, mode, cells, bookedCells, selectedKeys, weekOffset, timezone, onClick }) {
  return (
    <>
          <div className="flex items-center justify-center rounded-lg bg-gray-50 text-gray-400">
        {String(hour).padStart(2, '0')}:00
      </div>
      {DAY_ORDER.map((dayOfWeek) => {
        const key = buildCellKey(dayOfWeek, hour);
        const active = cells.has(key);
        const booked = mode === 'select' && bookedCells.has(key);
        const disabled = mode === 'select' && (!active || booked || getSlotDate(dayOfWeek, hour, weekOffset, timezone) < new Date());
        const selected = selectedKeys.includes(`${weekOffset}:${key}`);
        const label = selected ? 'Selected' : booked ? 'Booked' : active ? 'Available' : '';
        return (
          <button
            key={key}
            type="button"
            disabled={mode === 'view' || disabled}
            onClick={() => onClick(dayOfWeek, hour)}
            className={`flex h-9 items-center justify-center rounded-lg border px-2 text-center transition-colors ${
              selected
                ? 'border-primary-600 bg-primary-100 text-primary-700'
                : booked
                  ? 'border-gray-300 bg-gray-100 text-gray-500'
                : active
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'border-gray-200 bg-white text-gray-300'
            } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
          >
            {label && <span className="text-[11px] font-medium">{label}</span>}
          </button>
        );
      })}
    </>
  );
}
