'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AddressElement, Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { CheckCircleIcon, CreditCardIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import BackButton from '../../../../components/BackButton';
import { paymentApi } from '../../../../lib/api-entry';
import { formatSavedMethod } from '../../../../lib/payment-display';
import { useAuthStore } from '../../../../lib/store';

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

const addressElementOptions = {
  mode: 'billing',
  defaultValues: {
    address: {
      country: 'AU',
    },
  },
};

const paymentElementOptions = {
  business: {
    name: 'TutorConnect',
  },
  fields: {
    billingDetails: {
      address: 'never',
    },
  },
};

function PaymentMethodForm({ clientSecret, onSaved, returnTo }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) return;

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
        return_url: `${window.location.origin}${returnTo}`,
      },
      redirect: 'if_required',
    });

    if (result.error) {
      toast.error(result.error.message || 'Failed to save payment method');
      setIsSubmitting(false);
      return;
    }

    const setupIntentId = result.setupIntent?.id || clientSecret.split('_secret')[0];

    try {
      await paymentApi.completeSetupIntent(setupIntentId);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Payment method was confirmed, but could not be saved');
      setIsSubmitting(false);
      return;
    }

    toast.success('Payment method saved');
    await onSaved?.();
    router.push(returnTo);
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
        <Link href={returnTo} className="btn-secondary text-center">
          Cancel
        </Link>
        <button
          type="submit"
          disabled={!stripe || !elements || isSubmitting}
          className="btn-primary gap-2"
        >
          <CheckCircleIcon className="w-4 h-4" />
          {isSubmitting ? 'Saving...' : 'Save Payment Method'}
        </button>
      </div>
    </form>
  );
}

