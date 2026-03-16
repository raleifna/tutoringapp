// src/app/(app)/bookings/[id]/page.jsx - Booking detail page (learner stage)
'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { bookingApi } from '../../../../lib/api';
import { useAuthStore } from '../../../../lib/store';

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

  const from = searchParams.get('from');
  const backHref = from === 'tutor-requests' ? '/tutor/requests' : '/bookings';
  const backLabel = from === 'tutor-requests' ? 'Back to requests' : 'Back to bookings';

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingApi.getById(id),
    enabled: !!id,
  });

  const booking = data?.data?.data;
  const isLearner = user?.role === 'LEARNER';
  const canCancel = isLearner && ['PENDING', 'ACCEPTED'].includes(booking?.status);

  const cancelMutation = useMutation({
    mutationFn: () => bookingApi.cancel(id),
    onSuccess: () => {
      toast.success('Booking cancelled');
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to cancel booking');
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4" />
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
        <p className="text-red-600 mb-3">{error?.response?.data?.message || 'Failed to load booking detail.'}</p>
        <div className="flex items-center justify-center gap-3">
          <button type="button" onClick={() => refetch()} className="btn-primary btn-sm">
            Retry
          </button>
          <Link href="/bookings" className="btn-secondary btn-sm">
            Back
          </Link>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-2xl mx-auto text-center py-14">
        <p className="text-gray-500 mb-3">Booking not found</p>
        <Link href="/bookings" className="btn-primary btn-sm">
          View All Bookings
        </Link>
      </div>
    );
  }

  const other = booking?.tutorProfile?.user || booking?.tutor || {};
  const totalAmount =
    booking?.totalAmount ??
    ((Number(booking?.hourlyRate || 0) * Number(booking?.duration || 0)) / 60 || 0);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600">
        <ArrowLeftIcon className="w-4 h-4" />
        {backLabel}
      </Link>

      <div className={`rounded-lg px-4 py-3 flex items-center gap-2 text-sm font-medium ${getStatusClass(booking.status)}`}>
        {booking.status === 'PENDING' && <ExclamationTriangleIcon className="w-5 h-5" />}
        {booking.status === 'ACCEPTED' && <CheckCircleIcon className="w-5 h-5" />}
        {booking.status === 'COMPLETED' && <CheckCircleIcon className="w-5 h-5" />}
        {booking.status === 'CANCELLED' && <XCircleIcon className="w-5 h-5" />}
        Booking Status: <strong>{booking.status}</strong>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <img
            src={getAvatarUrl(other?.avatar, other?.firstName, other?.lastName)}
            alt={other?.firstName || 'Tutor'}
            className="w-14 h-14 rounded-full object-cover"
          />
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Tutor</p>
            <h2 className="font-semibold text-gray-900">
              {other?.firstName || 'Tutor'} {other?.lastName || ''}
            </h2>
            <p className="text-sm text-gray-500">{other?.email || '-'}</p>
          </div>
        </div>

        <hr className="border-gray-100" />

        <div className="grid grid-cols-2 gap-4 text-sm">
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

      {canCancel && (
        <div>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Cancel this booking?')) {
                cancelMutation.mutate();
              }
            }}
            disabled={cancelMutation.isPending}
            className="btn w-full justify-center bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
          >
            {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Booking'}
          </button>
        </div>
      )}
    </div>
  );
}
