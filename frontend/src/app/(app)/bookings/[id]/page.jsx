// src/app/(app)/bookings/[id]/page.jsx -  Booking Detail Page
'use client';

import { useEffect, useState } from 'react';
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
import { bookingApi, paymentApi, tutorApi } from '../../../../lib/api-entry';
import { getAvatarUrl } from '../../../../lib/avatar';
import { formatBookingStatus, getBookingStatusClass as getStatusClass } from '../../../../lib/booking-status';
import { formatCurrency, formatDateTimeWithYear as formatDate, formatDuration, getUserTimezone } from '../../../../lib/formatters';
import { formatSavedMethod } from '../../../../lib/payment-display';
import {
  getDisplayStatusLabel,
  getRecurringDisplayStatus,
  getPayableSeriesBookings,
  getRecurringLabel,
  getRecurringSeriesBookings,
  getRecurringStatusSummary,
  getSeriesTotalAmount,
  isRecurringBooking,
} from '../../../../lib/recurring-bookings';
import { useAuthStore } from '../../../../lib/store';
import BackButton from '../../../../components/BackButton';
import AvailabilityCalendar from '../../../../components/AvailabilityCalendar';

const rescheduleSchema = z.object({
  newDate: z.string().min(1, 'Please select a new date'),
  reason: z.string().optional(),
});

const getLatestStatusReason = (booking, status) =>
  booking?.statusHistory?.find((entry) => entry.status === status)?.reason || '';

const getCancellationState = (booking, { isLearner = false, isTutor = false } = {}) => {
  if (!booking) return { canCancel: false, blockedReason: '' };
  if (!['UNPAID', 'PENDING', 'ACCEPTED'].includes(booking?.status)) {
    return { canCancel: false, blockedReason: '' };
  }

  if (isTutor) {
    return { canCancel: true, blockedReason: '' };
  }

  if (!isLearner) {
    return { canCancel: false, blockedReason: '' };
  }

  const paymentStatus = booking?.payment?.status || 'PENDING';
  const isPaidBooking = ['PAID', 'COMPLETED'].includes(paymentStatus);
  const isAcceptedBooking = booking?.status === 'ACCEPTED';
  const timeDelta = new Date(booking?.scheduledAt) - new Date();

  if (isAcceptedBooking && isPaidBooking && timeDelta <= 1000 * 60 * 60 * 24) {
    return {
      canCancel: false,
      blockedReason: 'Accepted bookings cannot be cancelled within 24 hours of the session. Please contact the tutor for special arrangements.',
    };
  }

  return { canCancel: true, blockedReason: '' };
};

