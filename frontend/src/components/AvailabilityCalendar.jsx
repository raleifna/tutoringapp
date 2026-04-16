'use client';

import { useMemo, useState } from 'react';
import { formatMonthDay as formatDate } from '../lib/formatters';
import { DAY_ORDER, DAY_LABELS, HOURS, buildCellKey, cellsToSlots, getSlotDate, getWeekStart, slotsToCells } from '../lib/availability-calendar';

const formatWeekRange = (weekOffset) => {
  const start = getWeekStart(new Date(), weekOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const format = new Intl.DateTimeFormat('en-AU', { month: 'short', day: 'numeric' });
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
  fixedWeekOffset,
  hideWeekNavigation = false,
  title,
}) {
  const [internalWeekOffset, setInternalWeekOffset] = useState(0);
  const weekOffset = typeof fixedWeekOffset === 'number' ? fixedWeekOffset : internalWeekOffset;
  const baseCells = useMemo(() => slotsToCells(slots), [slots]);
  const overrideCells = useMemo(() => slotsToCells(currentWeekSlots), [currentWeekSlots]);
  const cells = hasCurrentWeekOverride && weekOffset === 0 ? overrideCells : baseCells;
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

    if (mode === 'select' && cells.has(key)) {
      onSelect?.({
        key: `${weekOffset}:${key}`,
        dayOfWeek,
        hour,
        date: getSlotDate(dayOfWeek, hour, weekOffset),
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <div>
          <div className="font-medium text-gray-700">{heading}</div>
          <div className="text-xs text-gray-400">{formatWeekRange(weekOffset)}</div>
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
              <div className="text-[11px] text-gray-400">{formatDate(getSlotDate(dayOfWeek, 0, weekOffset))}</div>
            </div>
          ))}
          {HOURS.map((hour) => (
            <FragmentRow
              key={hour}
              hour={hour}
              mode={mode}
              cells={cells}
              selectedKeys={activeSelections}
              weekOffset={weekOffset}
              onClick={handleClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function FragmentRow({ hour, mode, cells, selectedKeys, weekOffset, onClick }) {
  return (
    <>
          <div className="flex items-center justify-center rounded-lg bg-gray-50 text-gray-400">
        {String(hour).padStart(2, '0')}:00
      </div>
      {DAY_ORDER.map((dayOfWeek) => {
        const key = buildCellKey(dayOfWeek, hour);
        const active = cells.has(key);
        const disabled = mode === 'select' && (!active || getSlotDate(dayOfWeek, hour, weekOffset) < new Date());
        const selected = selectedKeys.includes(`${weekOffset}:${key}`);
        const label = selected ? 'Selected' : active ? 'Available' : '';
        return (
          <button
            key={key}
            type="button"
            disabled={mode === 'view' || disabled}
            onClick={() => onClick(dayOfWeek, hour)}
            className={`flex h-9 items-center justify-center rounded-lg border px-2 text-center transition-colors ${
              selected
                ? 'border-primary-600 bg-primary-100 text-primary-700'
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
