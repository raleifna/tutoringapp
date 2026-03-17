// src/app/(app)/tutor/requests/page.jsx - Tutor Booking Requests Management
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarDaysIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { bookingApi } from '../../../../lib/api';

const STATUS_TABS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACCEPTED', label: 'Upcoming' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: '', label: 'All' },
];

const MOCK_BOOKINGS = [
  {
    id: '101',
    status: 'PENDING',
    subject: 'Mathematics',
    scheduledAt: '2026-03-20T10:00:00.000Z',
    duration: 60,
    totalAmount: 55,
    currency: 'AUD',
    sessionType: 'ONLINE',
    notes: 'Need help with calculus revision before the quiz.',
    learner: {
      firstName: 'Emily',
      lastName: 'Wang',
      avatar: '',
    },
  },
  {
    id: '102',
    status: 'ACCEPTED',
    subject: 'Programming',
    scheduledAt: '2026-03-22T14:30:00.000Z',
    duration: 90,
    totalAmount: 82.5,
    currency: 'AUD',
    sessionType: 'IN_PERSON',
    notes: '',
    learner: {
      firstName: 'Daniel',
      lastName: 'Lee',
      avatar: '',
    },
  },
  {
    id: '103',
    status: 'COMPLETED',
    subject: 'Physics',
    scheduledAt: '2026-03-10T09:00:00.000Z',
    duration: 120,
    totalAmount: 110,
    currency: 'AUD',
    sessionType: 'ONLINE',
    notes: 'Worked through mechanics past papers.',
    learner: {
      firstName: 'Sophie',
      lastName: 'Brown',
      avatar: '',
    },
  },
];

const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
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
  if (value % 60 === 0) return `${value / 60} hr`;
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

const getAvatarUrl = (avatar, firstName, lastName) => {
  if (avatar) return avatar;
  const name = `${firstName || ''} ${lastName || ''}`.trim() || 'Learner';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0ea5e9&color=fff`;
};

export default function TutorRequestsPage() {
  const [activeStatus, setActiveStatus] = useState('PENDING');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tutor-requests', activeStatus, page],
    queryFn: () => bookingApi.getTutorBookings({ status: activeStatus, page, limit: 10 }),
  });

  const mockBookings = activeStatus
    ? MOCK_BOOKINGS.filter((booking) => booking.status === activeStatus)
    : MOCK_BOOKINGS;
  const bookings = data?.data?.data?.bookings || (isError ? mockBookings : []);
  const pagination =
    data?.data?.data?.pagination ||
    (isError
      ? {
          page: 1,
          totalPages: 1,
        }
      : null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Booking Requests</h1>
        <p className="text-gray-600 mt-1">Manage session requests from learners</p>
      </div>

      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => {
              setActiveStatus(tab.value);
              setPage(1);
            }}
            className={cn(
              'px-4 py-2.5 -mb-px text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
              activeStatus === tab.value
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isError && (
        <div className="card p-4 border-yellow-200 bg-yellow-50">
          <p className="text-sm text-yellow-800">
            Preview mode: request data is using local mock content for frontend testing.
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16">
          <CalendarDaysIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="font-medium text-gray-900 mb-2">
            No {activeStatus.toLowerCase() || ''} requests
          </h3>
          <p className="text-sm text-gray-500">When learners book sessions, they&apos;ll appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => {
            const learner = booking.learner;
            return (
              <div key={booking.id} className="card p-5">
                <div className="flex items-start gap-4">
                  <img
                    src={getAvatarUrl(learner?.avatar, learner?.firstName, learner?.lastName)}
                    alt={learner?.firstName || 'Learner'}
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm">
                          {learner?.firstName} {learner?.lastName}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">{booking.subject}</p>
                      </div>
                      <span
                        className={cn(
                          'badge text-xs flex-shrink-0',
                          booking.status === 'PENDING' && 'bg-yellow-50 text-yellow-700',
                          booking.status === 'ACCEPTED' && 'bg-green-50 text-green-700',
                          booking.status === 'COMPLETED' && 'bg-gray-100 text-gray-600',
                          (booking.status === 'CANCELLED' || booking.status === 'DECLINED') &&
                            'bg-red-50 text-red-700'
                        )}
                      >
                        {booking.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <CalendarDaysIcon className="w-3.5 h-3.5" />
                        {formatDate(booking.scheduledAt)}
                      </div>
                      <div className="flex items-center gap-1">
                        <ClockIcon className="w-3.5 h-3.5" />
                        {formatDuration(booking.duration)}
                      </div>
                      <span className="font-medium text-gray-700">
                        {formatCurrency(booking.totalAmount, booking.currency)}
                      </span>
                      <span>{booking.sessionType?.replace('_', '-')}</span>
                    </div>
                    {booking.notes && (
                      <p className="text-xs text-gray-600 mt-2 bg-gray-50 rounded px-2 py-1.5 italic">
                        &quot;{booking.notes}&quot;
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                  <Link
                    href={`/bookings/${booking.id}?from=tutor-requests`}
                    className="btn-secondary btn-sm ml-auto"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => p - 1)}
            disabled={page <= 1}
            className="btn-secondary btn-sm disabled:opacity-40"
          >
            ← Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {pagination.totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= pagination.totalPages}
            className="btn-secondary btn-sm disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
