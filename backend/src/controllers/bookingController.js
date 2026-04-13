const { prisma } = require('../config/database');
const { getStripe } = require('../config/stripe');
const { AppError } = require('../middleware/errorHandler');
const { notify, notifyAdmin } = require('../services/notificationService');

const bookingInclude = {
  learner: {
    select: { id: true, firstName: true, lastName: true, avatar: true, email: true },
  },
  tutorProfile: {
    include: {
      user: { select: { id: true, firstName: true, lastName: true, avatar: true, email: true } },
    },
  },
  payment: true,
  statusHistory: { orderBy: { createdAt: 'desc' } },
};

const isPaidPaymentStatus = (status) => ['PAID', 'COMPLETED'].includes(String(status || '').toUpperCase());

exports.createBooking = async (req, res) => {
  const {
    tutorId,
    subject,
    subjectId,
    scheduledAt,
    duration,
    sessionType,
    notes,
    hourlyRate,
    recurringType = 'ONE_OFF',
    meetingTool,
  } = req.body;

  const tutorProfile = await prisma.tutorProfile.findFirst({
    where: { OR: [{ id: tutorId }, { userId: tutorId }], status: 'ACTIVE' },
    include: {
      user: true,
      subjects: {
        include: { subject: true },
      },
    },
  });

  if (!tutorProfile) throw new AppError('Tutor not found or not active', 404);
  if (tutorProfile.userId === req.user.id) throw new AppError('You cannot book yourself', 400);

  let bookingSubject = typeof subject === 'string' ? subject.trim() : '';
  if (subjectId) {
    const selectedSubject = tutorProfile.subjects.find((item) => item.subjectId === subjectId);
    if (!selectedSubject) {
      throw new AppError('Selected subject is not offered by this tutor', 400);
    }
    bookingSubject = selectedSubject.subject.name;
  }

  if (!bookingSubject) throw new AppError('Subject required', 400);

  const parsedDuration = parseInt(duration, 10);
  const durationHours = parsedDuration / 60;
  const rate =
    hourlyRate !== undefined ? parseFloat(hourlyRate) : parseFloat(tutorProfile.hourlyRate);
  const totalAmount = rate * durationHours;

  const booking = await prisma.booking.create({
    data: {
      learnerId: req.user.id,
      tutorId: tutorProfile.id,
      subject: bookingSubject,
      scheduledAt: new Date(scheduledAt),
      duration: parsedDuration,
      sessionType: sessionType || 'ONLINE',
      hourlyRate: rate,
      totalAmount,
      currency: tutorProfile.currency || 'AUD',
      notes,
      status: 'PENDING',
      recurringType: recurringType || 'ONE_OFF',
      meetingTool: meetingTool || tutorProfile.preferredMeetingTool || null,
      payment: {
        create: {
          userId: req.user.id,
          amount: totalAmount,
          currency: tutorProfile.currency || 'AUD',
          status: 'PENDING',
          description: `${bookingSubject} session booking payment`,
        },
      },
      statusHistory: {
        create: { status: 'PENDING' },
      },
    },
    include: bookingInclude,
  });

  // notify tutor
  await notify(tutorProfile.userId, 'booking', 'New Booking Request', `Please handle a booking request.`, `/bookings/${booking.id}`);

  res.status(201).json({
    success: true,
    message: 'Booking request sent successfully',
    data: booking,
  });
};

exports.getMyBookings = async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const parsedPage = parseInt(page, 10) || 1;
  const parsedLimit = parseInt(limit, 10) || 10;
  const skip = (parsedPage - 1) * parsedLimit;

  const where = {
    learnerId: req.user.id,
    ...(status && { status }),
  };

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: bookingInclude,
      orderBy: { scheduledAt: 'desc' },
      skip,
      take: parsedLimit,
    }),
    prisma.booking.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      bookings,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      },
    },
  });
};

