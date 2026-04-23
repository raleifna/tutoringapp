const { prisma } = require('../config/database');
const { getStripe, isStripeConfigured } = require('../config/stripe');
const { AppError } = require('../middleware/errorHandler');
const { notify, notifyOrRefresh, notifyAdmin } = require('../services/notificationService');

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

const tutorVisibleBookingWhere = {
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
};

const buildRecurringSeries = (bookings) => {
  if (!bookings.length) return null;

  const sortedBookings = [...bookings].sort(
    (left, right) => new Date(left.scheduledAt) - new Date(right.scheduledAt)
  );
  const totalAmount = sortedBookings.reduce(
    (sum, booking) => sum + Number(booking.totalAmount || 0),
    0
  );
  const chargeableAmount = sortedBookings
    .filter((booking) => !isPaidPaymentStatus(booking.payment?.status))
    .reduce((sum, booking) => sum + Number(booking.totalAmount || 0), 0);
  const paidCount = sortedBookings.filter((booking) => isPaidPaymentStatus(booking.payment?.status)).length;
  const pendingPaymentCount = sortedBookings.filter(
    (booking) => ['PENDING', 'FAILED'].includes(String(booking.payment?.status || 'PENDING').toUpperCase())
  ).length;

  return {
    recurringGroupId: sortedBookings[0].recurringGroupId,
    recurringType: sortedBookings[0].recurringType,
    totalSessions: sortedBookings.length,
    paidCount,
    pendingPaymentCount,
    totalAmount,
    chargeableAmount,
    currency: sortedBookings[0].currency || 'AUD',
    firstScheduledAt: sortedBookings[0].scheduledAt,
    lastScheduledAt: sortedBookings[sortedBookings.length - 1].scheduledAt,
    bookings: sortedBookings.map((booking) => ({
      id: booking.id,
      subject: booking.subject,
      status: booking.status,
      scheduledAt: booking.scheduledAt,
      duration: booking.duration,
      totalAmount: booking.totalAmount,
      currency: booking.currency,
      payment: booking.payment
        ? {
            id: booking.payment.id,
            status: booking.payment.status,
            amount: booking.payment.amount,
            currency: booking.payment.currency,
            stripePaymentMethodId: booking.payment.stripePaymentMethodId || null,
          }
        : null,
    })),
  };
};

const attachRecurringSeries = async (bookings, baseWhere = {}) => {
  const recurringGroupIds = [
    ...new Set(
      bookings
        .map((booking) => booking.recurringGroupId)
        .filter(Boolean)
    ),
  ];

  if (!recurringGroupIds.length) return bookings;

  const seriesBookings = await prisma.booking.findMany({
    where: {
      ...baseWhere,
      recurringGroupId: { in: recurringGroupIds },
    },
    include: { payment: true },
    orderBy: { scheduledAt: 'asc' },
  });

  const seriesByGroup = seriesBookings.reduce((accumulator, booking) => {
    if (!accumulator[booking.recurringGroupId]) accumulator[booking.recurringGroupId] = [];
    accumulator[booking.recurringGroupId].push(booking);
    return accumulator;
  }, {});

  return bookings.map((booking) => {
    if (!booking.recurringGroupId) return booking;

    return {
      ...booking,
      recurringSeries: buildRecurringSeries(seriesByGroup[booking.recurringGroupId] || []),
    };
  });
};

const ensureTutorSlotIsAvailable = async (tutorId, scheduledAt, duration) => {
  const requestedStart = new Date(scheduledAt);
  if (Number.isNaN(requestedStart.getTime())) {
    throw new AppError('Valid date-time required', 400);
  }

  const requestedEnd = new Date(requestedStart.getTime() + duration * 60 * 1000);
  const lookupStart = new Date(requestedStart.getTime() - 8 * 60 * 60 * 1000);
  const existingBookings = await prisma.booking.findMany({
    where: {
      tutorId,
      status: { notIn: ['CANCELLED', 'DECLINED'] },
      scheduledAt: {
        gte: lookupStart,
        lt: requestedEnd,
      },
    },
    select: {
      id: true,
      scheduledAt: true,
      duration: true,
    },
  });

  const hasOverlap = existingBookings.some((booking) => {
    const existingStart = new Date(booking.scheduledAt);
    const existingEnd = new Date(existingStart.getTime() + Number(booking.duration || 0) * 60 * 1000);
    return existingStart < requestedEnd && existingEnd > requestedStart;
  });

  if (hasOverlap) {
    throw new AppError('This time slot has already been booked', 409);
  }
};

