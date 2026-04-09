'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircleIcon, CreditCardIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { bookingApi } from '../../../../../lib/api-entry';
import { useAuthStore } from '../../../../../lib/store';

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

const getPaymentStatusClass = (status) => {
  if (status === 'COMPLETED') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  if (status === 'FAILED') return 'bg-red-50 text-red-700 border border-red-200';
  if (status === 'REFUNDED') return 'bg-gray-100 text-gray-700 border border-gray-200';
  if (status === 'CANCELLED') return 'bg-gray-100 text-gray-700 border border-gray-200';
  return 'bg-amber-50 text-amber-700 border border-amber-200';
};

const formatPaymentStatus = (status) => {
  if (status === 'COMPLETED') return 'Paid';
  if (status === 'FAILED') return 'Payment Failed';
  if (status === 'REFUNDED') return 'Refunded';
  if (status === 'CANCELLED') return 'Cancelled';
  return 'Unpaid';
};

export default function BookingPaymentPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const currentUserId = user?.id || '';
  const returnTo = searchParams.get('returnTo') || '';
  const showBackButton = Boolean(returnTo);
  const paymentSuccessHref = (() => {
    if (!returnTo) return `/bookings/${id}?payment=success`;

    const [pathname, queryString = ''] = returnTo.split('?');
    const params = new URLSearchParams(queryString);
    params.set('payment', 'success');
    const query = params.toString();

    return query ? `${pathname}?${query}` : pathname;
  })();

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
  const paymentStatus = booking?.payment?.status || 'PENDING';
  const isPaid = paymentStatus === 'COMPLETED';
  const totalAmount =
    booking?.totalAmount ??
    ((Number(booking?.hourlyRate || 0) * Number(booking?.duration || 0)) / 60 || 0);

  const payMutation = useMutation({
    mutationFn: () => bookingApi.pay(id),
    onSuccess: () => {
      toast.success('Payment successful. Your booking is now waiting for tutor confirmation.');
      queryClient.invalidateQueries({ queryKey: ['booking', currentUserId, id] });
      queryClient.invalidateQueries({ queryKey: ['bookings', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['myBookings'] });
      router.push(paymentSuccessHref);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to process payment');
    },
  });

  if (!currentUserId) {
    return (
      <div className="max-w-2xl mx-auto text-center py-14">
        <p className="text-gray-700 font-medium mb-1">Login required</p>
        <p className="text-gray-500 text-sm mb-4">Please log in first to continue payment.</p>
        <Link href="/login" className="btn-primary btn-sm">
          Go to login
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3" />
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-3">
          <div className="h-5 bg-gray-200 rounded w-1/2" />
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <div className="max-w-2xl mx-auto text-center py-14">
        <ExclamationTriangleIcon className="w-10 h-10 text-red-400 mx-auto mb-2" />
        <p className="text-red-700 font-medium mb-1">Unable to load order detail</p>
        <p className="text-red-600 mb-3">{error?.response?.data?.message || 'Failed to load booking detail.'}</p>
        <div className="flex items-center justify-center gap-3">
          <button type="button" onClick={() => refetch()} className="btn-primary btn-sm">
            Retry
          </button>
          {showBackButton && (
            <Link href={returnTo} className="btn-secondary btn-sm">
              Back
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Order Detail</p>
          <h1 className="text-2xl font-bold text-gray-900">Confirm Payment</h1>
        </div>
        {showBackButton && (
          <Link href={returnTo} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600">
            <span>←</span> Back
          </Link>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">Booking ID</p>
            <p className="font-medium text-gray-900">{booking.id}</p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getPaymentStatusClass(paymentStatus)}`}
          >
            {formatPaymentStatus(paymentStatus)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Tutor</p>
            <p className="font-medium text-gray-900">
              {booking?.tutorProfile?.user?.firstName || 'Tutor'} {booking?.tutorProfile?.user?.lastName || ''}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Subject</p>
            <p className="font-medium text-gray-900">{booking.subject || '-'}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Session Time</p>
            <p className="font-medium text-gray-900">{formatDate(booking.scheduledAt)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Duration</p>
            <p className="font-medium text-gray-900">{formatDuration(booking.duration)}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-blue-600 uppercase tracking-wide mb-1">Total to Pay</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(totalAmount, booking.currency || 'AUD')}
              </p>
            </div>
            <CreditCardIcon className="w-8 h-8 text-blue-500" />
          </div>
          <p className="text-sm text-blue-700 mt-3">
            This is a mock payment flow for demo purposes. No real transaction will be charged.
            After payment, your booking will be sent to the tutor for confirmation.
          </p>
        </div>

        {isPaid ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
            This booking has already been paid and is now waiting for tutor confirmation.
          </div>
        ) : (
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link href={showBackButton ? returnTo : `/bookings/${id}`} className="btn-secondary text-center">
              Cancel
            </Link>
            <button
              type="button"
              onClick={() => payMutation.mutate()}
              disabled={payMutation.isPending}
              className="btn-primary gap-2"
            >
              <CheckCircleIcon className="w-4 h-4" />
              {payMutation.isPending ? 'Processing...' : 'Pay and Send for Confirmation'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
