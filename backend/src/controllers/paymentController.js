const { prisma } = require('../config/database');
const { getStripe } = require('../config/stripe');
const { AppError } = require('../middleware/errorHandler');
const notificationService = require('../services/notificationService');

const buildCustomerName = (user) =>
  `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'TutorConnect User';

exports.createSetupIntent = async (req, res) => {
  if (req.user.role !== 'LEARNER') {
    throw new AppError('Only learners can save payment methods', 403);
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

  const { setupIntentId } = req.body;

  if (!setupIntentId) {
    throw new AppError('Setup intent ID is required', 400);
  }

  const stripe = getStripe();
  const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);

  if (!setupIntent) {
    throw new AppError('Setup intent not found', 404);
  }

  if (setupIntent.status !== 'succeeded' || !setupIntent.payment_method || !setupIntent.customer) {
    throw new AppError('Payment method setup is not complete yet', 400);
  }

  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      stripeCustomerId: String(setupIntent.customer),
      stripeDefaultPaymentMethodId: String(setupIntent.payment_method),
    },
    select: {
      id: true,
      stripeCustomerId: true,
      stripeDefaultPaymentMethodId: true,
    },
  });

  res.json({
    success: true,
    message: 'Payment method saved successfully',
    data: updatedUser,
  });
};

exports.handleStripeWebhook = async (req, res) => {
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
      const setupIntent = event.data.object;
      const userId = setupIntent.metadata?.userId;

      if (userId && setupIntent.payment_method && setupIntent.customer) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            stripeCustomerId: String(setupIntent.customer),
            stripeDefaultPaymentMethodId: String(setupIntent.payment_method),
          },
        });
      }
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
