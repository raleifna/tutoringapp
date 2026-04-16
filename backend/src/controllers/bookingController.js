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

const getActionableSeriesBookings = async (booking, tutorId) => {
  if (!booking.recurringGroupId) return [booking];

  return prisma.booking.findMany({
    where: {
      recurringGroupId: booking.recurringGroupId,
      tutorId,
      learnerId: booking.learnerId,
      status: 'PENDING',
    },
    include: {
      payment: true,
      learner: true,
    },
    orderBy: { scheduledAt: 'asc' },
  });
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

  const now = new Date();
  const scheduledTime = new Date(booking.scheduledAt);
  const hoursUntilSession = (scheduledTime - now) / (1000 * 60 * 60);
  const isPaidBooking = isPaidPaymentStatus(booking?.payment?.status);
  const isAcceptedBooking = booking.status === 'ACCEPTED';
  if (isLearner && isPaidBooking && isAcceptedBooking && hoursUntilSession < 48) {
    throw new AppError('Cannot cancel an accepted booking within 48 hours of the session', 400);
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
  const targetBookings = await getActionableSeriesBookings(booking, tutorProfile.id);
  if (!targetBookings.length) {
    throw new AppError('No pending bookings found for this series', 400);
  }

  const updatedBookings = [];

  for (const targetBooking of targetBookings) {
    let paymentStatus = 'PROCESSING';
    let paymentIntent = null;
    let failureReason = null;

    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(Number(targetBooking.totalAmount || 0) * 100),
        currency: String(targetBooking.currency || targetBooking.payment?.currency || 'AUD').toLowerCase(),
        customer: targetBooking.learner?.stripeCustomerId || booking.learner.stripeCustomerId,
        payment_method: selectedPaymentMethodId,
        confirm: true,
        off_session: true,
        metadata: {
          bookingId: targetBooking.id,
          learnerId: targetBooking.learnerId,
          tutorProfileId: tutorProfile.id,
          recurringGroupId: targetBooking.recurringGroupId || '',
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

    const updatedBooking = await prisma.booking.update({
      where: { id: targetBooking.id },
      data: {
        status: 'ACCEPTED',
        meetingLink,
        payment: targetBooking.payment
          ? {
              update: {
                status: paymentStatus,
                stripeCustomerId: booking.learner.stripeCustomerId,
                stripePaymentMethodId: selectedPaymentMethodId,
                stripePaymentIntentId: paymentIntent?.id || targetBooking.payment.stripePaymentIntentId,
                processedAt: new Date(),
                paidAt: paymentStatus === 'PAID' ? new Date() : null,
                failedAt: paymentStatus === 'FAILED' ? new Date() : null,
                failureReason,
              },
            }
          : {
              create: {
                userId: targetBooking.learnerId,
                amount: targetBooking.totalAmount,
                currency: targetBooking.currency || 'AUD',
                status: paymentStatus,
                stripeCustomerId: booking.learner.stripeCustomerId,
                stripePaymentMethodId: selectedPaymentMethodId,
                stripePaymentIntentId: paymentIntent?.id || null,
                processedAt: new Date(),
                paidAt: paymentStatus === 'PAID' ? new Date() : null,
                failedAt: paymentStatus === 'FAILED' ? new Date() : null,
                failureReason,
                description: `${targetBooking.subject} session payment`,
              },
            },
        statusHistory: { create: { status: 'ACCEPTED' } },
      },
      include: bookingInclude,
    });

    updatedBookings.push(updatedBooking);
  }

  const updated = updatedBookings.find((item) => item.id === booking.id) || updatedBookings[0];
  const isSeriesAction = updatedBookings.length > 1;
  const paidCount = updatedBookings.filter((item) => isPaidPaymentStatus(item.payment?.status)).length;
  const failedCount = updatedBookings.filter((item) => item.payment?.status === 'FAILED').length;

  await notify(
    booking.learnerId,
    'booking',
    isSeriesAction ? 'Recurring Booking Accepted' : 'Booking Accepted',
    failedCount > 0
      ? isSeriesAction
        ? `${updatedBookings.length} sessions were accepted. ${failedCount} payment${failedCount === 1 ? '' : 's'} failed.`
        : 'Your booking was accepted, but the payment could not be completed. Please update your payment method.'
      : paidCount === updatedBookings.length
        ? isSeriesAction
          ? `${updatedBookings.length} sessions in your recurring booking series have been accepted and charged.`
          : 'Your booking was accepted and payment has been confirmed.'
        : isSeriesAction
          ? `${updatedBookings.length} sessions in your recurring booking series have been accepted and payment is processing.`
          : 'Your booking was accepted and payment is now being processed.',
    `/bookings/${updated.id}`
  );

  if (failedCount > 0) {
    await notify(
      booking.learnerId,
      'payment',
      'Payment Failed',
      isSeriesAction
        ? `${failedCount} session payment${failedCount === 1 ? '' : 's'} failed. Please update your payment method and try again.`
        : 'Please update your payment method and try again.',
      `/bookings/${updated.id}/payment?returnTo=${encodeURIComponent(`/bookings/${updated.id}`)}`
    );
  }

  res.json({
    success: true,
    message: failedCount > 0
      ? isSeriesAction
        ? `${updatedBookings.length} recurring booking sessions accepted, but ${failedCount} payment${failedCount === 1 ? '' : 's'} failed`
        : 'Booking accepted, but payment failed'
      : paidCount === updatedBookings.length
        ? isSeriesAction
          ? `${updatedBookings.length} recurring booking sessions accepted and payment confirmed`
          : 'Booking accepted and payment confirmed'
        : isSeriesAction
          ? `${updatedBookings.length} recurring booking sessions accepted and payment is processing`
          : 'Booking accepted and payment is processing',
    data: updated,
    affectedCount: updatedBookings.length,
    seriesBookings: updatedBookings,
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

  const targetBookings = await getActionableSeriesBookings(booking, tutorProfile.id);
  if (!targetBookings.length) {
    throw new AppError('No pending bookings found for this series', 400);
  }

  const updatedBookings = await prisma.$transaction(targetBookings.map((targetBooking) =>
    prisma.booking.update({
      where: { id: targetBooking.id },
      data: {
        status: 'DECLINED',
        declineReason: reason,
        ...(isPaidPaymentStatus(targetBooking?.payment?.status)
          ? {
              payment: {
                update: {
                  status: 'REFUNDED',
                  refundAmount: targetBooking.payment.amount,
                  refundedAt: new Date(),
                },
              },
            }
          : {}),
        statusHistory: { create: { status: 'DECLINED', reason } },
      },
      include: bookingInclude,
    })
  ));
  const updated = updatedBookings.find((item) => item.id === booking.id) || updatedBookings[0];
  const isSeriesAction = updatedBookings.length > 1;

  res.json({
    success: true,
    message: isSeriesAction
      ? `${updatedBookings.length} recurring booking sessions declined`
      : isPaidPaymentStatus(booking?.payment?.status)
        ? 'Booking declined and payment refunded'
        : 'Booking declined',
    data: updated,
    affectedCount: updatedBookings.length,
    seriesBookings: updatedBookings,
  });

  await notify(
    booking.learnerId,
    'booking',
    isSeriesAction ? 'Recurring Booking Declined' : 'Booking Declined',
    isSeriesAction
      ? `${updatedBookings.length} sessions in your recurring booking series have been declined.`
      : 'A booking has been declined.',
    `/bookings/${updated.id}`
  );
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
  throw new AppError('Manual payment is no longer required. Save a payment method and wait for tutor approval.', 400);
};