exports.getTutorBookings = async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: req.user.id },
  });
  if (!tutorProfile) throw new AppError('Tutor profile not found', 404);

  const parsedPage = parseInt(page, 10) || 1;
  const parsedLimit = parseInt(limit, 10) || 10;
  const skip = (parsedPage - 1) * parsedLimit;
  const where = {
    tutorId: tutorProfile.id,
    OR: [
      {
        status: {
          not: 'CANCELLED',
        },
      },
      {
        status: 'CANCELLED',
        statusHistory: {
          some: {
            status: 'ACCEPTED',
          },
        },
      },
    ],
    ...(status && { status }),
  };

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: bookingInclude,
      orderBy: { scheduledAt: 'desc' },
      skip,
      take: parsedLimit,
    }),
    prisma.booking.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      bookings,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      },
    },
  });
};

exports.getBooking = async (req, res) => {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: bookingInclude,
  });

  if (!booking) throw new AppError('Booking not found', 404);

  const tutorProfile =
    req.user.role === 'TUTOR'
      ? await prisma.tutorProfile.findUnique({ where: { userId: req.user.id } })
      : null;

  const isLearner = booking.learnerId === req.user.id;
  const isTutor = tutorProfile && booking.tutorId === tutorProfile.id;
  const isTutorVisible =
    isTutor &&
    (booking?.status !== 'CANCELLED' ||
      booking?.statusHistory?.some((entry) => entry.status === 'ACCEPTED'));
  const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SYSTEM_ADMIN';

  if (!isLearner && !isTutorVisible && !isAdmin) {
    throw new AppError('Access denied', 403);
  }

  res.json({ success: true, data: booking });
};

exports.cancelBooking = async (req, res) => {
  const { reason } = req.body;
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: {
      tutorProfile: { include: { user: true } },
      learner: true,
      payment: true,
    },
  });

  if (!booking) throw new AppError('Booking not found', 404);

  const tutorProfile =
    req.user.role === 'TUTOR'
      ? await prisma.tutorProfile.findUnique({ where: { userId: req.user.id } })
      : null;

  const isLearner = booking.learnerId === req.user.id;
  const isTutor = tutorProfile && booking.tutorId === tutorProfile.id;

  if (!isLearner && !isTutor) throw new AppError('Access denied', 403);

  const cancellableStatuses = ['UNPAID', 'PENDING', 'ACCEPTED'];
  if (!cancellableStatuses.includes(booking.status)) {
    throw new AppError(`Cannot cancel a ${booking.status.toLowerCase()} booking`, 400);
  }

  // Learners can cancel before tutor confirmation at any time.
  // The 24-hour rule only applies after the tutor has accepted the booking.
  const now = new Date();
  const scheduledTime = new Date(booking.scheduledAt);
  const hoursUntilSession = (scheduledTime - now) / (1000 * 60 * 60);
  const isPaidBooking = isPaidPaymentStatus(booking?.payment?.status);
  const isAcceptedBooking = booking.status === 'ACCEPTED';
  if (isLearner && isPaidBooking && isAcceptedBooking && hoursUntilSession < 24) {
    throw new AppError('Cannot cancel an accepted booking within 24 hours of the session', 400);
  }

  const updated = await prisma.booking.update({
    where: { id: req.params.id },
    data: {
      status: 'CANCELLED',
      cancellationReason: reason,
      ...(isPaidPaymentStatus(booking?.payment?.status)
        ? {
            payment: {
              update: {
                status: 'REFUNDED',
                refundAmount: booking.payment.amount,
                refundedAt: new Date(),
              },
            },
          }
        : booking?.payment
          ? {
              payment: {
                update: {
                  status: 'CANCELLED',
                },
              },
            }
          : {}),
      statusHistory: { create: { status: 'CANCELLED', reason } },
    },
    include: bookingInclude,
  });

  // notify tutor
  await notify(booking.tutorProfile.userId, 'booking', 'Booking Cancelled', `A booking has been cancelled.`, `/bookings/${updated.id}`);

  res.json({
    success: true,
    message:
      isPaidPaymentStatus(booking?.payment?.status)
        ? 'Booking cancelled and payment refunded'
        : booking?.payment
          ? 'Booking cancelled'
        : 'Booking cancelled',
    data: updated,
  });
};