export default function ProfilePaymentMethodPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user, fetchMe } = useAuthStore();
  const currentUserId = user?.id || '';
  const [setupIntentData, setSetupIntentData] = useState(null);
  const returnTo = searchParams.get('returnTo') || '/profile';

  const savedMethodQuery = useQuery({
    queryKey: ['savedPaymentMethod', currentUserId],
    queryFn: () => paymentApi.getSavedMethod(),
    enabled: !!currentUserId,
  });

  const setupIntentMutation = useMutation({
    mutationFn: () => paymentApi.createSetupIntent(),
    onSuccess: (response) => {
      setSetupIntentData(response?.data?.data || null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to start Stripe setup');
    },
  });

  const deleteSavedMethodMutation = useMutation({
    mutationFn: () => paymentApi.deleteSavedMethod(),
    onSuccess: async () => {
      toast.success('Saved payment method deleted');
      await fetchMe();
      setSetupIntentData(null);
      await queryClient.invalidateQueries({ queryKey: ['savedPaymentMethod', currentUserId] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Could not delete payment method');
    },
  });

  useEffect(() => {
    if (!currentUserId) return;
    if (setupIntentData?.clientSecret) return;
    if (setupIntentMutation.isPending) return;
    setupIntentMutation.mutate();
  }, [currentUserId, setupIntentData, setupIntentMutation.isPending, setupIntentMutation.mutate]);

  const savedMethod = savedMethodQuery.data?.data?.data?.paymentMethod || null;
  const savedMethods = savedMethodQuery.data?.data?.data?.paymentMethods || [];
  const defaultPaymentMethodId =
    savedMethodQuery.data?.data?.data?.defaultPaymentMethodId || savedMethod?.id || null;

  const elementsOptions = useMemo(() => {
    if (!setupIntentData?.clientSecret) return null;

    return {
      clientSecret: setupIntentData.clientSecret,
      locale: 'en',
      appearance: {
        theme: 'stripe',
      },
    };
  }, [setupIntentData]);

  const setDefaultMethodMutation = useMutation({
    mutationFn: (paymentMethodId) => paymentApi.setDefaultMethod(paymentMethodId),
    onSuccess: async () => {
      toast.success('Default payment method updated');
      await fetchMe();
      await queryClient.invalidateQueries({ queryKey: ['savedPaymentMethod', currentUserId] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Could not update default card');
    },
  });

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

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Payment Method</p>
          <h1 className="text-2xl font-bold text-gray-900">Manage Payment Method</h1>
        </div>
        <BackButton href={returnTo} />
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-blue-600 uppercase tracking-wide mb-1">Default Method</p>
              <p className="text-lg font-semibold text-gray-900">
                {savedMethodQuery.isLoading ? 'Loading...' : formatSavedMethod(savedMethod)}
              </p>
              {savedMethod?.expMonth && savedMethod?.expYear ? (
                <p className="text-sm text-blue-700 mt-2">
                  Expires {String(savedMethod.expMonth).padStart(2, '0')}/{savedMethod.expYear}
                </p>
              ) : (
                <p className="text-sm text-blue-700 mt-2">
                  Save a card here and we will reuse it for future booking charges after tutor approval.
                </p>
              )}
            </div>
            <CreditCardIcon className="w-8 h-8 text-blue-500 shrink-0" />
          </div>
        </div>

        {savedMethods.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Saved Cards</h3>
                <p className="text-sm text-gray-500">You can keep multiple cards and choose which one is your default.</p>
              </div>
            </div>

            <div className="space-y-3">
              {savedMethods.map((method) => {
                const isDefault = method.id === defaultPaymentMethodId;

                return (
                  <div
                    key={method.id}
                    className={`rounded-2xl border p-4 ${
                      isDefault ? 'border-blue-200 bg-blue-50/60' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-gray-900">{formatSavedMethod(method)}</p>
                          {isDefault && (
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                              Default
                            </span>
                          )}
                        </div>
                        {method.expMonth && method.expYear ? (
                          <p className="text-sm text-gray-500 mt-1">
                            Expires {String(method.expMonth).padStart(2, '0')}/{method.expYear}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {!isDefault && (
                          <button
                            type="button"
                            onClick={() => setDefaultMethodMutation.mutate(method.id)}
                            disabled={setDefaultMethodMutation.isPending}
                            className="btn-secondary"
                          >
                            {setDefaultMethodMutation.isPending ? 'Updating...' : 'Set as Default'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Delete this payment method?')) {
                              if (method.id === defaultPaymentMethodId) {
                                deleteSavedMethodMutation.mutate();
                              } else {
                                paymentApi
                                  .deleteMethod(method.id)
                                  .then(async () => {
                                    toast.success('Payment method deleted');
                                    await queryClient.invalidateQueries({ queryKey: ['savedPaymentMethod', currentUserId] });
                                  })
                                  .catch((err) => {
                                    toast.error(err?.response?.data?.message || 'Could not delete payment method');
                                  });
                              }
                            }
                          }}
                          disabled={deleteSavedMethodMutation.isPending}
                          className="btn-secondary text-red-600 border-red-200 hover:bg-red-50"
                        >
                          {deleteSavedMethodMutation.isPending && isDefault ? 'Deleting...' : 'Delete Card'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!stripePromise && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
            Stripe publishable key is missing. Please check your environment variables.
          </div>
        )}

        {setupIntentMutation.isPending && !setupIntentData?.clientSecret ? (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            Preparing Stripe payment form...
          </div>
        ) : setupIntentData?.clientSecret && stripePromise && elementsOptions ? (
          <Elements stripe={stripePromise} options={elementsOptions}>
            <PaymentMethodForm
              clientSecret={setupIntentData.clientSecret}
              returnTo={returnTo}
              onSaved={async () => {
                await fetchMe();
                await queryClient.invalidateQueries({ queryKey: ['savedPaymentMethod', currentUserId] });
              }}
            />
          </Elements>
        ) : (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
            We could not prepare Stripe setup. Please try again.
          </div>
        )}

        {savedMethodQuery.isError && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm flex items-start gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 shrink-0 mt-0.5" />
            <span>We could not load your current payment method, but you can still save a new one.</span>
          </div>
        )}
      </div>
    </div>
  );
}
