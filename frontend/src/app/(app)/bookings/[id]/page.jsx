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
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { bookingApi, paymentApi } from '../../../../lib/api-entry';
import { getAvatarUrl } from '../../../../lib/avatar';
import { formatBookingStatus, getBookingStatusClass as getStatusClass } from '../../../../lib/booking-status';
import { formatCurrency, formatDateTimeWithYear as formatDate, formatDuration } from '../../../../lib/formatters';
import {
  getPayableSeriesBookings,
  getRecurringLabel,
  getRecurringSeriesBookings,
  getSeriesTotalAmount,
  isRecurringBooking,
} from '../../../../lib/recurring-bookings';
import { useAuthStore } from '../../../../lib/store';
import BackButton from '../../../../components/BackButton';

const rescheduleSchema = z.object({
  newDate: z.string().min(1, 'Please select a new date'),
  reason: z.string().optional(),
});

const formatSavedMethod = (paymentMethod) => {
  if (!paymentMethod?.last4) return 'No payment method saved';

  const brand = String(paymentMethod.brand || 'card');
  const label = brand.charAt(0).toUpperCase() + brand.slice(1);

  return `${label} ending in ${paymentMethod.last4}`;
};

export default function BookingDetailPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const currentUserId = user?.id || '';
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);

  const from = (searchParams.get('from') || '').toLowerCase();
  const returnTo = searchParams.get('returnTo') || '';
  const paymentResult = (searchParams.get('payment') || '').toLowerCase();
  const showBackButton = Boolean(returnTo || from);
  const paymentMethodResult = (searchParams.get('paymentMethod') || '').toLowerCase();
  const backConfigMap = {
    'tutor-requests': { href: '/tutor/requests', label: 'Back' },
    'tutor-dashboard': { href: '/tutor/dashboard', label: 'Back' },
    dashboard: { href: '/dashboard', label: 'Back' },
    search: { href: '/search', label: 'Back' },
    bookings: { href: '/bookings', label: 'Back' },
  };
  const backConfig = backConfigMap[from] || null;
  const backHref = returnTo || backConfig?.href || '/bookings';
  const backLabel = backConfig?.label || 'Back';

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

  const savedMethodQuery = useQuery({
    queryKey: ['savedPaymentMethod', currentUserId],
    queryFn: () => paymentApi.getSavedMethod(),
    enabled: !!currentUserId && !!isLearner,
  });
  const other = isTutor ? booking?.learner : booking?.tutorProfile?.user || booking?.tutor;
  const bookingTutorId = booking?.tutorProfile?.id || booking?.tutor?.id || booking?.tutorId;
  const bookingDetailHref = (() => {
    const params = new URLSearchParams();
    if (returnTo) params.set('returnTo', returnTo);
    if (from) params.set('from', from);
    if (paymentResult) params.set('payment', paymentResult);
    const query = params.toString();
    return query ? `/bookings/${id}?${query}` : `/bookings/${id}`;
  })();
  const tutorDetailHref = (() => {
    if (isTutor) return null;
    if (!bookingTutorId) return null;

    const params = new URLSearchParams();
    params.set('returnTo', bookingDetailHref);
    const query = params.toString();

    return query ? `/tutors/${bookingTutorId}?${query}` : `/tutors/${bookingTutorId}`;
  })();
  const scheduledAt = booking?.scheduledAt;
  const paymentStatus = booking?.payment?.status || 'PENDING';
  const savedMethod = savedMethodQuery.data?.data?.data?.paymentMethod || null;
  const isPaidBooking = ['PAID', 'COMPLETED'].includes(paymentStatus);
  const isRefunded = paymentStatus === 'REFUNDED';
  const isProcessingPayment = paymentStatus === 'PROCESSING';
  const isFailedPayment = paymentStatus === 'FAILED';
  const timeDelta = new Date(scheduledAt) - new Date();
  const isAcceptedBooking = booking?.status === 'ACCEPTED';
  const canSetupPaymentMethod =
    isLearner &&
    booking?.status === 'PENDING' &&
    ['PENDING', 'FAILED'].includes(paymentStatus);
  const canCancel =
    isLearner &&
    ['PENDING', 'ACCEPTED'].includes(booking?.status) &&
    (!isAcceptedBooking || !isPaidBooking || timeDelta > 1000 * 60 * 60 * 24);

  const cancelMutation = useMutation({
    mutationFn: () => bookingApi.cancel(id),
    onSuccess: (response) => {
      const refunded = response?.data?.data?.payment?.status === 'REFUNDED';
      toast.success(refunded ? 'Booking cancelled and payment refunded' : 'Booking cancelled');
      queryClient.invalidateQueries({ queryKey: ['booking', currentUserId, id] });
      queryClient.invalidateQueries({ queryKey: ['bookings', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['myBookings'] });
      if (bookingTutorId) {
        queryClient.invalidateQueries({ queryKey: ['tutor-availability', bookingTutorId] });
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to cancel booking');
    },
  });

  const acceptMutation = useMutation({
    mutationFn: () => bookingApi.accept(id),
    onSuccess: (response) => {
      toast.success(response?.data?.message || 'Booking accepted!');
      queryClient.invalidateQueries({ queryKey: ['booking', currentUserId, id] });
      queryClient.invalidateQueries({ queryKey: ['tutor-requests'] });
      queryClient.invalidateQueries({ queryKey: ['bookings', currentUserId] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to accept');
    },
  });

  const declineMutation = useMutation({
    mutationFn: () => bookingApi.decline(id),
    onSuccess: (response) => {
      toast.success(response?.data?.message || 'Booking declined');
      queryClient.invalidateQueries({ queryKey: ['booking', currentUserId, id] });
      queryClient.invalidateQueries({ queryKey: ['tutor-requests'] });
      queryClient.invalidateQueries({ queryKey: ['bookings', currentUserId] });
      if (bookingTutorId) {
        queryClient.invalidateQueries({ queryKey: ['tutor-availability', bookingTutorId] });
      }
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
        {showBackButton && (
          <BackButton href={backHref} label={backLabel} />
        )}
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
          {showBackButton && (
            <BackButton href={backHref} label={backLabel} />
          )}
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-2xl mx-auto text-center py-14">
        <p className="text-gray-700 font-medium mb-1">Booking not found</p>
        <p className="text-gray-500 text-sm mb-3">This booking may have been removed or is unavailable.</p>
        {showBackButton && (
          <BackButton href={backHref} label={backLabel} />
        )}
      </div>
    );
  }
  const totalAmount =
    booking?.totalAmount ??
    ((Number(booking?.hourlyRate || 0) * Number(booking?.duration || 0)) / 60 || 0);
  const recurring = isRecurringBooking(booking);
  const recurringLabel = getRecurringLabel(booking);
  const recurringBookings = getRecurringSeriesBookings(booking);
  const paymentSetupSeriesBookings = getPayableSeriesBookings(booking);
  const paymentSetupSeriesAmount = getSeriesTotalAmount(paymentSetupSeriesBookings);

  return (
    <div className="relative max-w-2xl mx-auto space-y-5">
      {paymentMethodResult === 'saved' && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Payment method saved. We will charge it automatically once the tutor accepts this booking.
        </div>
      )}

      {paymentResult === 'success' && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Payment successful. {recurring ? 'The selected sessions have' : 'Your booking has'} been sent to the tutor for confirmation.
        </div>
      )}

      <div className={`rounded-lg px-4 py-3 flex items-center gap-2 text-sm font-medium ${getStatusClass(booking.status)}`}>
        {booking.status === 'UNPAID' && <ExclamationTriangleIcon className="w-5 h-5" />}
        {booking.status === 'PENDING' && <ExclamationTriangleIcon className="w-5 h-5" />}
        {booking.status === 'ACCEPTED' && <CheckCircleIcon className="w-5 h-5" />}
        {booking.status === 'COMPLETED' && <CheckCircleIcon className="w-5 h-5" />}
        {booking.status === 'CANCELLED' && <XCircleIcon className="w-5 h-5" />}
        Booking Status: <strong className="flex-1">{formatBookingStatus(booking.status)}</strong>
        {showBackButton && (
          <BackButton href={backHref} label={backLabel} />
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
        {tutorDetailHref ? (
          <div className="flex items-center gap-3">
            <Link
              href={tutorDetailHref}
              className="group rounded-full transition-transform hover:scale-[1.03]"
            >
              <img
                src={getAvatarUrl(other?.avatar, other?.firstName, other?.lastName, { fallbackName: 'Tutor' })}
                alt={other?.firstName || 'Tutor'}
                className="w-14 h-14 rounded-full object-cover ring-0 transition-shadow group-hover:shadow-md group-hover:ring-2 group-hover:ring-sky-100"
              />
            </Link>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">
                Tutor
              </p>
              <h2 className="font-semibold text-gray-900">
                {other?.firstName || 'Tutor'} {other?.lastName || ''}
              </h2>
              <p className="text-sm text-gray-500">{other?.email || '-'}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <img
              src={getAvatarUrl(other?.avatar, other?.firstName, other?.lastName, { fallbackName: 'Tutor' })}
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
        )}

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

        {recurring && (
          <>
            <hr className="border-gray-100" />
            <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-sky-700 uppercase tracking-wide font-semibold">
                    Recurring Booking
                  </p>
                  <h3 className="mt-1 font-semibold text-gray-900">{recurringLabel}</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Tutor accept/decline actions apply to all pending sessions in this series.
                    Learner cancellation still applies to this session only.
                  </p>
                </div>
                {paymentSetupSeriesBookings.length > 0 && isLearner && (
                  <Link
                    href={`/bookings/${id}/payment?returnTo=${encodeURIComponent(bookingDetailHref)}`}
                    className="btn-secondary btn-sm shrink-0"
                  >
                    Set Up Series Payment
                  </Link>
                )}
              </div>

              {recurringBookings.length > 0 && (
                <div className="mt-4 space-y-2">
                  {recurringBookings.map((seriesBooking) => {
                    const isCurrent = seriesBooking.id === booking.id;
                    return (
                      <Link
                        key={seriesBooking.id}
                        href={`/bookings/${seriesBooking.id}?returnTo=${encodeURIComponent(backHref)}&from=${from || 'bookings'}`}
                        className={`block rounded-xl border px-3 py-2 text-sm transition-colors ${
                          isCurrent
                            ? 'border-sky-200 bg-white'
                            : 'border-white/70 bg-white/70 hover:border-sky-200 hover:bg-white'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium text-gray-900">
                            {formatDate(seriesBooking.scheduledAt)}
                            {isCurrent ? ' · current' : ''}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${getStatusClass(seriesBooking.status)}`}>
                            {formatBookingStatus(seriesBooking.status)}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span>{formatDuration(seriesBooking.duration)}</span>
                          <span>{formatCurrency(seriesBooking.totalAmount, seriesBooking.currency || booking.currency || 'AUD')}</span>
                          <span>
                            Payment: {seriesBooking.payment?.status || 'PENDING'}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

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

      {canSetupPaymentMethod && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs text-sky-700 uppercase tracking-[0.18em] font-semibold">
                  Payment Method
                </p>
                <div className="flex items-end gap-3">
                  <h3 className="text-3xl font-bold tracking-tight text-gray-900">
                    {formatCurrency(totalAmount, booking.currency || 'AUD')}
                  </h3>
                </div>
                {savedMethod && !isFailedPayment && (
                  <div className="inline-flex items-center rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-xs font-medium text-sky-700">
                    Saved method: {formatSavedMethod(savedMethod)}
                  </div>
                )}
                <p className="max-w-xl text-sm leading-6 text-gray-600">
                  {isFailedPayment
                    ? recurring
                      ? 'One or more session payments failed after tutor approval. Please update your payment method for this recurring series.'
                      : 'Payment could not be completed after tutor approval. Please update your payment method to try again.'
                    : savedMethod
                      ? recurring
                        ? `We will use ${formatSavedMethod(savedMethod)} for this series when the tutor accepts the sessions.`
                        : `We will charge your saved ${formatSavedMethod(savedMethod)} automatically if the tutor accepts this booking.`
                      : recurring
                        ? 'Save a payment method now so we can charge each session in this recurring series automatically after tutor acceptance.'
                        : 'Save a payment method now so we can charge it automatically if the tutor accepts this booking.'}
                </p>
                {recurring && paymentSetupSeriesBookings.length > 0 && (
                  <p className="text-sm font-semibold text-sky-800">
                    Series total: {formatCurrency(paymentSetupSeriesAmount, booking.currency || 'AUD')}
                  </p>
                )}
              </div>

              {isLearner && (
                <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                  <Link
                    href={`/bookings/${id}/payment?returnTo=${encodeURIComponent(bookingDetailHref)}`}
                    className="btn-primary inline-flex min-w-[220px] justify-center whitespace-nowrap rounded-xl px-5 py-3 shadow-sm"
                  >
                    <CheckCircleIcon className="w-4 h-4" />
                    {isFailedPayment || savedMethod
                      ? recurring
                        ? 'Update Series Payment'
                        : 'Update Payment Method'
                      : recurring
                        ? 'Set Up Series Payment'
                        : 'Set Up Payment Method'}
                  </Link>
                  <p className="text-xs text-gray-500 sm:text-right">
                    Stripe test mode is used here. No real payment will be charged.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isLearner && booking.status === 'ACCEPTED' && isProcessingPayment && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Payment is currently processing for this accepted booking.
        </div>
      )}

      {isLearner && booking.status === 'DECLINED' && isRefunded && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Refunded
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className='text-gray-700 text-sm mb-2 mt-2'>
          {recurring
            ? 'Tutor accept/decline actions apply to all pending sessions in this series. Learner cancellation applies to this session only.'
            : isAcceptedBooking && isPaidBooking
              ? 'Accepted bookings must be cancelled at least one day in advance.'
              : 'You can cancel this booking before the tutor confirms it.'}
        </div>
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
              {acceptMutation.isPending ? 'Accepting...' : recurring ? 'Accept Series' : 'Accept'}
            </button>
            <button
              type="button"
              onClick={() => declineMutation.mutate()}
              disabled={declineMutation.isPending}
              className="btn-danger gap-2"
            >
              <XCircleIcon className="w-4 h-4" />
              {declineMutation.isPending ? 'Declining...' : recurring ? 'Decline Series' : 'Decline'}
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
