// src/app/(app)/bookings/page.jsx - bookings list page
'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { CalendarDaysIcon, ClockIcon } from '@heroicons/react/24/outline';
import { bookingApi } from '../../../lib/api-entry';
import { getAvatarUrl } from '../../../lib/avatar';
import { getBookingStatusClass } from '../../../lib/booking-status';
import { formatCurrency, formatDateTimeWithYear as formatDate, formatDuration } from '../../../lib/formatters';
import {
  getDisplayStatusLabel,
  getBookingDisplayStatus,
  getRecurringDisplayBookings,
  getRecurringDisplayStatus,
  getRecurringLabel,
  getRecurringSeriesBookings,
  getRecurringStatusSummary,
  getSeriesTotalAmount,
  isRecurringBooking,
  matchesBookingDisplayStatus,
} from '../../../lib/recurring-bookings';
import { useAuthStore } from '../../../lib/store';
import { getPositivePageNumber } from '../../../lib/utils';
import BackButton from '../../../components/BackButton';

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACCEPTED', label: 'Upcoming' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_VALUES = new Set(STATUS_TABS.map((item) => item.value));

const getInitialStatus = (value) => {
  const next = String(value || '').toUpperCase();
  return STATUS_VALUES.has(next) ? next : '';
};

function BookingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get('status');
  const pageParam = searchParams.get('page');
  const fromParam = (searchParams.get('from') || '').toLowerCase();
  const { user } = useAuthStore();
  const currentUserId = user?.id || '';
  const [activeStatus, setActiveStatus] = useState(() => getInitialStatus(statusParam));
  const [page, setPage] = useState(() => getPositivePageNumber(pageParam));
  const isTutor = user?.role === 'TUTOR';
  const showBackButton = Boolean(fromParam);
  const fallbackBackHrefMap = {
    home: '/',
    search: '/search',
    dashboard: '/dashboard',
    bookings: isTutor ? '/tutor/dashboard' : '/dashboard',
    'tutor-dashboard': '/tutor/dashboard',
    'tutor-requests': '/tutor/requests',
  };
  const fallbackBackHref = fallbackBackHrefMap[fromParam] || '/';

  useEffect(() => {
    setActiveStatus(getInitialStatus(statusParam));
    setPage(getPositivePageNumber(pageParam));
  }, [pageParam, statusParam]);

  const handleBack = () => {
    router.push(fallbackBackHref);
  };

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['bookings', currentUserId, isTutor],
    queryFn: () =>
      isTutor
        ? bookingApi.getTutorBookings({ limit: 200 })
        : bookingApi.getMyBookings({ limit: 200 }),
    enabled: !!currentUserId,
    keepPreviousData: true,
  });

  const bookings = data?.data?.data?.bookings || [];
  const sortedBookings = [...bookings].sort((a, b) => {
    const createdAtA = new Date(a?.createdAt || 0).getTime();
    const createdAtB = new Date(b?.createdAt || 0).getTime();
    if (createdAtA !== createdAtB) return createdAtB - createdAtA;

    const scheduledAtA = new Date(a?.scheduledAt || 0).getTime();
    const scheduledAtB = new Date(b?.scheduledAt || 0).getTime();
    return scheduledAtB - scheduledAtA;
  });
  const displayBookings = getRecurringDisplayBookings(sortedBookings).filter((booking) =>
    matchesBookingDisplayStatus(booking, activeStatus)
  );
  const totalPages = Math.max(1, Math.ceil(displayBookings.length / 10));
  const currentPage = Math.min(page, totalPages);
  const paginatedBookings = displayBookings.slice((currentPage - 1) * 10, currentPage * 10);
  const currentBookingsHref = (() => {
    const params = new URLSearchParams();
    if (fromParam) params.set('from', fromParam);
    if (activeStatus) params.set('status', activeStatus);
    if (page > 1) params.set('page', String(page));
    const query = params.toString();
    return query ? `/bookings?${query}` : '/bookings';
  })();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-gray-900 flex-1">My Bookings</h1>
          <p className="mt-1 text-gray-600">Manage your tutoring sessions</p>
        </div>
        {showBackButton && (
          <BackButton
            onClick={handleBack}
          />
        )}
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 pb-px">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => {
              setActiveStatus(tab.value);
              setPage(1);
            }}
            className={`flex-1 whitespace-nowrap px-3 py-2.5 -mb-px text-center text-sm font-medium border-b-2 transition-colors ${
              activeStatus === tab.value
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-700 mb-2">
            {error?.response?.data?.message || 'Failed to load bookings.'}
          </p>
          <button type="button" onClick={() => refetch()} className="btn-primary btn-sm">
            Retry
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !isError && displayBookings.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
          <CalendarDaysIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="font-medium text-gray-900 mb-2">No bookings found</h3>
          <p className="text-sm text-gray-500 mb-4">
            {activeStatus ? `No ${activeStatus.toLowerCase()} bookings` : "You haven't made any bookings yet"}
          </p>
          {!isTutor && (
            <Link href="/search?from=bookings" className="btn-primary">
              Find a Tutor
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              isTutor={isTutor}
              returnTo={currentBookingsHref}
            />
          ))}
        </div>
      )}

      {!isLoading && !isError && isFetching && (
        <p className="text-xs text-gray-400 text-center">Updating bookings...</p>
      )}

      {!isLoading && !isError && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((value) => value - 1)}
            disabled={currentPage <= 1}
            className="btn-secondary btn-sm disabled:opacity-40"
          >
            ← Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((value) => value + 1)}
            disabled={currentPage >= totalPages}
            className="btn-secondary btn-sm disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

function BookingsPageFallback() {
  return (
    <div className="space-y-5">
      <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
      <div className="h-8 w-40 bg-gray-200 rounded animate-pulse" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse h-24" />
        ))}
      </div>
    </div>
  );
}

function BookingCard({ booking, isTutor, returnTo }) {
  const router = useRouter();
  const other = isTutor ? booking?.learner : booking?.tutorProfile?.user || booking?.tutor || {};
  const otherFirstName = other?.firstName || (isTutor ? 'Learner' : 'Tutor');
  const otherLastName = other?.lastName || '';
  const sessionType = booking?.sessionType ? String(booking.sessionType).replace('_', '-') : 'Session';
  const recurringLabel = getRecurringLabel(booking);
  const recurringBookings = getRecurringSeriesBookings(booking);
  const totalAmount =
    (isRecurringBooking(booking)
      ? getSeriesTotalAmount(recurringBookings)
      : booking?.totalAmount) ??
    ((Number(booking?.hourlyRate || 0) * Number(booking?.duration || 0)) / 60 || 0);
  const displayStatus = isRecurringBooking(booking) ? getRecurringDisplayStatus(booking) : getBookingDisplayStatus(booking);
  const recurringStatus = getRecurringStatusSummary(booking);
  const bookingDetailHref = returnTo
    ? `/bookings/${booking.id}?returnTo=${encodeURIComponent(returnTo)}`
    : `/bookings/${booking.id}`;
  const tutorDetailHref = (() => {
    if (isTutor) return null;
    const tutorId = booking?.tutorProfile?.id || booking?.tutor?.id || booking?.tutorId;
    if (!tutorId) return null;
    if (!returnTo) return `/tutors/${tutorId}`;
    return `/tutors/${tutorId}?returnTo=${encodeURIComponent(returnTo)}`;
  })();

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(bookingDetailHref)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          router.push(bookingDetailHref);
        }
      }}
      className="cursor-pointer bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-primary-100 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          {tutorDetailHref ? (
            <Link
              href={tutorDetailHref}
              onClick={(event) => event.stopPropagation()}
              className="group rounded-full transition-transform hover:scale-[1.03]"
            >
              <img
                src={getAvatarUrl(other?.avatar, otherFirstName, otherLastName, { fallbackName: 'Tutor' })}
                alt={otherFirstName}
                className="w-12 h-12 rounded-full object-cover flex-shrink-0 ring-0 transition-shadow group-hover:shadow-md group-hover:ring-2 group-hover:ring-sky-100"
              />
            </Link>
          ) : (
            <img
              src={getAvatarUrl(other?.avatar, otherFirstName, otherLastName, { fallbackName: 'Tutor' })}
              alt={otherFirstName}
              className="w-12 h-12 rounded-full object-cover flex-shrink-0"
            />
          )}
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm">
              Session with: {otherFirstName} {otherLastName}
            </h3>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <p className="text-xs text-gray-500">{booking?.subject || 'Session'}</p>
              {isRecurringBooking(booking) && (
                <span className="rounded-full border border-sky-100 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
                  {recurringLabel}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${getBookingStatusClass(displayStatus)}`}>
            {getDisplayStatusLabel(booking)}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl px-3 py-2 text-xs text-gray-500 transition-colors hover:bg-gray-50">
        <div className="flex items-center gap-1">
          <CalendarDaysIcon className="w-3.5 h-3.5" />
          {formatDate(booking?.scheduledAt)}
        </div>
        <div className="flex items-center gap-1">
          <ClockIcon className="w-3.5 h-3.5" />
          {formatDuration(booking?.duration)}
        </div>
        <span className="font-medium text-gray-700">
          {formatCurrency(totalAmount, booking?.currency || 'AUD')}
        </span>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
          {sessionType}
        </span>
      </div>
    </div>
  );
}

export default function BookingsPage() {
  return (
    <Suspense fallback={<BookingsPageFallback />}>
      <BookingsPageContent />
    </Suspense>
  );
}