const invalidateBookingViews = async ({ queryClient, currentUserId, id, bookingTutorId }) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['booking', currentUserId, id] }),
    queryClient.invalidateQueries({ queryKey: ['bookings', currentUserId] }),
    queryClient.invalidateQueries({ queryKey: ['myBookings'] }),
    queryClient.invalidateQueries({ queryKey: ['myBookings', 'dashboard', currentUserId] }),
    queryClient.invalidateQueries({ queryKey: ['myBookings', 'calendar', currentUserId] }),
    queryClient.invalidateQueries({ queryKey: ['tutor-requests'] }),
    queryClient.invalidateQueries({ queryKey: ['tutor-bookings'] }),
    queryClient.invalidateQueries({ queryKey: ['tutor-bookings-all'] }),
    queryClient.invalidateQueries({ queryKey: ['notifications', currentUserId] }),
    queryClient.invalidateQueries({ queryKey: ['savedPaymentMethod', currentUserId] }),
    bookingTutorId
      ? queryClient.invalidateQueries({ queryKey: ['tutor-availability', bookingTutorId] })
      : Promise.resolve(),
  ]);
};
export default function BookingDetailPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user, fetchMe } = useAuthStore();
  const timeZone = getUserTimezone(user);
  const currentUserId = user?.id || '';
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedSeriesBookingIds, setSelectedSeriesBookingIds] = useState([]);
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState(null);

  const from = (searchParams.get('from') || '').toLowerCase();
  const returnTo = searchParams.get('returnTo') || '';
  const paymentResult = (searchParams.get('payment') || '').toLowerCase();
  const showBackButton = Boolean(returnTo || from);
  const paymentMethodResult = (searchParams.get('paymentMethod') || '').toLowerCase();
  const backConfigMap = {
    'tutor-requests': { href: '/tutor/requests', label: 'Back' },
    'tutor-dashboard': { href: '/tutor/dashboard', label: 'Back' },
    dashboard: { href: '/dashboard', label: 'Back' },
    notifications: { href: '/notifications', label: 'Back' },
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
  const rescheduleAvailabilityQuery = useQuery({
    queryKey: ['tutor-availability', bookingTutorId, 'reschedule'],
    queryFn: () => tutorApi.getAvailability(bookingTutorId),
    enabled: !!bookingTutorId && showRescheduleModal,
  });
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
  const paymentStatus = booking?.payment?.status || 'PENDING';
  const savedMethod = savedMethodQuery.data?.data?.data?.paymentMethod || null;
  const isPaidBooking = ['PAID', 'COMPLETED'].includes(paymentStatus);
  const isRefunded = paymentStatus === 'REFUNDED';
  const isProcessingPayment = paymentStatus === 'PROCESSING';
  const isFailedPayment = paymentStatus === 'FAILED';
  const isAcceptedBooking = booking?.status === 'ACCEPTED';
  const recurring = isRecurringBooking(booking);
  const cancellationState = getCancellationState(booking, { isLearner, isTutor });
  const canCancel =
    !recurring &&
    (
      isLearner
        ? cancellationState.canCancel
        : isTutor
          ? booking?.status === 'ACCEPTED'
          : false
    );
  const latestRescheduleReason = getLatestStatusReason(booking, 'RESCHEDULED');
  const rescheduleAvailabilityState = rescheduleAvailabilityQuery.data?.data?.data || {};
  const rescheduleAvailability = rescheduleAvailabilityState?.availability || [];
  const rescheduleCurrentWeekAvailability =
    rescheduleAvailabilityState?.currentWeekEffectiveAvailability || rescheduleAvailability;
  const rescheduleHasCurrentWeekAvailabilityOverride = Boolean(
    rescheduleAvailabilityState?.hasCurrentWeekAvailabilityOverride
  );
  const rescheduleBookedSlots = (rescheduleAvailabilityState?.bookedSlots || []).filter(
    (slot) => slot?.id !== booking?.id
  );

  const promptForReason = ({ title, required = false, defaultValue = '' }) => {
    const value = window.prompt(title, defaultValue);
    if (value === null) return null;
    const trimmed = value.trim();
    if (required && !trimmed) {
      toast.error('Please provide a short reason.');
      return null;
    }
    return trimmed;
  };

  const cancelMutation = useMutation({
    mutationFn: ({ targetId, reason }) => bookingApi.cancel(targetId, reason),
    onSuccess: async (response) => {
      const refunded = response?.data?.data?.payment?.status === 'REFUNDED';
      toast.success(refunded ? 'Booking cancelled and payment refunded' : 'Booking cancelled');
      await invalidateBookingViews({ queryClient, currentUserId, id, bookingTutorId });
      fetchMe();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to cancel booking');
    },
  });

  const cancelSeriesMutation = useMutation({
    mutationFn: async ({ targetIds, reason }) => {
      const results = await Promise.allSettled(
        targetIds.map((targetId) => bookingApi.cancel(targetId, reason))
      );
      const successCount = results.filter((result) => result.status === 'fulfilled').length;
      const failedCount = results.length - successCount;
      return { successCount, failedCount };
    },
    onSuccess: async ({ successCount, failedCount }) => {
      if (successCount > 0 && failedCount > 0) {
        toast.success(`${successCount} sessions cancelled. ${failedCount} could not be cancelled.`);
      } else if (successCount > 0) {
        toast.success(`${successCount} sessions cancelled.`);
      } else {
        toast.error('No sessions could be cancelled.');
      }

      await invalidateBookingViews({ queryClient, currentUserId, id, bookingTutorId });
    },
    onError: () => {
      toast.error('Failed to cancel recurring booking');
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (targetId) => bookingApi.accept(targetId),
    onSuccess: async (response) => {
      toast.success(response?.data?.message || 'Session accepted!');
      await invalidateBookingViews({ queryClient, currentUserId, id, bookingTutorId });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to accept');
    },
  });

  const declineMutation = useMutation({
    mutationFn: ({ targetId, reason }) => bookingApi.decline(targetId, reason),
    onSuccess: async (response) => {
      toast.success(response?.data?.message || 'Session declined');
      await invalidateBookingViews({ queryClient, currentUserId, id, bookingTutorId });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to decline');
    },
  });

  const bulkSeriesDecisionMutation = useMutation({
    mutationFn: async ({ acceptedIds, declinedIds, declineReason }) => {
      const acceptedResults = await Promise.allSettled(
        acceptedIds.map((targetId) => bookingApi.accept(targetId))
      );
      const declinedResults = await Promise.allSettled(
        declinedIds.map((targetId) => bookingApi.decline(targetId, declineReason))
      );

      return {
        acceptedSuccessCount: acceptedResults.filter((result) => result.status === 'fulfilled').length,
        acceptedFailureCount: acceptedResults.filter((result) => result.status === 'rejected').length,
        declinedSuccessCount: declinedResults.filter((result) => result.status === 'fulfilled').length,
        declinedFailureCount: declinedResults.filter((result) => result.status === 'rejected').length,
      };
    },
    onSuccess: async ({ acceptedSuccessCount, acceptedFailureCount, declinedSuccessCount, declinedFailureCount }) => {
      const handledCount = acceptedSuccessCount + declinedSuccessCount;
      const failedCount = acceptedFailureCount + declinedFailureCount;

      if (handledCount > 0 && failedCount > 0) {
        toast.success(
          `${acceptedSuccessCount} accepted, ${declinedSuccessCount} declined. ${failedCount} could not be updated.`
        );
      } else if (handledCount > 0) {
        toast.success(`${acceptedSuccessCount} accepted, ${declinedSuccessCount} declined.`);
      } else {
        toast.error('No sessions were updated.');
      }

      setSelectedSeriesBookingIds([]);
      await invalidateBookingViews({ queryClient, currentUserId, id, bookingTutorId });
    },
    onError: () => {
      toast.error('Failed to update selected sessions');
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => bookingApi.complete(id),
    onSuccess: async () => {
      toast.success('Session marked as complete');
      await invalidateBookingViews({ queryClient, currentUserId, id, bookingTutorId });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to complete');
    },
  });

  const {
    register: registerReschedule,
    handleSubmit: handleRescheduleSubmit,
    setValue: setRescheduleValue,
    reset: resetRescheduleForm,
    formState: { errors: rescheduleErrors },
  } = useForm({
    resolver: zodResolver(rescheduleSchema),
  });

  const totalAmount =
    booking?.totalAmount ??
    ((Number(booking?.hourlyRate || 0) * Number(booking?.duration || 0)) / 60 || 0);
  const recurringLabel = getRecurringLabel(booking);
  const recurringBookings = getRecurringSeriesBookings(booking);
  const recurringStatus = getRecurringStatusSummary(booking);
  const displayStatus = recurring ? getRecurringDisplayStatus(booking) : booking?.status;
  const pendingRecurringBookings = recurringBookings.filter((seriesBooking) => seriesBooking.status === 'PENDING');
  const pendingRecurringBookingIds = pendingRecurringBookings.map((seriesBooking) => seriesBooking.id);
  const pendingRecurringBookingIdsKey = pendingRecurringBookingIds.join('|');
  const allPendingRecurringSelected =
    pendingRecurringBookingIds.length > 0 &&
    pendingRecurringBookingIds.every((seriesBookingId) => selectedSeriesBookingIds.includes(seriesBookingId));
  const cancellableRecurringBookings = recurringBookings.filter(
    (seriesBooking) =>
      getCancellationState(seriesBooking, { isLearner, isTutor }).canCancel
  );
  const paymentSetupSeriesBookings = getPayableSeriesBookings(booking);
  const paymentSetupSeriesAmount = getSeriesTotalAmount(paymentSetupSeriesBookings);
  const fullSeriesAmount = getSeriesTotalAmount(recurringBookings);
  const recurringDisplayAmount = paymentSetupSeriesAmount || fullSeriesAmount || totalAmount;
  const canSetupPaymentMethod =
    isLearner &&
    (
      recurring
        ? paymentSetupSeriesBookings.length > 0
        : ['PENDING', 'ACCEPTED'].includes(booking?.status) && ['PENDING', 'FAILED'].includes(paymentStatus)
    );

  useEffect(() => {
    setSelectedSeriesBookingIds((currentSelection) => {
      const nextSelection = currentSelection.filter((seriesBookingId) => pendingRecurringBookingIds.includes(seriesBookingId));
      return nextSelection.length === currentSelection.length &&
        nextSelection.every((seriesBookingId, index) => seriesBookingId === currentSelection[index])
        ? currentSelection
        : nextSelection;
    });
  }, [booking?.id, pendingRecurringBookingIdsKey]);

  useEffect(() => {
    if (!showRescheduleModal) {
      setSelectedRescheduleSlot(null);
      resetRescheduleForm({ newDate: '', reason: '' });
    }
  }, [showRescheduleModal, resetRescheduleForm]);

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

  return (
    <div className="relative w-full space-y-5">
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

      <div className={`rounded-lg px-4 py-3 flex items-center gap-2 text-sm font-medium ${getStatusClass(displayStatus)}`}>
        {(displayStatus === 'UNPAID' || displayStatus === 'PENDING') && <ExclamationTriangleIcon className="w-5 h-5" />}
        {(displayStatus === 'ACCEPTED' || displayStatus === 'COMPLETED') && <CheckCircleIcon className="w-5 h-5" />}
        {(displayStatus === 'CANCELLED' || displayStatus === 'DECLINED') && <XCircleIcon className="w-5 h-5" />}
        Booking Status: <strong className="flex-1">{getDisplayStatusLabel(booking)}</strong>
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
              {formatDate(booking.scheduledAt, timeZone)}
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
              {formatCurrency(recurring ? recurringDisplayAmount : totalAmount, booking.currency || 'AUD')}
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
                    Tutors can review each session in this series separately.
                    Learner cancellation still applies to this session only.
                  </p>
                  <p className="mt-2 text-sm font-medium text-sky-800">
                    {recurringStatus.acceptedCount} accepted · {recurringStatus.pendingCount} pending · {recurringStatus.declinedCount} declined · {recurringStatus.cancelledCount} cancelled
                  </p>
                </div>
                {isTutor && pendingRecurringBookingIds.length > 0 && (
                  <div className="min-w-[280px] flex-1">
                    <p className="text-xs text-sky-700">
                      Tick the sessions you want to accept. Any pending session left unticked will be declined.
                    </p>
                    <div className="ml-auto mt-2 flex w-fit items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSeriesBookingIds(
                            allPendingRecurringSelected ? [] : pendingRecurringBookingIds
                          );
                        }}
                        disabled={bulkSeriesDecisionMutation.isPending}
                        className="text-sm font-medium text-primary-600 transition-colors hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {allPendingRecurringSelected ? 'Clear selection' : 'Select all'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const declinedIds = pendingRecurringBookingIds.filter(
                            (seriesBookingId) => !selectedSeriesBookingIds.includes(seriesBookingId)
                          );
                          const declineReason =
                            declinedIds.length > 0
                              ? promptForReason({
                                  title:
                                    'Reason for the sessions you are declining:',
                                  required: true,
                                })
                              : '';
                          if (declinedIds.length > 0 && declineReason === null) {
                            return;
                          }
                          if (
                            !window.confirm(
                              `Accept ${selectedSeriesBookingIds.length} selected session(s) and decline ${declinedIds.length} unselected session(s)?`
                            )
                          ) {
                            return;
                          }

                          bulkSeriesDecisionMutation.mutate({
                            acceptedIds: selectedSeriesBookingIds,
                            declinedIds,
                            declineReason,
                          });
                        }}
                        disabled={bulkSeriesDecisionMutation.isPending}
                        className="btn-primary btn-sm gap-1.5"
                      >
                        <CheckCircleIcon className="w-4 h-4" />
                        {bulkSeriesDecisionMutation.isPending
                          ? 'Updating...'
                          : `Accept selected (${selectedSeriesBookingIds.length})`}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {recurringBookings.length > 0 && (
                <div className="mt-4 space-y-2">
                  {recurringBookings.map((seriesBooking) => {
                    const isCurrent = seriesBooking.id === booking.id;
                    const isPendingSeriesBooking = seriesBooking.status === 'PENDING';
                    const canCancelSeriesBooking = isLearner
                      ? getCancellationState(seriesBooking, { isLearner, isTutor }).canCancel
                      : isTutor
                        ? seriesBooking.status === 'ACCEPTED'
                        : false;
                    const isCancellingThis =
                      cancelMutation.isPending &&
                      cancelMutation.variables?.targetId === seriesBooking.id;
                    return (
                      <div
                        key={seriesBooking.id}
                        className={`block rounded-xl border px-3 py-2 text-sm transition-colors ${
                          isCurrent
                            ? 'border-sky-200 bg-white'
                            : 'border-white/70 bg-white/70 hover:border-sky-200 hover:bg-white'
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex min-w-0 flex-1 items-start gap-3 rounded-lg">
                            {isTutor && isPendingSeriesBooking && (
                              <label className="mt-0.5 inline-flex items-center">
                                <input
                                  type="checkbox"
                                  checked={selectedSeriesBookingIds.includes(seriesBooking.id)}
                                  onChange={(event) => {
                                    setSelectedSeriesBookingIds((currentSelection) =>
                                      event.target.checked
                                        ? [...currentSelection, seriesBooking.id]
                                        : currentSelection.filter((seriesBookingId) => seriesBookingId !== seriesBooking.id)
                                    );
                                  }}
                                  disabled={bulkSeriesDecisionMutation.isPending}
                                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                />
                              </label>
                            )}

                            <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-medium text-gray-900">
                                {formatDate(seriesBooking.scheduledAt, timeZone)}
                                {isCurrent ? ' · current' : ''}
                              </span>
                              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${getStatusClass(seriesBooking.status)}`}>
                                {formatBookingStatus(seriesBooking.status)}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                              <span>{formatDuration(seriesBooking.duration)}</span>
                              <span>
                                {paymentSetupSeriesBookings.some((item) => item.id === seriesBooking.id)
                                  ? 'Included in series total'
                                  : 'Already paid'}
                              </span>
                              <span>
                                Payment: {seriesBooking.payment?.status || 'PENDING'}
                              </span>
                            </div>
                            {seriesBooking.declineReason && (
                              <p className="mt-2 text-xs text-red-600">
                                Decline reason: {seriesBooking.declineReason}
                              </p>
                            )}
                            {seriesBooking.cancellationReason && (
                              <p className="mt-2 text-xs text-gray-600">
                                Cancellation reason: {seriesBooking.cancellationReason}
                              </p>
                            )}
                            {seriesBooking.latestRescheduleReason && (
                              <p className="mt-2 text-xs text-purple-700">
                                Reschedule note: {seriesBooking.latestRescheduleReason}
                              </p>
                            )}
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-wrap gap-2">
                            {(isLearner || isTutor) && canCancelSeriesBooking && (
                              <button
                                type="button"
                                onClick={() => {
                                  const reason = promptForReason({
                                    title: isTutor
                                      ? 'Reason for cancelling this session (optional):'
                                      : 'Reason for cancelling this session (optional):',
                                  });
                                  if (reason === null) return;
                                  if (window.confirm('Cancel this session?')) {
                                    cancelMutation.mutate({ targetId: seriesBooking.id, reason });
                                  }
                                }}
                                disabled={isCancellingThis || cancelSeriesMutation.isPending || bulkSeriesDecisionMutation.isPending}
                                className="btn-danger btn-sm gap-1.5"
                              >
                                <XCircleIcon className="w-4 h-4" />
                                {isCancellingThis ? 'Cancelling...' : 'Cancel'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
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
                    {formatCurrency(recurring ? recurringDisplayAmount : totalAmount, booking.currency || 'AUD')}
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
                      ? 'One or more session payments in this recurring booking failed. Please update your payment method and try again.'
                      : 'Payment could not be completed. Please update your payment method to try again.'
                    : savedMethod
                      ? recurring
                        ? `Your saved ${formatSavedMethod(savedMethod)} will be charged after tutor approval.`
                        : `Your saved ${formatSavedMethod(savedMethod)} will be charged after tutor approval.`
                      : recurring
                        ? 'Save a payment method so TutorConnect can charge the remaining sessions after tutor approval.'
                        : 'Save a payment method so TutorConnect can charge this booking after tutor approval.'}
                </p>
                {recurring && paymentSetupSeriesBookings.length > 0 && (
                  <p className="text-sm font-semibold text-sky-800">
                    Series total: {formatCurrency(recurringDisplayAmount, booking.currency || 'AUD')}
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
                        ? 'Update Payment Method'
                        : 'Update Payment Method'
                      : recurring
                        ? 'Set Up Series Payment'
                        : 'Set Up Payment Method'}
                  </Link>
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

      {isLearner && !canCancel && cancellationState.blockedReason && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          {cancellationState.blockedReason}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className='text-gray-700 text-sm mb-2 mt-2'>
          {recurring
            ? 'Recurring bookings stay grouped as one order. Tutors and learners can handle each session directly in the list below.'
            : cancellationState.blockedReason
              ? cancellationState.blockedReason
              : isAcceptedBooking && isPaidBooking
                ? 'Accepted bookings must be cancelled at least 24 hours in advance.'
                : isTutor
                  ? booking.status === 'PENDING'
                    ? 'Tutors can accept or decline pending requests here.'
                    : 'Accepted bookings can be rescheduled or cancelled by the tutor when needed.'
                  : 'You can cancel this booking before the tutor confirms it.'}
        </div>
        {isLearner && canCancel && (
          <>
          
            <button
              type="button"
              onClick={() => {
                const reason = promptForReason({
                  title: 'Reason for cancelling this booking (optional):',
                });
                if (reason === null) return;
                if (window.confirm('Cancel this booking?')) {
                  cancelMutation.mutate({ targetId: id, reason });
                }
              }}
              disabled={cancelMutation.isPending}
              className="btn-danger gap-2"
            >
              <XCircleIcon className="w-4 h-4" />
              {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Booking'}
            </button>          
          </>
        )}

        {recurring && isLearner && cancellableRecurringBookings.length > 0 && (
          <button
            type="button"
            onClick={() => {
              const reason = promptForReason({
                title: 'Reason for cancelling these sessions (optional):',
              });
              if (reason === null) return;
              if (window.confirm(`Cancel ${cancellableRecurringBookings.length} session(s) in this recurring booking?`)) {
                cancelSeriesMutation.mutate({
                  targetIds: cancellableRecurringBookings.map((seriesBooking) => seriesBooking.id),
                  reason,
                });
              }
            }}
            disabled={cancelSeriesMutation.isPending}
            className="btn-danger gap-2"
          >
            <XCircleIcon className="w-4 h-4" />
            {cancelSeriesMutation.isPending ? 'Cancelling All...' : 'Cancel All'}
          </button>
        )}

        {isTutor && !recurring && booking.status === 'PENDING' && (
          <>
            <button
              type="button"
              onClick={() => acceptMutation.mutate(id)}
              disabled={acceptMutation.isPending}
              className="btn-primary gap-2"
            >
              <CheckCircleIcon className="w-4 h-4" />
              {acceptMutation.isPending ? 'Accepting...' : 'Accept'}
            </button>
            <button
              type="button"
              onClick={() => {
                const reason = promptForReason({
                  title: 'Please enter a short decline reason:',
                  required: true,
                });
                if (reason === null) return;
                declineMutation.mutate({ targetId: id, reason });
              }}
              disabled={declineMutation.isPending}
              className="btn-danger gap-2"
            >
              <XCircleIcon className="w-4 h-4" />
              {declineMutation.isPending ? 'Declining...' : 'Decline'}
            </button>
          </>
        )}

        {isTutor && booking.status === 'ACCEPTED' && (
          <>
            <button
              type="button"
              onClick={() => setShowRescheduleModal(true)}
              className="btn-secondary gap-2"
            >
              <CalendarDaysIcon className="w-4 h-4" />
              Reschedule
            </button>
            <button
              type="button"
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
              className="btn-primary gap-2"
            >
              <CheckCircleIcon className="w-4 h-4" />
              {completeMutation.isPending ? 'Saving...' : 'Mark Complete'}
            </button>
            <button
              type="button"
              onClick={() => {
                const reason = promptForReason({
                  title: 'Reason for cancelling this booking (optional):',
                });
                if (reason === null) return;
                if (window.confirm('Cancel this booking?')) {
                  cancelMutation.mutate({ targetId: id, reason });
                }
              }}
              disabled={cancelMutation.isPending}
              className="btn-danger gap-2"
            >
              <XCircleIcon className="w-4 h-4" />
              {cancelMutation.isPending ? 'Cancelling...' : 'Cancel'}
            </button>
          </>
        )}
      </div>

      {(booking.declineReason || booking.cancellationReason || latestRescheduleReason) && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-3">
          {booking.declineReason && (
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Decline Reason</p>
              <p className="text-sm text-gray-700">{booking.declineReason}</p>
            </div>
          )}
          {booking.cancellationReason && (
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Cancellation Reason</p>
              <p className="text-sm text-gray-700">{booking.cancellationReason}</p>
            </div>
          )}
          {latestRescheduleReason && (
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Reschedule Note</p>
              <p className="text-sm text-gray-700">{latestRescheduleReason}</p>
            </div>
          )}
        </div>
      )}

      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
          <div className="mx-auto flex min-h-full w-full max-w-4xl items-start justify-center py-6">
            <div className="w-full max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-xl">
              <form
                onSubmit={handleRescheduleSubmit((formData) => {
                  bookingApi
                    .reschedule(id, {
                      scheduledAt: new Date(formData.newDate).toISOString(),
                      reason: formData.reason,
                    })
                    .then(async () => {
                      toast.success('Reschedule proposed');
                      setShowRescheduleModal(false);
                      await invalidateBookingViews({ queryClient, currentUserId, id, bookingTutorId });
                    })
                    .catch((err) => {
                      toast.error(err?.response?.data?.message || 'Failed');
                    });
                })}
                className="flex max-h-[90vh] flex-col"
              >
                <div className="overflow-y-auto p-6">
                  <h2 className="mb-5 text-lg font-bold text-gray-900">Propose Reschedule</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="label">New Date & Time</label>
                      <p className="mb-2 text-sm text-gray-500">
                        Select a new time slot from the tutor&apos;s availability.
                      </p>
                      <input type="hidden" {...registerReschedule('newDate')} />
                      {rescheduleAvailabilityQuery.isLoading ? (
                        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                          Loading availability...
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-gray-100 p-1">
                          <AvailabilityCalendar
                            slots={rescheduleAvailability}
                            currentWeekSlots={rescheduleCurrentWeekAvailability}
                            hasCurrentWeekOverride={rescheduleHasCurrentWeekAvailabilityOverride}
                            bookedSlots={rescheduleBookedSlots}
                            mode="select"
                            selectedKey={selectedRescheduleSlot?.key || ''}
                            onSelect={(slot) => {
                              setSelectedRescheduleSlot(slot);
                              setRescheduleValue('newDate', slot.date.toISOString(), { shouldValidate: true });
                            }}
                          />
                        </div>
                      )}
                      {selectedRescheduleSlot && (
                        <div className="mt-3">
                          <span className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs text-primary-700">
                            {selectedRescheduleSlot.date.toLocaleString('en-AU')}
                          </span>
                        </div>
                      )}
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
                  </div>
                </div>
                <div className="border-t border-gray-100 bg-white p-6 pt-4">
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
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