const getPayableSeriesBookingsForLearner = async (booking, learnerId) => {
  if (!booking.recurringGroupId) {
    return ['PENDING', 'ACCEPTED'].includes(booking.status) &&
      ['PENDING', 'FAILED'].includes(String(booking.payment?.status || 'PENDING').toUpperCase())
      ? [booking]
      : [];
  }

  return prisma.booking.findMany({
    where: {
      recurringGroupId: booking.recurringGroupId,
      learnerId,
      status: { in: ['PENDING', 'ACCEPTED'] },
      payment: {
        is: {
          status: { in: ['PENDING', 'FAILED'] },
        },
      },
    },
    include: {
      payment: true,
      learner: true,
    },
    orderBy: { scheduledAt: 'asc' },
  });
};

const getSelectedPaymentDetails = (payableBookings, learner) => ({
  stripePaymentMethodId:
    payableBookings.find((item) => item.payment?.stripePaymentMethodId)?.payment?.stripePaymentMethodId ||
    learner?.stripeDefaultPaymentMethodId,
  stripeCustomerId:
    payableBookings.find((item) => item.payment?.stripeCustomerId)?.payment?.stripeCustomerId ||
    learner?.stripeCustomerId,
});

const chargePayableBookings = async ({ booking, payableBookings, stripeCustomerId, stripePaymentMethodId }) => {
  if (!payableBookings.length) {
    return {
      paymentStatus: isPaidPaymentStatus(booking.payment?.status) ? 'PAID' : booking.payment?.status || 'PENDING',
      updated: booking,
      updatedBookings: [booking],
    };
  }

  if (!stripeCustomerId || !stripePaymentMethodId) {
    throw new AppError('Learner must save a payment method before this booking can be accepted', 400);
  }

  const stripe = isStripeConfigured() ? getStripe() : null;
  const totalAmount = payableBookings.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);
  let paymentStatus = 'PROCESSING';
  let paymentIntent = null;
  let failureReason = null;

  try {
    if (!stripe) {
      paymentIntent = { id: `local_pi_${Date.now()}` };
      paymentStatus = 'PAID';
    } else {
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalAmount * 100),
        currency: String(
          booking.currency || booking.payment?.currency || payableBookings[0]?.currency || 'AUD'
        ).toLowerCase(),
        customer: stripeCustomerId,
        payment_method: stripePaymentMethodId,
        confirm: true,
        off_session: true,
        metadata: {
          bookingId: booking.id,
          learnerId: booking.learnerId,
          recurringGroupId: booking.recurringGroupId || '',
          bookingCount: String(payableBookings.length),
        },
      });

      if (paymentIntent.status === 'succeeded') {
        paymentStatus = 'PAID';
      } else if (paymentIntent.status === 'requires_payment_method') {
        paymentStatus = 'FAILED';
        failureReason = 'Payment method was declined';
      }
    }
  } catch (error) {
    paymentIntent = error?.raw?.payment_intent || null;
    paymentStatus = 'FAILED';
    failureReason =
      error?.raw?.message || error?.message || 'Stripe payment could not be processed';
  }

  const processedAt = new Date();
  const updatedBookings = await prisma.$transaction(
    payableBookings.map((targetBooking) =>
      prisma.booking.update({
        where: { id: targetBooking.id },
        data: {
          payment: targetBooking.payment
            ? {
                update: {
                  status: paymentStatus,
                  stripeCustomerId,
                  stripePaymentMethodId,
                  stripePaymentIntentId: paymentIntent?.id || targetBooking.payment.stripePaymentIntentId,
                  processedAt,
                  paidAt: paymentStatus === 'PAID' ? processedAt : null,
                  failedAt: paymentStatus === 'FAILED' ? processedAt : null,
                  failureReason,
                },
              }
            : {
                create: {
                  userId: targetBooking.learnerId,
                  amount: targetBooking.totalAmount,
                  currency: targetBooking.currency || 'AUD',
                  status: paymentStatus,
                  stripeCustomerId,
                  stripePaymentMethodId,
                  stripePaymentIntentId: paymentIntent?.id || null,
                  processedAt,
                  paidAt: paymentStatus === 'PAID' ? processedAt : null,
                  failedAt: paymentStatus === 'FAILED' ? processedAt : null,
                  failureReason,
                  description: `${targetBooking.subject} session payment`,
                },
              },
        },
        include: bookingInclude,
      })
    )
  );

  return {
    paymentStatus,
    failureReason,
    updated: updatedBookings.find((item) => item.id === booking.id) || updatedBookings[0],
    updatedBookings,
  };
};