exports.acceptBooking = async (req, res) => {
  const { meetingLink } = req.body;
  const stripe = getStripe();
  const tutorProfile = await prisma.tutorProfile.findUnique({ where: { userId: req.user.id } });
  if (!tutorProfile) throw new AppError('Tutor profile not found', 404);

  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: {
      payment: true,
      learner: true,
    },
  });
  if (!booking || booking.tutorId !== tutorProfile.id) throw new AppError('Booking not found', 404);
  if (booking.status !== 'PENDING') throw new AppError('Booking is not pending', 400);
  const selectedPaymentMethodId =
    booking.payment?.stripePaymentMethodId || booking.learner?.stripeDefaultPaymentMethodId;

  if (!booking.learner?.stripeCustomerId || !selectedPaymentMethodId) {
    throw new AppError('Learner must save a payment method before this booking can be accepted', 400);
  }

  let paymentStatus = 'PROCESSING';
  let paymentIntent = null;
  let failureReason = null;

  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(booking.totalAmount || 0) * 100),
      currency: String(booking.currency || booking.payment?.currency || 'AUD').toLowerCase(),
      customer: booking.learner.stripeCustomerId,
      payment_method: selectedPaymentMethodId,
      confirm: true,
      off_session: true,
      metadata: {
        bookingId: booking.id,
        learnerId: booking.learnerId,
        tutorProfileId: tutorProfile.id,
      },
    });

    if (paymentIntent.status === 'succeeded') {
      paymentStatus = 'PAID';
    } else if (paymentIntent.status === 'requires_payment_method') {
      paymentStatus = 'FAILED';
      failureReason = 'Payment method was declined';
    }
  } catch (error) {
    paymentIntent = error?.raw?.payment_intent || null;
    paymentStatus = 'FAILED';
    failureReason =
      error?.raw?.message || error?.message || 'Stripe payment could not be processed';
  }

  const updated = await prisma.booking.update({
    where: { id: req.params.id },
    data: {
      status: 'ACCEPTED',
      meetingLink,
      payment: booking.payment
        ? {
            update: {
              status: paymentStatus,
              stripeCustomerId: booking.learner.stripeCustomerId,
              stripePaymentMethodId: selectedPaymentMethodId,
              stripePaymentIntentId: paymentIntent?.id || booking.payment.stripePaymentIntentId,
              processedAt: new Date(),
              paidAt: paymentStatus === 'PAID' ? new Date() : null,
              failedAt: paymentStatus === 'FAILED' ? new Date() : null,
              failureReason,
            },
          }
        : {
            create: {
              userId: booking.learnerId,
              amount: booking.totalAmount,
              currency: booking.currency || 'AUD',
              status: paymentStatus,
              stripeCustomerId: booking.learner.stripeCustomerId,
              stripePaymentMethodId: selectedPaymentMethodId,
              stripePaymentIntentId: paymentIntent?.id || null,
              processedAt: new Date(),
              paidAt: paymentStatus === 'PAID' ? new Date() : null,
              failedAt: paymentStatus === 'FAILED' ? new Date() : null,
              failureReason,
              description: `${booking.subject} session payment`,
            },
          },
      statusHistory: { create: { status: 'ACCEPTED' } },
    },
    include: bookingInclude,
  });

  // notify student
  await notify(
    booking.learnerId,
    'booking',
    'Booking Accepted',
    paymentStatus === 'FAILED'
      ? 'Your booking was accepted, but the payment could not be completed. Please update your payment method.'
      : paymentStatus === 'PAID'
        ? 'Your booking was accepted and payment has been confirmed.'
        : 'Your booking was accepted and payment is now being processed.',
    `/bookings/${updated.id}`
  );

  if (paymentStatus === 'FAILED') {
    await notify(
      booking.learnerId,
      'payment',
      'Payment Failed',
      failureReason || 'Please update your payment method and try again.',
      `/bookings/${updated.id}/payment?returnTo=${encodeURIComponent(`/bookings/${updated.id}`)}`
    );
  }

  res.json({
    success: true,
    message:
      paymentStatus === 'FAILED'
        ? 'Booking accepted, but payment failed'
        : paymentStatus === 'PAID'
          ? 'Booking accepted and payment confirmed'
          : 'Booking accepted and payment is processing',
    data: updated,
  });
};

