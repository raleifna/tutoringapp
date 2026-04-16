'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import {
  CheckCircleIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
<<<<<<< HEAD
import { bookingApi, paymentApi } from '../../../../../lib/api-entry';
import { useAuthStore } from '../../../../../lib/store';
import BackButton from '../../../../../components/BackButton';

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

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

=======
import { bookingApi } from '../../../../../lib/api-entry';
import { formatCurrency, formatDateTimeWithYear as formatDate, formatDuration } from '../../../../../lib/formatters';
import { useAuthStore } from '../../../../../lib/store';
import BackButton from '../../../../../components/BackButton';

>>>>>>> origin
const getPaymentStatusClass = (status) => {
  if (status === 'PAID' || status === 'COMPLETED') {
    return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  }
  if (status === 'PROCESSING') {
    return 'bg-blue-50 text-blue-700 border border-blue-200';
  }
  if (status === 'FAILED') {
    return 'bg-red-50 text-red-700 border border-red-200';
  }
  if (status === 'REFUNDED') {
    return 'bg-gray-100 text-gray-700 border border-gray-200';
  }
  if (status === 'CANCELLED') {
    return 'bg-gray-100 text-gray-700 border border-gray-200';
  }
  return 'bg-amber-50 text-amber-700 border border-amber-200';
};

const formatPaymentStatus = (status) => {
  if (status === 'PAID' || status === 'COMPLETED') return 'Paid';
  if (status === 'PROCESSING') return 'Processing';
  if (status === 'FAILED') return 'Payment Failed';
  if (status === 'REFUNDED') return 'Refunded';
  if (status === 'CANCELLED') return 'Cancelled';
  return 'Pending';
};

const formatSavedMethod = (paymentMethod) => {
  if (!paymentMethod?.last4) return 'No payment method saved';

  const brand = String(paymentMethod.brand || 'card');
  const label = brand.charAt(0).toUpperCase() + brand.slice(1);

  return `${label} ending in ${paymentMethod.last4}`;
};

function SetupPaymentMethodForm({ bookingId, clientSecret, returnTo, saveForFuture, onSaved }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLabel = saveForFuture ? 'Save and Use Card' : 'Use This Card';

  const successHref = useMemo(() => {
    if (!returnTo) return `/bookings/${bookingId}?paymentMethod=saved`;

    const [pathname, queryString = ''] = returnTo.split('?');
    const params = new URLSearchParams(queryString);
    params.set('paymentMethod', 'saved');
    const query = params.toString();

    return query ? `${pathname}?${query}` : pathname;
  }, [bookingId, returnTo]);

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
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Payment method was confirmed, but we could not save it yet');
      setIsSubmitting(false);
      return;
    }

    toast.success(saveForFuture ? 'Payment method saved' : 'Card selected for this booking');
    onSaved?.();
    router.push(successHref);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <PaymentElement />
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
          {isSubmitting ? 'Confirming...' : submitLabel}
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
  const savedMethodQuery = useQuery({
    queryKey: ['savedPaymentMethod', currentUserId],
    queryFn: () => paymentApi.getSavedMethod(),
    enabled: !!currentUserId && user?.role === 'LEARNER',
  });
  const savedMethod = savedMethodQuery.data?.data?.data?.paymentMethod || null;
  const canUpdatePaymentMethod =
    user?.role === 'LEARNER' &&
    ['PENDING', 'ACCEPTED'].includes(booking?.status) &&
    ['PENDING', 'FAILED'].includes(paymentStatus);

  const useSavedMethodMutation = useMutation({
    mutationFn: () => paymentApi.useSavedMethodForBooking(id),
    onSuccess: async () => {
      toast.success('Saved payment method selected for this booking');
      await queryClient.invalidateQueries({ queryKey: ['booking', currentUserId, id] });
      await queryClient.invalidateQueries({ queryKey: ['bookings', currentUserId] });
      router.push(returnTo || `/bookings/${id}?paymentMethod=saved`);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Could not use saved payment method');
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

  const elementsOptions = setupIntentData?.clientSecret
    ? {
        clientSecret: setupIntentData.clientSecret,
        appearance: {
          theme: 'stripe',
        },
      }
    : null;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Payment Method</p>
          <h1 className="text-2xl font-bold text-gray-900">Set Up Payment</h1>
        </div>
        {showBackButton && <BackButton href={returnTo} />}
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
              <p className="text-xs text-blue-600 uppercase tracking-wide mb-1">Amount to Charge Later</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(totalAmount, booking.currency || 'AUD')}
              </p>
            </div>
            <CreditCardIcon className="w-8 h-8 text-blue-500" />
          </div>
          <p className="text-sm text-blue-700 mt-3">
            No money is charged when you save a payment method. We will only charge after the tutor accepts this booking.
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

        {!stripePromise && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
            Stripe publishable key is missing. Please check your environment variables.
          </div>
        )}

        {canUpdatePaymentMethod ? (
          savedMethod && setupMode === 'saved' ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm text-emerald-800 mb-3">
                This booking will use your saved {formatSavedMethod(savedMethod)} after the tutor accepts it.
              </p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => useSavedMethodMutation.mutate()}
                  disabled={useSavedMethodMutation.isPending}
                  className="btn-primary gap-2"
                >
                  <CheckCircleIcon className="w-4 h-4" />
                  {useSavedMethodMutation.isPending ? 'Confirming...' : 'Confirm Saved Method'}
                </button>
              </div>
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
                      If you leave this unticked, we will only use the new card for this booking.
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
            Payment has already been confirmed for this booking.
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
