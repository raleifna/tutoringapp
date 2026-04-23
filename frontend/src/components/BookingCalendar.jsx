'use client';

import Link from 'next/link';
import { Fragment, useState } from 'react';
import { DAY_ORDER, DAY_LABELS, getSlotDate, getWeekStart } from '../lib/availability-calendar';
import { formatBookingStatus } from '../lib/booking-status';
import { getHourInTimezone, getDayOfWeekInTimezone } from '../lib/formatters';

const DISPLAY_HOURS = Array.from({ length: 15 }, (_, i) => i + 7);

function getEventStyle(status) {
  if (status === 'ACCEPTED') return 'border-blue-400 bg-blue-50 text-blue-800';
  if (status === 'PENDING') return 'border-amber-400 bg-amber-50 text-amber-800';
  if (status === 'UNPAID') return 'border-orange-400 bg-orange-50 text-orange-800';
  if (status === 'COMPLETED') return 'border-green-400 bg-green-50 text-green-700';
  if (status === 'CANCELLED') return 'border-gray-300 bg-gray-50 text-gray-400';
  if (status === 'DECLINED') return 'border-red-300 bg-red-50 text-red-500';
  return 'border-gray-300 bg-gray-50 text-gray-600';
}

function CalendarRow({ hour, weekDates, bookingsBySlot, isTutor, returnTo, today }) {
  return (
    <>
      <div className="flex items-start justify-end border-b border-r border-gray-100 px-1.5 pt-1 text-[11px] text-gray-400">
        {String(hour).padStart(2, '0')}:00
      </div>
      {weekDates.map(({ dayOfWeek, date }) => {
        const key = `${dayOfWeek}-${hour}`;
        const cellBookings = bookingsBySlot[key] || [];
        const isToday = date.toDateString() === today.toDateString();
        return (
          <div
            key={dayOfWeek}
            className={`min-h-[38px] border-b border-r border-gray-100 p-0.5 ${isToday ? 'bg-blue-50/30' : ''}`}
          >
            {cellBookings.map((booking) => {
              const otherPerson = isTutor
                ? `${booking.learner?.firstName || ''} ${booking.learner?.lastName || ''}`.trim()
                : `${booking.tutorProfile?.user?.firstName || ''} ${booking.tutorProfile?.user?.lastName || ''}`.trim();
              const statusLabel = formatBookingStatus(booking.status);

              return (
                <Link
                  key={booking.id}
                  href={`/bookings/${booking.id}?returnTo=${encodeURIComponent(returnTo)}`}
                  className={`mb-0.5 block truncate rounded border-l-2 px-1 py-0.5 transition-opacity hover:opacity-75 ${getEventStyle(booking.status)}`}
                >
                  <div className="truncate text-[11px] font-semibold leading-tight">
                    {booking.subject || 'Session'}
                  </div>
                  <div className="truncate text-[10px] font-medium leading-tight opacity-80">
                    Status: {statusLabel}
                  </div>
                  {otherPerson && (
                    <div className="truncate text-[10px] opacity-70">with {otherPerson}</div>
                  )}
                </Link>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

export default function BookingCalendar({
  bookings = [],
  isTutor = false,
  returnTo = '/dashboard',
  timezone = 'Australia/Sydney',
}) {
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = getWeekStart(new Date(), weekOffset, timezone);
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  // build date for each day column
  const weekDates = DAY_ORDER.map((dayOfWeek) => {
    return { dayOfWeek, date: getSlotDate(dayOfWeek, 0, weekOffset, timezone) };
  });

  // keep only bookings that fall in this week
  const thisWeekBookings = bookings.filter((b) => {
    if (!b.scheduledAt) return false;
    if (['CANCELLED', 'DECLINED'].includes(String(b.status || '').toUpperCase())) return false;
    const d = new Date(b.scheduledAt);
    const bookingDay = getDayOfWeekInTimezone(d, timezone);
    const bookingWeekStart = getWeekStart(d, 0, timezone);
    return bookingWeekStart.getTime() === weekStart.getTime() && DAY_ORDER.includes(bookingDay);
  });

  // group bookings by "day-hour" using user's timezone
  const bookingsBySlot = {};
  thisWeekBookings.forEach((booking) => {
    const dayOfWeek = getDayOfWeekInTimezone(booking.scheduledAt, timezone);
    const hour = getHourInTimezone(booking.scheduledAt, timezone);
    const key = `${dayOfWeek}-${hour}`;
    if (!bookingsBySlot[key]) bookingsBySlot[key] = [];
    bookingsBySlot[key].push(booking);
  });

  const today = getSlotDate(getDayOfWeekInTimezone(new Date(), timezone), 0, 0, timezone);

  const weekLabel = (() => {
    const fmt = new Intl.DateTimeFormat('en-AU', {
      month: 'short',
      day: 'numeric',
      timeZone: timezone,
    });
    const end = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    return `${fmt.format(weekStart)} – ${fmt.format(end)}`;
  })();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Session Calendar</h2>
          <p className="text-xs text-gray-400">{weekLabel}</p>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setWeekOffset((v) => v - 1)}
            className="btn-secondary btn-sm"
          >
            ← Prev
          </button>
          {weekOffset !== 0 && (
            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              className="btn-secondary btn-sm"
            >
              Today
            </button>
          )}
          <button
            type="button"
            onClick={() => setWeekOffset((v) => v + 1)}
            className="btn-secondary btn-sm"
          >
            Next →
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <div
          className="grid min-w-[620px] text-xs"
          style={{ gridTemplateColumns: '44px repeat(7, minmax(76px, 1fr))' }}
        >
          {/* day header row */}
          <div className="border-b border-r border-gray-100 p-2" />
          {weekDates.map(({ dayOfWeek, date }) => {
            const isToday = date.toDateString() === today.toDateString();
            return (
              <div
                key={dayOfWeek}
                className={`border-b border-r border-gray-100 p-2 text-center ${isToday ? 'bg-blue-50' : ''}`}
              >
                <div className={`font-semibold ${isToday ? 'text-blue-600' : 'text-gray-600'}`}>
                  {DAY_LABELS[dayOfWeek]}
                </div>
                <div className={`text-[11px] ${isToday ? 'text-blue-400' : 'text-gray-400'}`}>
                  {new Intl.DateTimeFormat('en-AU', {
                    month: 'short',
                    day: 'numeric',
                    timeZone: timezone,
                  }).format(date)}
                </div>
              </div>
            );
          })}

          {/* hour rows */}
          {DISPLAY_HOURS.map((hour) => (
            <Fragment key={hour}>
              <CalendarRow
                hour={hour}
                weekDates={weekDates}
                bookingsBySlot={bookingsBySlot}
                isTutor={isTutor}
                returnTo={returnTo}
                today={today}
              />
            </Fragment>
          ))}
        </div>
      </div>

      {thisWeekBookings.length === 0 && (
        <p className="py-2 text-center text-sm text-gray-400">No sessions this week</p>
      )}
    </div>
  );
}
