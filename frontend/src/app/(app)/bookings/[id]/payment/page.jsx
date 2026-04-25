'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AddressElement, Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import {
  CheckCircleIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { bookingApi, paymentApi } from '../../../../../lib/api-entry';
import { formatCurrency, formatDateTimeWithYear as formatDate, formatDuration, getUserTimezone } from '../../../../../lib/formatters';
import { formatPaymentStatus, formatSavedMethod, getPaymentStatusClass } from '../../../../../lib/payment-display';
import {
  getPayableSeriesBookings,
  getRecurringLabel,
  getRecurringSeriesBookings,
  getSeriesTotalAmount,
  isRecurringBooking,
} from '../../../../../lib/recurring-bookings';
import { useAuthStore } from '../../../../../lib/store';
import BackButton from '../../../../../components/BackButton';

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, {
      locale: 'en',
      developerTools: {
        assistant: {
          enabled: false,
        },
      },
    })
  : null;
const addressElementOptions = {
  mode: 'billing',
};
const stripeEnabled = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

const paymentElementOptions = {
  business: {
    name: 'TutorConnect',
  },
  wallets: {
    link: 'never',
  },
  fields: {
    billingDetails: {
      address: 'never',
    },
  },
};

function SetupPaymentMethodForm({ bookingId, clientSecret, returnTo, saveForFuture, shouldRetryPayment, onSaved }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLabel = shouldRetryPayment
    ? 'Save Card and Retry Payment'
    : saveForFuture
      ? 'Save Card for This Booking'
      : 'Use This Card';

  const successHref = useMemo(() => {
    const successKey = shouldRetryPayment ? 'payment' : 'paymentMethod';
    const successValue = shouldRetryPayment ? 'success' : 'ready';

    if (!returnTo) return `/bookings/${bookingId}?${successKey}=${successValue}`;

    const [pathname, queryString = ''] = returnTo.split('?');
    const params = new URLSearchParams(queryString);
    params.set(successKey, successValue);
    const query = params.toString();

    return query ? `${pathname}?${query}` : pathname;
  }, [bookingId, returnTo, shouldRetryPayment]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsSubmitting(true);

    const submitResult = await elements.submit();

    if (submitResult.error) {
      toast.error(submitResult.error.message || 'Please check your payment details');
      setIsSubmitting(false);
      return;
    }

    const result = await stripe.confirmSetup({
      elements,
      clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}${successHref}`,
      },
      redirect: 'if_required',
    });

    if (result.error) {
      toast.error(result.error.message || 'Failed to save payment method');
      setIsSubmitting(false);
      return;
    }

    const confirmedSetupIntentId = result.setupIntent?.id || clientSecret.split('_secret')[0];

    try {
      await paymentApi.completeSetupIntent({
        setupIntentId: confirmedSetupIntentId,
        bookingId,
        saveAsDefault: saveForFuture,
      });
      if (shouldRetryPayment) {
        await bookingApi.pay(bookingId);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Payment method could not be saved');
      setIsSubmitting(false);
      return;
    }

    toast.success(shouldRetryPayment ? 'Payment retried successfully' : 'Payment method saved');
    onSaved?.();
    router.push(successHref);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="space-y-4">
          <AddressElement options={addressElementOptions} />
          <PaymentElement options={paymentElementOptions} />
        </div>
      </div>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href={returnTo || `/bookings/${bookingId}`} className="btn-secondary text-center">
          Cancel
        </Link>
        <button
          type="submit"
          disabled={!stripe || !elements || isSubmitting}
          className="btn-primary gap-2"
        >
          <CheckCircleIcon className="w-4 h-4" />
          {isSubmitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

export default function BookingPaymentPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const timeZone = getUserTimezone(user);
  const currentUserId = user?.id || '';
  const returnTo = searchParams.get('returnTo') || '';
  const showBackButton = Boolean(returnTo);
  const [setupIntentData, setSetupIntentData] = useState(null);
  const [setupMode, setSetupMode] = useState('saved');
  const [saveForFuture, setSaveForFuture] = useState(false);

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
  const recurring = isRecurringBooking(booking);
  const recurringLabel = getRecurringLabel(booking);
  const recurringBookings = getRecurringSeriesBookings(booking);
  const paymentSetupSeriesBookings = getPayableSeriesBookings(booking);
  const savedMethodQuery = useQuery({
    queryKey: ['savedPaymentMethod', currentUserId],
    queryFn: () => paymentApi.getSavedMethod(),
    enabled: !!currentUserId && user?.role === 'LEARNER',
  });
  const savedMethod = savedMethodQuery.data?.data?.data?.paymentMethod || null;
  const shouldRetryPayment =
    booking?.status === 'ACCEPTED' && ['PENDING', 'FAILED'].includes(paymentStatus);
  const canUpdatePaymentMethod =
    user?.role === 'LEARNER' &&
    (
      recurring
        ? paymentSetupSeriesBookings.length > 0
        : ['PENDING', 'ACCEPTED'].includes(booking?.status) && ['PENDING', 'FAILED'].includes(paymentStatus)
    );

  const useSavedMethodMutation = useMutation({
    mutationFn: async () => {
      await paymentApi.useSavedMethodForBooking(id);
      if (shouldRetryPayment) {
        return bookingApi.pay(id);
      }
      return null;
    },
    onSuccess: async () => {
      toast.success(shouldRetryPayment ? 'Payment retried successfully' : 'Payment method confirmed');
      await queryClient.invalidateQueries({ queryKey: ['booking', currentUserId, id] });
      await queryClient.invalidateQueries({ queryKey: ['bookings', currentUserId] });
      await queryClient.invalidateQueries({ queryKey: ['myBookings'] });
      router.push(returnTo || `/bookings/${id}?${shouldRetryPayment ? 'payment=success' : 'paymentMethod=ready'}`);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Could not confirm payment method');
    },
  });

  const setupIntentMutation = useMutation({
    mutationFn: () => paymentApi.createSetupIntent(),
    onSuccess: (response) => {
      setSetupIntentData(response?.data?.data || null);
      queryClient.invalidateQueries({ queryKey: ['booking', currentUserId, id] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to start Stripe setup');
    },
  });

  useEffect(() => {
    if (!stripeEnabled) return;
    if (!canUpdatePaymentMethod || setupMode !== 'new') return;
    if (setupIntentData?.clientSecret) return;
    if (setupIntentMutation.isPending) return;
    setupIntentMutation.mutate();
  }, [
    canUpdatePaymentMethod,
    setupMode,
    setupIntentData,
    setupIntentMutation.isPending,
    setupIntentMutation.mutate,
  ]);

  useEffect(() => {
    if (savedMethod) {
      setSetupMode('saved');
      setSaveForFuture(false);
    } else {
      setSetupMode('new');
      setSaveForFuture(true);
    }
  }, [savedMethod?.id]);

  if (!currentUserId) {
    return (
      <div className="max-w-2xl mx-auto text-center py-14">
        <p className="text-gray-700 font-medium mb-1">Login required</p>
        <p className="text-gray-500 text-sm mb-4">Please log in first to manage your payment method.</p>
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
        <p className="text-red-700 font-medium mb-1">Unable to load payment setup</p>
        <p className="text-red-600 mb-3">{error?.response?.data?.message || 'Failed to load booking detail.'}</p>
        <div className="flex items-center justify-center gap-3">
          <button type="button" onClick={() => refetch()} className="btn-primary btn-sm">
            Retry
          </button>
          {showBackButton && <BackButton href={returnTo} />}
        </div>
      </div>
    );
  }

  const totalAmount =
    booking?.totalAmount ??
    ((Number(booking?.hourlyRate || 0) * Number(booking?.duration || 0)) / 60 || 0);
  const seriesTotalAmount = getSeriesTotalAmount(paymentSetupSeriesBookings);
  const fullSeriesAmount = getSeriesTotalAmount(recurringBookings);
  const amountToChargeLater = recurring ? seriesTotalAmount || fullSeriesAmount || totalAmount : totalAmount;

  const elementsOptions = setupIntentData?.clientSecret
    ? {
        clientSecret: setupIntentData.clientSecret,
        locale: 'en',
        appearance: {
          theme: 'stripe',
        },
      }
    : null;

  return (
    <div className="w-full space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Payment</p>
          <h1 className="text-2xl font-bold text-gray-900">
            {recurring ? 'Set Up Series Payment' : 'Set Up Payment Method'}
          </h1>
        </div>
        {showBackButton && <BackButton href={returnTo} />}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">Booking ID</p>
            <p className="font-medium text-gray-900">{booking.id}</p>
            {recurring && (
              <p className="mt-1 text-xs font-medium text-sky-700">{recurringLabel}</p>
            )}
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
            <p className="font-medium text-gray-900">{formatDate(booking.scheduledAt, timeZone)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Duration</p>
            <p className="font-medium text-gray-900">{formatDuration(booking.duration)}</p>
          </div>
        </div>

        {recurring && recurringBookings.length > 0 && (
          <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs text-sky-700 uppercase tracking-wide font-semibold">
                  Sessions in this series
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  TutorConnect will charge the included sessions after tutor approval.
                </p>
              </div>
              <div className="text-right">
                <p className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-sky-700">
                  {recurringBookings.length} sessions
                </p>
                <p className="mt-2 text-lg font-bold text-sky-900">
                  {formatCurrency(amountToChargeLater, booking.currency || 'AUD')}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {recurringBookings.map((seriesBooking) => {
                const needsSetup = paymentSetupSeriesBookings.some((item) => item.id === seriesBooking.id);
                return (
                  <div
                    key={seriesBooking.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/80 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{formatDate(seriesBooking.scheduledAt, timeZone)}</p>
                      <p className="text-xs text-gray-500">{formatDuration(seriesBooking.duration)}</p>
                    </div>
                    <p className={`text-xs font-medium ${needsSetup ? 'text-sky-700' : 'text-emerald-700'}`}>
                      {needsSetup ? 'Included in total' : 'Already paid'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-blue-600 uppercase tracking-wide mb-1">Amount to Charge After Approval</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(amountToChargeLater, booking.currency || 'AUD')}
              </p>
              {recurring && (
                <p className="mt-1 text-sm text-blue-700">
                  {paymentSetupSeriesBookings.length} session{paymentSetupSeriesBookings.length === 1 ? '' : 's'} included
                </p>
              )}
            </div>
            <CreditCardIcon className="w-8 h-8 text-blue-500" />
          </div>
          <p className="text-sm text-blue-700 mt-3">
            No payment is charged on this page. TutorConnect will charge the selected payment method only after the tutor accepts this booking.
          </p>
        </div>

        {savedMethod && canUpdatePaymentMethod && (
          <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Saved Method</p>
                <p className="font-semibold text-gray-900">{formatSavedMethod(savedMethod)}</p>
                {savedMethod?.expMonth && savedMethod?.expYear ? (
                  <p className="text-xs text-gray-500 mt-1">
                    Expires {String(savedMethod.expMonth).padStart(2, '0')}/{savedMethod.expYear}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSetupMode('saved')}
                  className={`btn-secondary ${setupMode === 'saved' ? 'ring-2 ring-primary-200 border-primary-300 text-primary-700' : ''}`}
                >
                  Use Saved Method
                </button>
                <button
                  type="button"
                  onClick={() => setSetupMode('new')}
                  className={`btn-secondary ${setupMode === 'new' ? 'ring-2 ring-primary-200 border-primary-300 text-primary-700' : ''}`}
                >
                  Add New Method
                </button>
              </div>
            </div>
          </div>
        )}

        {canUpdatePaymentMethod ? (
          savedMethod && setupMode === 'saved' ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm text-emerald-800 mb-3">
                {recurring
                  ? shouldRetryPayment
                    ? `We will retry payment for this recurring booking with your saved ${formatSavedMethod(savedMethod)}.`
                    : `We will use your saved ${formatSavedMethod(savedMethod)} when the tutor accepts this recurring booking.`
                  : shouldRetryPayment
                    ? `We will retry payment for this booking with your saved ${formatSavedMethod(savedMethod)}.`
                    : `We will use your saved ${formatSavedMethod(savedMethod)} when the tutor accepts this booking.`}
              </p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => useSavedMethodMutation.mutate()}
                  disabled={useSavedMethodMutation.isPending}
                  className="btn-primary gap-2"
                >
                  <CheckCircleIcon className="w-4 h-4" />
                  {useSavedMethodMutation.isPending
                    ? 'Confirming...'
                    : shouldRetryPayment
                      ? 'Confirm and Retry Payment'
                      : 'Confirm Payment Method'}
                </button>
              </div>
            </div>
          ) : !stripeEnabled ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm">
              Payment setup is currently unavailable. Please try again later.
            </div>
          ) : setupIntentMutation.isPending && !setupIntentData?.clientSecret ? (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              Preparing Stripe payment form...
            </div>
          ) : setupIntentData?.clientSecret && stripePromise && elementsOptions ? (
            <div className="space-y-4">
              {savedMethod && (
                <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={saveForFuture}
                    onChange={(event) => setSaveForFuture(event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span>
                    <span className="font-medium text-gray-900">Save this card for future use?</span>
                    <span className="block text-xs text-gray-500 mt-1">
                      If you leave this unticked, we will only use the new card for this payment flow.
                    </span>
                  </span>
                </label>
              )}
              <Elements stripe={stripePromise} options={elementsOptions}>
                <SetupPaymentMethodForm
                  bookingId={booking.id}
                  clientSecret={setupIntentData.clientSecret}
                  returnTo={returnTo}
                  saveForFuture={saveForFuture}
                  shouldRetryPayment={shouldRetryPayment}
                  onSaved={() => {
                    queryClient.invalidateQueries({ queryKey: ['booking', currentUserId, id] });
                    queryClient.invalidateQueries({ queryKey: ['bookings', currentUserId] });
                    queryClient.invalidateQueries({ queryKey: ['myBookings'] });
                    queryClient.invalidateQueries({ queryKey: ['savedPaymentMethod', currentUserId] });
                  }}
                />
              </Elements>
            </div>
          ) : (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
              We could not prepare Stripe setup. Please try again.
            </div>
          )
        ) : paymentStatus === 'PROCESSING' ? (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-800">
            Payment is currently processing for this booking.
          </div>
        ) : paymentStatus === 'PAID' || paymentStatus === 'COMPLETED' ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
            {recurring
              ? 'Payment has already been confirmed for this booking in the recurring series.'
              : 'Payment has already been confirmed for this booking.'}
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            Payment setup is not available for this booking at the moment.
          </div>
        )}
      </div>
    </div>
  );
}
