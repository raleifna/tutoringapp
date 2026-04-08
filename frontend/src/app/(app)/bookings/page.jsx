// src/app/(app)/bookings/page.jsx - bookings list page
'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { CalendarDaysIcon, ClockIcon } from '@heroicons/react/24/outline';
import { bookingApi } from '../../../lib/api-entry';
import { useAuthStore } from '../../../lib/store';

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'UNPAID', label: 'Unpaid' },
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

const getAvatarUrl = (avatar, firstName, lastName) => {
  if (avatar) return avatar;
  const name = `${firstName || ''} ${lastName || ''}`.trim() || 'Tutor';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0ea5e9&color=fff`;
};

const formatDate = (dateTime) => {
  if (!dateTime) return '-';
  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-AU', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatDuration = (minutes) => {
  const value = Number(minutes || 0);
  if (!value) return '0 mins';
  if (value % 60 === 0) {
    return `${value / 60} hr`;
  }
  return `${value} mins`;
};

const formatCurrency = (amount, currency = 'AUD') => {
  const value = Number(amount || 0);
  if (Number.isNaN(value)) return '$0';
  try {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currency || 'AUD',
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value}`;
  }
};

const getBookingStatusClass = (status) => {
  if (status === 'UNPAID') return 'bg-orange-50 text-orange-700 border border-orange-200';
  if (status === 'PENDING') return 'bg-amber-50 text-amber-700 border border-amber-200';
  if (status === 'ACCEPTED') return 'bg-blue-50 text-blue-700 border border-blue-200';
  if (status === 'COMPLETED') return 'bg-green-50 text-green-700 border border-green-200';
  if (status === 'CANCELLED') return 'bg-gray-100 text-gray-700 border border-gray-200';
  if (status === 'DECLINED') return 'bg-red-50 text-red-700 border border-red-200';
  return 'bg-gray-100 text-gray-700 border border-gray-200';
};

const formatBookingStatus = (status) => {
  if (status === 'UNPAID') return 'Unpaid';
  if (status === 'PENDING') return 'Pending';
  if (status === 'ACCEPTED') return 'Accepted';
  if (status === 'COMPLETED') return 'Completed';
  if (status === 'CANCELLED') return 'Cancelled';
  if (status === 'DECLINED') return 'Declined';
  if (status === 'RESCHEDULED') return 'Rescheduled';
  return status || 'Unknown';
};

// export default function BookingsPage() {
//   return (
//     <Suspense fallback={<BookingsPageFallback />}>
//       <BookingsPageContent />
//     </Suspense>
//   );
// }

function BookingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get('status');
  const fromParam = (searchParams.get('from') || '').toLowerCase();
  const { user } = useAuthStore();
  const currentUserId = user?.id || '';
  const [activeStatus, setActiveStatus] = useState(() => getInitialStatus(statusParam));
  const [page, setPage] = useState(1);
  const isTutor = user?.role === 'TUTOR';
  const fallbackBackHrefMap = {
    home: '/',
    search: '/search',
    dashboard: '/dashboard',
    bookings: isTutor ? '/tutor/dashboard' : '/dashboard',
    'tutor-dashboard': '/tutor/dashboard',
    'tutor-requests': '/tutor/requests',
  };
  const fallbackBackHref =
    fallbackBackHrefMap[fromParam] || (isTutor ? '/tutor/dashboard' : '/dashboard');

  useEffect(() => {
    setActiveStatus(getInitialStatus(statusParam));
    setPage(1);
  }, [statusParam]);

  const handleBack = () => {
    router.push(fallbackBackHref);
  };

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['bookings', currentUserId, activeStatus, page, isTutor],
    queryFn: () =>
      isTutor
        ? bookingApi.getTutorBookings({ status: activeStatus, page, limit: 10 })
        : bookingApi.getMyBookings({ status: activeStatus, page, limit: 10 }),
    enabled: !!currentUserId,
    keepPreviousData: true,
  });

  const bookings = data?.data?.data?.bookings || [];
  const pagination = data?.data?.data?.pagination;
  const totalPages = pagination?.totalPages || 1;
  const currentPage = pagination?.page || page;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-gray-900 flex-1">My Bookings</h1>
          <p className="mt-1 text-gray-600">Manage your tutoring sessions</p>
        </div>
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600"
        >
          <span>←</span> Back
        </button>
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
      ) : !isError && bookings.length === 0 ? (
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
          {bookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              isTutor={isTutor}
              detailFrom={fromParam || 'bookings'}
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

function BookingCard({ booking, isTutor, detailFrom }) {
  const other = isTutor ? booking?.learner : booking?.tutorProfile?.user || booking?.tutor || {};
  const otherFirstName = other?.firstName || (isTutor ? 'Learner' : 'Tutor');
  const otherLastName = other?.lastName || '';
  const sessionType = booking?.sessionType ? String(booking.sessionType).replace('_', '-') : 'Session';
  const totalAmount =
    booking?.totalAmount ??
    ((Number(booking?.hourlyRate || 0) * Number(booking?.duration || 0)) / 60 || 0);

  return (
    <Link
      href={`/bookings/${booking.id}?from=${encodeURIComponent(detailFrom || 'bookings')}`}
      className="block bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-primary-100 transition-all"
    >
      <div className="flex items-start gap-4">
        <img
          src={getAvatarUrl(other?.avatar, otherFirstName, otherLastName)}
          alt={otherFirstName}
          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">
                Session with: {otherFirstName} {otherLastName}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">{booking?.subject || 'Session'}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${getBookingStatusClass(booking?.status)}`}>
                {formatBookingStatus(booking?.status)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
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
      </div>
    </Link>
  );
}

export default function BookingsPage() {
  return (
    <Suspense fallback={<BookingsPageFallback />}>
      <BookingsPageContent />
    </Suspense>
  );
}
