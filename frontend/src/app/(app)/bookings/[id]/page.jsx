// src/app/(app)/bookings/[id]/page.jsx -  Booking Detail Page
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { bookingApi } from '../../../../lib/api-entry';
import { useAuthStore } from '../../../../lib/store';

const rescheduleSchema = z.object({
  newDate: z.string().min(1, 'Please select a new date'),
  reason: z.string().optional(),
});

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

const getStatusClass = (status) => {
  if (status === 'PENDING') return 'bg-amber-50 text-amber-700 border border-amber-200';
  if (status === 'ACCEPTED') return 'bg-blue-50 text-blue-700 border border-blue-200';
  if (status === 'COMPLETED') return 'bg-green-50 text-green-700 border border-green-200';
  if (status === 'CANCELLED') return 'bg-gray-100 text-gray-700 border border-gray-200';
  if (status === 'DECLINED') return 'bg-red-50 text-red-700 border border-red-200';
  return 'bg-gray-100 text-gray-700 border border-gray-200';
};

export default function BookingDetailPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const currentUserId = user?.id || '';
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);

  const from = (searchParams.get('from') || '').toLowerCase();
  const backConfigMap = {
    'tutor-requests': { href: '/tutor/requests', label: 'Back' },
    'tutor-dashboard': { href: '/tutor/dashboard', label: 'Back' },
    dashboard: { href: '/dashboard', label: 'Back' },
    search: { href: '/search', label: 'Back' },
    bookings: { href: '/bookings', label: 'Back' },
  };
  const backConfig = backConfigMap[from] || backConfigMap.bookings;
  const backHref = backConfig.href;
  const backLabel = backConfig.label;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['booking', currentUserId, id],
    queryFn: () => bookingApi.getById(id),
    enabled: !!id && !!currentUserId,
  });

  const booking = data?.data?.data;
  const isTutor = user?.role === 'TUTOR';
  const isLearner = user?.role === 'LEARNER';
  const other = isTutor ? booking?.learner : booking?.tutorProfile?.user || booking?.tutor;
  const scheduledAt = booking?.scheduledAt;
  const timeDelta = new Date(scheduledAt) -  new Date(); 
  const canCancel = isLearner && ['PENDING', 'ACCEPTED'].includes(booking?.status) && (timeDelta > 1000 * 60 * 60 *24);

  const cancelMutation = useMutation({
    mutationFn: () => bookingApi.cancel(id),
    onSuccess: () => {
      toast.success('Booking cancelled');
      queryClient.invalidateQueries({ queryKey: ['booking', currentUserId, id] });
      queryClient.invalidateQueries({ queryKey: ['bookings', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['myBookings'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to cancel booking');
    },
  });

  const acceptMutation = useMutation({
    mutationFn: () => bookingApi.accept(id),
    onSuccess: () => {
      toast.success('Booking accepted!');
      queryClient.invalidateQueries({ queryKey: ['booking', currentUserId, id] });
      queryClient.invalidateQueries({ queryKey: ['tutor-requests'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to accept');
    },
  });

  const declineMutation = useMutation({
    mutationFn: () => bookingApi.decline(id),
    onSuccess: () => {
      toast.success('Booking declined');
      queryClient.invalidateQueries({ queryKey: ['booking', currentUserId, id] });
      queryClient.invalidateQueries({ queryKey: ['tutor-requests'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to decline');
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => bookingApi.complete(id),
    onSuccess: () => {
      toast.success('Session marked as complete');
      queryClient.invalidateQueries({ queryKey: ['booking', currentUserId, id] });
      queryClient.invalidateQueries({ queryKey: ['tutor-requests'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to complete');
    },
  });

  const {
    register: registerReschedule,
    handleSubmit: handleRescheduleSubmit,
    formState: { errors: rescheduleErrors },
  } = useForm({
    resolver: zodResolver(rescheduleSchema),
  });

  if (!currentUserId) {
    return (
      <div className="max-w-2xl mx-auto text-center py-14">
        <p className="text-gray-700 font-medium mb-1">Login required</p>
        <p className="text-gray-500 text-sm mb-4">Please log in first to view booking details.</p>
        <Link href="/login" className="btn-primary btn-sm">
          Go to login
        </Link>
      </div>
    );
  }

  if (!id) {
    return (
      <div className="max-w-2xl mx-auto text-center py-14">
        <p className="text-gray-700 font-medium mb-1">Invalid booking link</p>
        <p className="text-gray-500 text-sm mb-4">Booking ID is missing.</p>
        <Link href={backHref} className="btn-primary btn-sm">
          {backLabel}
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3" />
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-3">
          <div className="h-5 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-2xl mx-auto text-center py-14">
        <ExclamationTriangleIcon className="w-10 h-10 text-red-400 mx-auto mb-2" />
        <p className="text-red-700 font-medium mb-1">Unable to load booking detail</p>
        <p className="text-red-600 mb-3">{error?.response?.data?.message || 'Failed to load booking detail.'}</p>
        <div className="flex items-center justify-center gap-3">
          <button type="button" onClick={() => refetch()} className="btn-primary btn-sm">
            Retry
          </button>
          <Link href={backHref} className="btn-secondary btn-sm">
            {backLabel}
          </Link>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-2xl mx-auto text-center py-14">
        <p className="text-gray-700 font-medium mb-1">Booking not found</p>
        <p className="text-gray-500 text-sm mb-3">This booking may have been removed or is unavailable.</p>
        <Link href={backHref} className="btn-primary btn-sm">
          {backLabel}
        </Link>
      </div>
    );
  }
  const totalAmount =
    booking?.totalAmount ??
    ((Number(booking?.hourlyRate || 0) * Number(booking?.duration || 0)) / 60 || 0);

  return (
    <div className="relative max-w-2xl mx-auto space-y-5">
      <div className={`rounded-lg px-4 py-3 flex items-center gap-2 text-sm font-medium ${getStatusClass(booking.status)}`}>
        {booking.status === 'PENDING' && <ExclamationTriangleIcon className="w-5 h-5" />}
        {booking.status === 'ACCEPTED' && <CheckCircleIcon className="w-5 h-5" />}
        {booking.status === 'COMPLETED' && <CheckCircleIcon className="w-5 h-5" />}
        {booking.status === 'CANCELLED' && <XCircleIcon className="w-5 h-5" />}
        Booking Status: <strong className='flex-1'>{booking.status}</strong>
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600">
          <span>←</span> {backLabel}
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <img
            src={getAvatarUrl(other?.avatar, other?.firstName, other?.lastName)}
            alt={other?.firstName || 'Tutor'}
            className="w-14 h-14 rounded-full object-cover"
          />
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">
              {isTutor ? 'Learner' : 'Tutor'}
            </p>
            <h2 className="font-semibold text-gray-900">
              {other?.firstName || 'Tutor'} {other?.lastName || ''}
            </h2>
            <p className="text-sm text-gray-500">{other?.email || '-'}</p>
          </div>
        </div>

        <hr className="border-gray-100" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Subject</p>
            <p className="font-medium text-gray-900">{booking.subject || '-'}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Session Type</p>
            <p className="font-medium text-gray-900">
              {booking.sessionType ? String(booking.sessionType).replace('_', '-') : '-'}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Date & Time</p>
            <p className="font-medium text-gray-900 inline-flex items-center gap-1">
              <CalendarDaysIcon className="w-4 h-4 text-gray-400" />
              {formatDate(booking.scheduledAt)}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Duration</p>
            <p className="font-medium text-gray-900 inline-flex items-center gap-1">
              <ClockIcon className="w-4 h-4 text-gray-400" />
              {formatDuration(booking.duration)}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Total Amount</p>
            <p className="font-bold text-gray-900 text-base">
              {formatCurrency(totalAmount, booking.currency || 'AUD')}
            </p>
          </div>
        </div>

        {booking.notes && (
          <>
            <hr className="border-gray-100" />
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Notes</p>
              <p className="text-gray-700 text-sm leading-relaxed">{booking.notes}</p>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className='text-gray-700 text-sm mb-2 mt-2'>Please note that your subscription must be cancelled one day in advance.</div>
        {canCancel && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Cancel this booking?')) {
                cancelMutation.mutate();
              }
            }}
            disabled={cancelMutation.isPending}
            className="btn-danger gap-2"
          >
            <XCircleIcon className="w-4 h-4" />
            {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Booking'}
          </button>
        )}

        {isTutor && booking.status === 'PENDING' && (
          <>
            <button
              type="button"
              onClick={() => acceptMutation.mutate()}
              disabled={acceptMutation.isPending}
              className="btn-primary gap-2"
            >
              <CheckCircleIcon className="w-4 h-4" />
              {acceptMutation.isPending ? 'Accepting...' : 'Accept'}
            </button>
            <button
              type="button"
              onClick={() => declineMutation.mutate()}
              disabled={declineMutation.isPending}
              className="btn-danger gap-2"
            >
              <XCircleIcon className="w-4 h-4" />
              {declineMutation.isPending ? 'Declining...' : 'Decline'}
            </button>
            <button
              type="button"
              onClick={() => setShowRescheduleModal(true)}
              className="btn-secondary gap-2"
            >
              <CalendarDaysIcon className="w-4 h-4" />
              Reschedule
            </button>
          </>
        )}

        {isTutor && booking.status === 'ACCEPTED' && (
          <button
            type="button"
            onClick={() => completeMutation.mutate()}
            disabled={completeMutation.isPending}
            className="btn-primary gap-2"
          >
            <CheckCircleIcon className="w-4 h-4" />
            {completeMutation.isPending ? 'Saving...' : 'Mark Complete'}
          </button>
        )}
      </div>

      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-5 text-lg font-bold text-gray-900">Propose Reschedule</h2>
            <form
              onSubmit={handleRescheduleSubmit((formData) => {
                bookingApi
                  .reschedule(id, {
                    scheduledAt: new Date(formData.newDate).toISOString(),
                    reason: formData.reason,
                  })
                  .then(() => {
                    toast.success('Reschedule proposed');
                    setShowRescheduleModal(false);
                    queryClient.invalidateQueries({ queryKey: ['booking', currentUserId, id] });
                    queryClient.invalidateQueries({ queryKey: ['tutor-requests'] });
                  })
                  .catch((err) => {
                    toast.error(err?.response?.data?.message || 'Failed');
                  });
              })}
              className="space-y-4"
            >
              <div>
                <label className="label">New Date & Time</label>
                <input
                  type="datetime-local"
                  {...registerReschedule('newDate')}
                  className="input"
                  min={new Date().toISOString().slice(0, 16)}
                />
                {rescheduleErrors.newDate && (
                  <p className="error-text">{rescheduleErrors.newDate.message}</p>
                )}
              </div>
              <div>
                <label className="label">Reason (optional)</label>
                <textarea
                  {...registerReschedule('reason')}
                  rows={2}
                  className="input resize-none"
                  placeholder="Reason for rescheduling..."
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn-primary flex-1">
                  Propose
                </button>
                <button
                  type="button"
                  onClick={() => setShowRescheduleModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