const syncRecurringLearnerNotification = async (booking) => {
  if (!booking?.recurringGroupId) return;

  const seriesBookings = await prisma.booking.findMany({
    where: {
      recurringGroupId: booking.recurringGroupId,
      learnerId: booking.learnerId,
    },
    select: {
      id: true,
      status: true,
      scheduledAt: true,
    },
    orderBy: {
      scheduledAt: 'asc',
    },
  });

  if (!seriesBookings.length) return;

  const counts = seriesBookings.reduce((summary, seriesBooking) => {
    const status = String(seriesBooking.status || 'PENDING').toUpperCase();
    summary[status] = (summary[status] || 0) + 1;
    return summary;
  }, {});

  const acceptedCount = (counts.ACCEPTED || 0) + (counts.COMPLETED || 0);
  const declinedCount = counts.DECLINED || 0;
  const cancelledCount = counts.CANCELLED || 0;
  const pendingCount = counts.PENDING || 0;
  const rootBookingId = seriesBookings[0].id;
  const parts = [];

  if (acceptedCount > 0) parts.push(`${acceptedCount} accepted`);
  if (declinedCount > 0) parts.push(`${declinedCount} declined`);
  if (cancelledCount > 0) parts.push(`${cancelledCount} cancelled`);
  if (pendingCount > 0) parts.push(`${pendingCount} pending`);

  const message = parts.length
    ? `Your recurring booking was updated: ${parts.join(' · ')}.`
    : 'Your recurring booking was updated.';

  await notifyOrRefresh(
    booking.learnerId,
    'booking',
    'Recurring Booking Updated',
    message,
    `/bookings/${rootBookingId}`
  );
};