exports.declineBooking = async (req, res) => {
  const { reason } = req.body;
  const tutorProfile = await prisma.tutorProfile.findUnique({ where: { userId: req.user.id } });
  if (!tutorProfile) throw new AppError('Tutor profile not found', 404);

  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: { payment: true },
  });
  if (!booking || booking.tutorId !== tutorProfile.id) throw new AppError('Booking not found', 404);
  if (booking.status !== 'PENDING') throw new AppError('Booking is not pending', 400);

  const updated = await prisma.booking.update({
    where: { id: req.params.id },
    data: {
      status: 'DECLINED',
      declineReason: reason,
      ...(isPaidPaymentStatus(booking?.payment?.status)
        ? {
            payment: {
              update: {
                status: 'REFUNDED',
                refundAmount: booking.payment.amount,
                refundedAt: new Date(),
              },
            },
          }
        : {}),
      statusHistory: { create: { status: 'DECLINED', reason } },
    },
    include: bookingInclude,
  });

  // notify student
  await notify(booking.learnerId, 'booking', 'Booking Declined', `A booking has been declined.`, `/bookings/${updated.id}`);

  res.json({
    success: true,
    message:
      isPaidPaymentStatus(booking?.payment?.status)
        ? 'Booking declined and payment refunded'
        : 'Booking declined',
    data: updated,
  });
};

exports.rescheduleBooking = async (req, res) => {
  const { scheduledAt, reason } = req.body;
  const tutorProfile = await prisma.tutorProfile.findUnique({ where: { userId: req.user.id } });
  if (!tutorProfile) throw new AppError('Tutor profile not found', 404);

  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking || booking.tutorId !== tutorProfile.id) throw new AppError('Booking not found', 404);
  if (!['PENDING', 'ACCEPTED'].includes(booking.status)) {
    throw new AppError('Cannot reschedule this booking', 400);
  }

  const updated = await prisma.booking.update({
    where: { id: req.params.id },
    data: {
      scheduledAt: new Date(scheduledAt),
      status: 'RESCHEDULED',
      statusHistory: { create: { status: 'RESCHEDULED', reason } },
    },
    include: bookingInclude,
  });

  // notify student
  await notify(booking.learnerId, 'booking', 'Booking Rescheduled', `A booking has been rescheduled.`, `/bookings/${updated.id}`);

   res.json({ success: true, message: 'Booking rescheduled', data: updated });
};

exports.completeBooking = async (req, res) => {
  const tutorProfile = await prisma.tutorProfile.findUnique({ where: { userId: req.user.id } });
  if (!tutorProfile) throw new AppError('Tutor profile not found', 404);

  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking || booking.tutorId !== tutorProfile.id) throw new AppError('Booking not found', 404);
  if (booking.status !== 'ACCEPTED') throw new AppError('Booking must be accepted first', 400);

  const updated = await prisma.booking.update({
    where: { id: req.params.id },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      statusHistory: { create: { status: 'COMPLETED' } },
    },
    include: bookingInclude,
  });

  await prisma.tutorProfile.update({
    where: { id: tutorProfile.id },
    data: { totalSessions: { increment: 1 } },
  });

  res.json({ success: true, message: 'Booking marked as completed', data: updated });
};

exports.payForBooking = async (req, res) => {
  throw new AppError('Manual payment is no longer required. Save a payment method and wait for tutor approval.', 400);
};
