// src/app/(app)/tutor/requests/page.jsx - Tutor Booking Requests Management
'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  CheckCircleIcon,
  XCircleIcon,
  CalendarDaysIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { bookingApi } from '../../../../lib/api-entry';
import { cn, formatCurrency, formatDate, formatDuration, getAvatarUrl } from '../../../../lib/format';

const STATUS_TABS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACCEPTED', label: 'Upcoming' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: '', label: 'All' },
];

const STATUS_VALUES = new Set(STATUS_TABS.map((item) => item.value));

const getInitialStatus = (value) => {
  const next = String(value || '').toUpperCase();
  return STATUS_VALUES.has(next) ? next : 'PENDING';
};

const getPageNumber = (value) => {
  const next = Number.parseInt(String(value || '1'), 10);
  return Number.isFinite(next) && next > 0 ? next : 1;
};

export default function TutorRequestsPage() {
  return (
    <Suspense fallback={<TutorRequestsFallback />}>
      <TutorRequestsContent />
    </Suspense>
  );
}

function TutorRequestsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get('status');
  const pageParam = searchParams.get('page');
  const [activeStatus, setActiveStatus] = useState(() =>
    getInitialStatus(statusParam)
  );
  const [page, setPage] = useState(() => getPageNumber(pageParam));
  const queryClient = useQueryClient();
  const currentRequestsHref = (() => {
    const params = new URLSearchParams();
    if (activeStatus) params.set('status', activeStatus);
    if (page > 1) params.set('page', String(page));
    const query = params.toString();
    return query ? `/tutor/requests?${query}` : '/tutor/requests';
  })();

  useEffect(() => {
    const next = getInitialStatus(statusParam);
    setActiveStatus(next);
    setPage(getPageNumber(pageParam));
  }, [pageParam, statusParam]);

  const { data, isLoading } = useQuery({
    queryKey: ['tutor-requests', activeStatus, page],
    queryFn: () => bookingApi.getTutorBookings({ status: activeStatus, page, limit: 10 }),
  });

  const bookings = data?.data?.data?.bookings || [];
  const pagination = data?.data?.data?.pagination;

  const acceptMutation = useMutation({
    mutationFn: (id) => bookingApi.accept(id),
    onSuccess: () => {
      toast.success('Booking accepted!');
      queryClient.invalidateQueries({ queryKey: ['tutor-requests'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to accept');
    },
  });

  const declineMutation = useMutation({
    mutationFn: (id) => bookingApi.decline(id),
    onSuccess: (response) => {
      toast.success(response?.data?.message || 'Booking declined');
      queryClient.invalidateQueries({ queryKey: ['tutor-requests'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to decline');
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id) => bookingApi.complete(id),
    onSuccess: () => {
      toast.success('Session marked as complete');
      queryClient.invalidateQueries({ queryKey: ['tutor-requests'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed');
    },
  });

  return (
    <div className="relative space-y-5">
      <div className="pl-4">
        <div className='flex'>
          <h1 className="text-2xl font-bold text-gray-900 flex-1">Booking Requests</h1>
        </div>
        <p className="text-gray-600 mt-1">Manage session requests from learners</p>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => {
              setActiveStatus(tab.value);
              setPage(1);
            }}
            className={cn(
              'flex-1 px-2 py-2.5 -mb-px text-center text-sm font-medium border-b-2 transition-colors',
              activeStatus === tab.value
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

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
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
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
            const detailHref = `/bookings/${booking.id}?returnTo=${encodeURIComponent(currentRequestsHref)}&from=tutor-requests`;
            return (
              <div
                key={booking.id}
                role="link"
                tabIndex={0}
                onClick={() => router.push(detailHref)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    router.push(detailHref);
                  }
                }}
                className="card cursor-pointer p-5 transition-all hover:border-primary-100 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
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
                  {booking.status === 'PENDING' && (
                    <>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          acceptMutation.mutate(booking.id);
                        }}
                        disabled={acceptMutation.isPending}
                        className="btn-primary btn-sm gap-1.5 flex-1"
                      >
                        <CheckCircleIcon className="w-4 h-4" /> Accept
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          declineMutation.mutate(booking.id);
                        }}
                        disabled={declineMutation.isPending}
                        className="btn-danger btn-sm gap-1.5 flex-1"
                      >
                        <XCircleIcon className="w-4 h-4" /> Decline
                      </button>
                    </>
                  )}
                  {booking.status === 'ACCEPTED' && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        completeMutation.mutate(booking.id);
                      }}
                      disabled={completeMutation.isPending}
                      className="btn-primary btn-sm gap-1.5"
                    >
                      <CheckCircleIcon className="w-4 h-4" /> Mark Complete
                    </button>
                  )}
                  <Link
                    href={detailHref}
                    onClick={(event) => event.stopPropagation()}
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

function TutorRequestsFallback() {
  return (
    <div className="space-y-5">
      <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
      <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card p-5 animate-pulse h-28" />
        ))}
      </div>
    </div>
  );
}