exports.createBooking = async (req, res) => {
  const {
    tutorId,
    subject,
    subjectId,
    scheduledAt,
    duration,
    sessionType,
    notes,
    recurringType = 'ONE_OFF',
    recurringGroupId,
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
  const rate = parseFloat(tutorProfile.hourlyRate);
  const totalAmount = rate * durationHours;
  const shouldNotifyTutorForRecurringRequest = recurringGroupId
    ? (await prisma.booking.count({
        where: {
          learnerId: req.user.id,
          tutorId: tutorProfile.id,
          recurringGroupId,
        },
      })) === 0
    : true;
  await ensureTutorSlotIsAvailable(tutorProfile.id, scheduledAt, parsedDuration);

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
      recurringGroupId: recurringGroupId || null,
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

  if (shouldNotifyTutorForRecurringRequest) {
    await notify(
      tutorProfile.userId,
      'booking',
      recurringGroupId ? 'New Recurring Booking Request' : 'New Booking Request',
      recurringGroupId ? 'Please review the new recurring booking request.' : 'Please handle a booking request.',
      `/bookings/${booking.id}`
    );
  }

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

  const bookingsWithSeries = await attachRecurringSeries(bookings, { learnerId: req.user.id });

  res.json({
    success: true,
    data: {
      bookings: bookingsWithSeries,
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
    ...tutorVisibleBookingWhere,
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

  const bookingsWithSeries = await attachRecurringSeries(bookings, {
    tutorId: tutorProfile.id,
    ...tutorVisibleBookingWhere,
  });

  res.json({
    success: true,
    data: {
      bookings: bookingsWithSeries,
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

  const recurringSeriesBaseWhere = isLearner
    ? { learnerId: req.user.id }
    : isTutor
      ? { tutorId: tutorProfile.id, ...tutorVisibleBookingWhere }
      : {};
  const [bookingWithSeries] = await attachRecurringSeries([booking], recurringSeriesBaseWhere);

  res.json({ success: true, data: bookingWithSeries });
};

exports.cancelBooking = async (req, res) => {
  const stripe = getStripe();
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

  // learners can cancel before tutor confirmation at any time.
  // the 24 hours rule only applies after the tutor has accepted the booking.
  const now = new Date();
  const scheduledTime = new Date(booking.scheduledAt);
  const hour2 = (scheduledTime - now) / (1000 * 60 * 60);
  const isPaidBooking = isPaidPaymentStatus(booking?.payment?.status);
  if (isLearner && isPaidBooking && booking.status === 'ACCEPTED' && hour2 < 24) {
    throw new AppError('Cannot cancel an accepted booking within 24 hours of the session', 400);
  }

  // TODO: Will the refunded money be deducted by the platform fee and the teacher's fee?
  const paidAmount = parseFloat(booking.payment?.amount || 0);

  // Refound to stripe
  if (isPaidPaymentStatus(booking?.payment?.status)) {
    if (!booking.payment) {
      throw new AppError('Payment not found', 404);
    }
    if (!booking.payment.stripePaymentIntentId) {
      throw new AppError('Stripe payment intent ID not found', 404);
    }

    try {
  
      const refund = await stripe.refunds.create({
        payment_intent: booking.payment.stripePaymentIntentId,
      });

      console.log("refund:" + refund);
      console.log("payment intent id:" + booking.payment.stripePaymentIntentId);
      
    } catch (err) {
      // If have refound, just set ok
      if (err.type === 'StripeInvalidRequestError') {
        if (err.code === 'charge_already_refunded') {
          console.log("charge already refunded");
        }
      } else {
        throw err;
      }
    }
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
            }
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

  const payableBookings = await getPayableSeriesBookingsForLearner(booking, booking.learnerId);
  const selectedPaymentDetails = getSelectedPaymentDetails(payableBookings, booking.learner);

  if (
    payableBookings.length &&
    (!selectedPaymentDetails.stripeCustomerId || !selectedPaymentDetails.stripePaymentMethodId)
  ) {
    throw new AppError('Learner must save a payment method before this booking can be accepted', 400);
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: 'ACCEPTED',
      meetingLink,
      statusHistory: { create: { status: 'ACCEPTED' } },
    },
    include: bookingInclude,
  });

  const paymentResult = await chargePayableBookings({
    booking: updated,
    payableBookings,
    stripeCustomerId: selectedPaymentDetails.stripeCustomerId,
    stripePaymentMethodId: selectedPaymentDetails.stripePaymentMethodId,
  });
  const responseBooking = paymentResult.updated || updated;

  if (booking.recurringGroupId) {
    await syncRecurringLearnerNotification(booking);
  } else {
    await notify(
      booking.learnerId,
      'booking',
      'Booking Accepted',
      paymentResult.paymentStatus === 'PAID'
        ? 'This session was accepted and payment has been confirmed.'
        : paymentResult.paymentStatus === 'FAILED'
          ? 'This session was accepted, but payment failed. Please update your payment method.'
          : 'This session was accepted and payment is processing.',
      `/bookings/${responseBooking.id}`
    );
  }

  res.json({
    success: true,
    message:
      paymentResult.paymentStatus === 'PAID'
        ? 'Session accepted and payment confirmed'
        : paymentResult.paymentStatus === 'FAILED'
          ? 'Session accepted but payment failed'
          : 'Session accepted and payment is processing',
    data: responseBooking,
    affectedCount: 1,
    seriesBookings: paymentResult.updatedBookings || [responseBooking],
  });
};

exports.declineBooking = async (req, res) => {
  const { reason } = req.body;
  const tutorProfile = await prisma.tutorProfile.findUnique({ where: { userId: req.user.id } });
  if (!tutorProfile) throw new AppError('Tutor profile not found', 404);

  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: { payment: true, learner: true },
  });
  if (!booking || booking.tutorId !== tutorProfile.id) throw new AppError('Booking not found', 404);
  if (booking.status !== 'PENDING') throw new AppError('Booking is not pending', 400);

  const updated = await prisma.booking.update({
    where: { id: booking.id },
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

  res.json({
    success: true,
    message: isPaidPaymentStatus(booking?.payment?.status)
      ? 'Session declined and payment refunded'
      : 'Session declined',
    data: updated,
    affectedCount: 1,
    seriesBookings: [updated],
  });

  if (booking.recurringGroupId) {
    await syncRecurringLearnerNotification(booking);
  } else {
    await notify(
      booking.learnerId,
      'booking',
      'Booking Declined',
      'One session has been declined.',
      `/bookings/${updated.id}`
    );
  }
};

exports.completeBooking = async (req, res) => {
  const tutorProfile = await prisma.tutorProfile.findUnique({ where: { userId: req.user.id } });
  if (!tutorProfile) throw new AppError('Tutor profile not found', 404);

  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking || booking.tutorId !== tutorProfile.id) throw new AppError('Booking not found', 404);
  if (booking.status !== 'ACCEPTED') throw new AppError('Booking must be accepted first', 400);

  const updated = await prisma.$transaction(async (tx) => {
    const completedBooking = await tx.booking.update({
      where: { id: req.params.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        statusHistory: { create: { status: 'COMPLETED' } },
      },
      include: bookingInclude,
    });

    await tx.tutorProfile.update({
      where: { id: tutorProfile.id },
      data: { totalSessions: { increment: 1 } },
    });

    return completedBooking;
  });

  res.json({ success: true, message: 'Booking marked as completed', data: updated });
};

exports.payForBooking = async (req, res) => {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: {
      payment: true,
      learner: true,
    },
  });

  if (!booking || booking.learnerId !== req.user.id) {
    throw new AppError('Booking not found', 404);
  }

  const payableBookings = await getPayableSeriesBookingsForLearner(booking, req.user.id);
  if (!payableBookings.length) {
    throw new AppError('This booking has already been paid', 400);
  }

  const selectedPaymentDetails = getSelectedPaymentDetails(payableBookings, booking.learner);

  if (!selectedPaymentDetails.stripeCustomerId || !selectedPaymentDetails.stripePaymentMethodId) {
    throw new AppError('Please save a payment method before paying for this booking', 400);
  }

  const paymentResult = await chargePayableBookings({
    booking,
    payableBookings,
    stripeCustomerId: selectedPaymentDetails.stripeCustomerId,
    stripePaymentMethodId: selectedPaymentDetails.stripePaymentMethodId,
  });
  const updated = paymentResult.updated;
  const updatedBookings = paymentResult.updatedBookings;
  const paymentStatus = paymentResult.paymentStatus;
  const isSeriesPayment = updatedBookings.length > 1;

  await notify(
    booking.learnerId,
    'payment',
    isSeriesPayment ? 'Recurring Booking Paid' : 'Booking Paid',
    paymentStatus === 'PAID'
      ? isSeriesPayment
        ? `${updatedBookings.length} sessions in your recurring booking have been paid successfully.`
        : 'Your booking has been paid successfully.'
      : 'We could not process your payment. Please update your payment method and try again.',
    `/bookings/${updated.id}`
  );

  res.json({
    success: true,
    message:
      paymentStatus === 'PAID'
        ? isSeriesPayment
          ? `${updatedBookings.length} sessions paid successfully`
          : 'Booking paid successfully'
        : 'Payment failed',
    data: updated,
    affectedCount: updatedBookings.length,
    seriesBookings: updatedBookings,
  });
};
