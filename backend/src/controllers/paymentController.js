const { prisma } = require('../config/database');
const { getStripe, isStripeConfigured } = require('../config/stripe');
const { AppError } = require('../middleware/errorHandler');
const notificationService = require('../services/notificationService');

const buildCustomerName = (user) =>
  `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'TutorConnect User';

const mapSavedPaymentMethod = (paymentMethod) => {
  if (!paymentMethod) return null;

  const card = paymentMethod.card || null;

  return {
    id: paymentMethod.id,
    type: paymentMethod.type || null,
    brand: card?.brand || null,
    last4: card?.last4 || null,
    expMonth: card?.exp_month || null,
    expYear: card?.exp_year || null,
    billingName: paymentMethod.billing_details?.name || null,
  };
};

const pendingPaymentStatuses = ['PENDING', 'FAILED', 'PROCESSING'];

const getTargetBookingsForPaymentSetup = async (booking, learnerId) => {
  if (!booking.recurringGroupId) {
    return [booking];
  }

  return prisma.booking.findMany({
    where: {
      recurringGroupId: booking.recurringGroupId,
      learnerId,
      status: { in: ['PENDING', 'ACCEPTED'] },
      payment: {
        is: {
          status: { in: ['PENDING', 'FAILED', 'PROCESSING'] },
        },
      },
    },
    include: { payment: true },
    orderBy: { scheduledAt: 'asc' },
  });
};

const getStripeCustomerMethods = async (stripe, stripeCustomerId, stripeDefaultPaymentMethodId) => {
  if (!stripeCustomerId) {
    return [];
  }

  const response = await stripe.paymentMethods.list({
    customer: stripeCustomerId,
    type: 'card',
  });

  const methods = (response?.data || []).map(mapSavedPaymentMethod).filter(Boolean);

  return methods.sort((a, b) => {
    if (a.id === stripeDefaultPaymentMethodId) return -1;
    if (b.id === stripeDefaultPaymentMethodId) return 1;
    return 0;
  });
};

const bookingPendingUpdate = (booking, reason) =>
  booking.status === 'UNPAID'
    ? {
        status: 'PENDING',
        statusHistory: {
          create: {
            status: 'PENDING',
            reason,
          },
        },
      }
    : {};

exports.getSavedPaymentMethod = async (req, res) => {
  if (req.user.role !== 'LEARNER') {
    throw new AppError('Only learners can view payment methods', 403);
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      stripeCustomerId: true,
      stripeDefaultPaymentMethodId: true,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (!isStripeConfigured()) {
    res.json({
      success: true,
      data: {
        hasPaymentMethod: false,
        paymentMethod: null,
        paymentMethods: [],
        unavailable: true,
      },
    });
    return;
  }

  if (!user.stripeCustomerId || !user.stripeDefaultPaymentMethodId) {
    res.json({
      success: true,
      data: {
        hasPaymentMethod: false,
        paymentMethod: null,
        paymentMethods: [],
      },
    });
    return;
  }

  const stripe = getStripe();

  try {
    const paymentMethod = await stripe.paymentMethods.retrieve(user.stripeDefaultPaymentMethodId);
    const paymentMethods = await getStripeCustomerMethods(
      stripe,
      user.stripeCustomerId,
      user.stripeDefaultPaymentMethodId
    );

    res.json({
      success: true,
      data: {
        hasPaymentMethod: true,
        paymentMethod: mapSavedPaymentMethod(paymentMethod),
        paymentMethods,
        defaultPaymentMethodId: user.stripeDefaultPaymentMethodId,
      },
    });
  } catch (error) {
    res.json({
      success: true,
      data: {
        hasPaymentMethod: false,
        paymentMethod: null,
        paymentMethods: [],
        unavailable: true,
      },
    });
  }
};

exports.setDefaultPaymentMethod = async (req, res) => {
  if (req.user.role !== 'LEARNER') {
    throw new AppError('Only learners can update payment methods', 403);
  }

  const { paymentMethodId } = req.body;

  if (!paymentMethodId) {
    throw new AppError('Payment method ID is required', 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      stripeCustomerId: true,
    },
  });

  if (!isStripeConfigured()) {
    throw new AppError('Payment setup is currently unavailable', 503);
  }

  if (!user?.stripeCustomerId) {
    throw new AppError('Stripe customer not found', 404);
  }

  const stripe = getStripe();
  const paymentMethods = await getStripeCustomerMethods(stripe, user.stripeCustomerId, paymentMethodId);
  const exists = paymentMethods.some((method) => method.id === paymentMethodId);

  if (!exists) {
    throw new AppError('Payment method not found', 404);
  }

  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      stripeDefaultPaymentMethodId: paymentMethodId,
    },
  });

  res.json({
    success: true,
    message: 'Default payment method updated',
  });
};

exports.createSetupIntent = async (req, res) => {
  if (req.user.role !== 'LEARNER') {
    throw new AppError('Only learners can save payment methods', 403);
  }

  if (!isStripeConfigured()) {
    throw new AppError('Payment setup is currently unavailable', 503);
  }

  const stripe = getStripe();

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  let stripeCustomerId = user.stripeCustomerId;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: buildCustomerName(user),
      metadata: {
        userId: user.id,
        role: user.role,
      },
    });

    stripeCustomerId = customer.id;

    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId },
    });
  }

  const setupIntent = await stripe.setupIntents.create({
    customer: stripeCustomerId,
    payment_method_types: ['card'],
    usage: 'off_session',
    metadata: {
      userId: user.id,
    },
  });

  res.json({
    success: true,
    data: {
      clientSecret: setupIntent.client_secret,
      customerId: stripeCustomerId,
      setupIntentId: setupIntent.id,
    },
  });
};

exports.completeSetupIntent = async (req, res) => {
  if (req.user.role !== 'LEARNER') {
    throw new AppError('Only learners can save payment methods', 403);
  }

  const { setupIntentId, bookingId, saveAsDefault = true } = req.body;

  if (!setupIntentId) {
    throw new AppError('Setup intent ID is required', 400);
  }

  if (!isStripeConfigured()) {
    throw new AppError('Payment setup is currently unavailable', 503);
  }

  const stripe = getStripe();
  const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);

  if (!setupIntent) {
    throw new AppError('Setup intent not found', 404);
  }

  if (setupIntent.status !== 'succeeded' || !setupIntent.payment_method || !setupIntent.customer) {
    throw new AppError('Payment method setup is not complete yet', 400);
  }

  const stripeCustomerId = String(setupIntent.customer);
  const stripePaymentMethodId = String(setupIntent.payment_method);

  let updatedUser = null;

  if (saveAsDefault) {
    updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        stripeCustomerId,
        stripeDefaultPaymentMethodId: stripePaymentMethodId,
      },
      select: {
        id: true,
        stripeCustomerId: true,
        stripeDefaultPaymentMethodId: true,
      },
    });
  }

  if (bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });

    if (!booking || booking.learnerId !== req.user.id) {
      throw new AppError('Booking not found', 404);
    }

    if (!booking.payment) {
      throw new AppError('Payment record not found for this booking', 404);
    }

    const targetBookings = await getTargetBookingsForPaymentSetup(booking, req.user.id);

    await prisma.$transaction(
      targetBookings
        .filter((targetBooking) => targetBooking.payment)
        .flatMap((targetBooking) => [
          prisma.payment.update({
            where: { id: targetBooking.payment.id },
            data: {
              stripeCustomerId,
              stripePaymentMethodId,
              stripeSetupIntentId: setupIntent.id,
              status: targetBooking.payment.status === 'FAILED' ? 'PENDING' : targetBooking.payment.status,
              failureReason: null,
              failedAt: null,
            },
          }),
          ...(targetBooking.status === 'UNPAID'
            ? [
                prisma.booking.update({
                  where: { id: targetBooking.id },
                  data: bookingPendingUpdate(targetBooking, 'Payment method saved'),
                }),
              ]
            : []),
        ])
    );
  }

  const paymentMethod = await stripe.paymentMethods.retrieve(stripePaymentMethodId);

  res.json({
    success: true,
    message: 'Payment method saved successfully',
    data: {
      user: updatedUser,
      paymentMethod: mapSavedPaymentMethod(paymentMethod),
      savedAsDefault: Boolean(saveAsDefault),
      bookingId: bookingId || null,
    },
  });
};

exports.useSavedMethodForBooking = async (req, res) => {
  if (req.user.role !== 'LEARNER') {
    throw new AppError('Only learners can manage booking payment methods', 403);
  }

  if (!isStripeConfigured()) {
    throw new AppError('Payment setup is currently unavailable', 503);
  }

  const booking = await prisma.booking.findUnique({
    where: { id: req.params.bookingId },
    include: { payment: true },
  });

  if (!booking || booking.learnerId !== req.user.id) {
    throw new AppError('Booking not found', 404);
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      stripeCustomerId: true,
      stripeDefaultPaymentMethodId: true,
    },
  });

  if (!user?.stripeCustomerId || !user?.stripeDefaultPaymentMethodId) {
    throw new AppError('No saved payment method found', 400);
  }

  if (!booking.payment) {
    throw new AppError('Payment record not found for this booking', 404);
  }

  const targetBookings = await getTargetBookingsForPaymentSetup(booking, req.user.id);

  const transactionResult = await prisma.$transaction(
    targetBookings
      .filter((targetBooking) => targetBooking.payment)
      .flatMap((targetBooking) => [
        prisma.payment.update({
          where: { id: targetBooking.payment.id },
          data: {
            stripeCustomerId: user.stripeCustomerId,
            stripePaymentMethodId: user.stripeDefaultPaymentMethodId,
            failureReason: null,
            failedAt: null,
            status: targetBooking.payment.status === 'FAILED' ? 'PENDING' : targetBooking.payment.status,
          },
        }),
        ...(targetBooking.status === 'UNPAID'
          ? [
              prisma.booking.update({
                where: { id: targetBooking.id },
                data: bookingPendingUpdate(targetBooking, 'Saved payment method selected'),
              }),
            ]
          : []),
      ])
  );
  const updatedPayments = transactionResult.filter((item) => item && item.bookingId);

  res.json({
    success: true,
    message: booking.recurringGroupId
      ? 'Saved payment method selected for this recurring booking'
      : 'Saved payment method selected for this booking',
    data: updatedPayments[0],
  });
};

exports.deleteSavedPaymentMethod = async (req, res) => {
  if (req.user.role !== 'LEARNER') {
    throw new AppError('Only learners can delete payment methods', 403);
  }

  const paymentMethodId = req.params.paymentMethodId || req.body?.paymentMethodId || null;

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      stripeCustomerId: true,
      stripeDefaultPaymentMethodId: true,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const targetPaymentMethodId = paymentMethodId || user.stripeDefaultPaymentMethodId;

  if (!targetPaymentMethodId) {
    res.json({
      success: true,
      message: 'No saved payment method to delete',
    });
    return;
  }

  const paymentLinkedBookingCount = await prisma.booking.count({
    where: {
      learnerId: req.user.id,
      status: {
        in: ['PENDING', 'ACCEPTED'],
      },
      payment: {
        is: {
          stripePaymentMethodId: targetPaymentMethodId,
          status: {
            in: pendingPaymentStatuses,
          },
        },
      },
    },
  });

  if (paymentLinkedBookingCount > 0) {
    throw new AppError('This card is still linked to bookings waiting for payment', 400);
  }

  let activeDefaultBookingCount = 0;

  if (targetPaymentMethodId === user.stripeDefaultPaymentMethodId) {
    activeDefaultBookingCount = await prisma.booking.count({
      where: {
        learnerId: req.user.id,
        status: {
          in: ['PENDING', 'ACCEPTED'],
        },
        payment: {
          is: {
            OR: [
              { stripePaymentMethodId: null },
              { stripePaymentMethodId: targetPaymentMethodId },
            ],
            status: {
              in: pendingPaymentStatuses,
            },
          },
        },
      },
    });
  }

  let remainingMethods = [];

  if (isStripeConfigured()) {
    const stripe = getStripe();
    const paymentMethods = await getStripeCustomerMethods(
      stripe,
      user.stripeCustomerId,
      user.stripeDefaultPaymentMethodId
    );

    remainingMethods = paymentMethods.filter((method) => method.id !== targetPaymentMethodId);

    try {
      await stripe.paymentMethods.detach(targetPaymentMethodId);
    } catch {
    }
  }

  if (activeDefaultBookingCount > 0 && remainingMethods.length === 0) {
    throw new AppError('You need to keep at least one payment method while bookings are still waiting for payment', 400);
  }

  const nextDefaultPaymentMethodId =
    targetPaymentMethodId === user.stripeDefaultPaymentMethodId
      ? remainingMethods[0]?.id || null
      : user.stripeDefaultPaymentMethodId;

  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      stripeDefaultPaymentMethodId: nextDefaultPaymentMethodId,
    },
  });

  res.json({
    success: true,
    message: 'Saved payment method deleted',
    data: {
      defaultPaymentMethodId: nextDefaultPaymentMethodId,
    },
  });
};

exports.handleStripeWebhook = async (req, res) => {
  if (!isStripeConfigured()) {
    res.json({ received: true, localMode: true });
    return;
  }

  const stripe = getStripe();
  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
    } else {
      event = JSON.parse(req.body.toString('utf8'));
    }
  } catch (error) {
    res.status(400).send(`Webhook Error: ${error.message}`);
    return;
  }

  switch (event.type) {
    case 'setup_intent.succeeded': {
      break;
    }

    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      const payment = await prisma.payment.findFirst({
        where: {
          stripePaymentIntentId: paymentIntent.id,
        },
        include: {
          booking: true,
        },
      });

      if (payment) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'PAID',
            paidAt: new Date(),
            processedAt: new Date(),
            failureReason: null,
          },
        });

        await notificationService.notify(
          payment.userId,
          'payment',
          'Payment Confirmed',
          'Your payment has been confirmed successfully.',
          payment.bookingId ? `/bookings/${payment.bookingId}` : '/bookings'
        );
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object;
      const failureMessage =
        paymentIntent.last_payment_error?.message || 'Stripe payment failed';
      const payment = await prisma.payment.findFirst({
        where: {
          stripePaymentIntentId: paymentIntent.id,
        },
      });

      if (payment) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            processedAt: new Date(),
            failureReason: failureMessage,
          },
        });

        await notificationService.notify(
          payment.userId,
          'payment',
          'Payment Failed',
          'We could not process your payment. Please update your payment method and try again.',
          payment.bookingId ? `/bookings/${payment.bookingId}/payment?returnTo=${encodeURIComponent(`/bookings/${payment.bookingId}`)}` : '/bookings'
        );
      }
      break;
    }

    default:
      break;
  }

  res.json({ received: true });
};
