const { prisma } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const notificationService = require('../services/notificationService');

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
      notes,
      status: 'UNPAID',
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
        create: { status: 'UNPAID' },
      },
    },
    include: bookingInclude,
  });

  // notify tutor
  await notificationService.notify(tutorProfile.userId, 'booking', 'New Booking Request', `Please handle a booking request.`, `/bookings/${booking.id}`);

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
        payment: {
          is: {
            status: 'COMPLETED',
          },
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
    (booking?.payment?.status === 'COMPLETED' ||
      (booking?.status === 'CANCELLED' &&
        booking?.statusHistory?.some((entry) => entry.status === 'ACCEPTED')));
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

  // if is learner,booking is accepted, can't cancel within 24 hours of scheduled time
  const now = new Date();
  const scheduledTime = new Date(booking.scheduledAt);
  const hoursUntilSession = (scheduledTime - now) / (1000 * 60 * 60);
  const isPaidBooking = booking?.payment?.status === 'COMPLETED';
  if (isLearner && isPaidBooking && hoursUntilSession < 24) {
    throw new AppError('Cannot cancel a paid booking within 24 hours of the session', 400);
  }

  const updated = await prisma.booking.update({
    where: { id: req.params.id },
    data: {
      status: 'CANCELLED',
      cancellationReason: reason,
      ...(booking?.payment?.status === 'COMPLETED'
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
  await notificationService.notify(booking.tutorProfile.userId, 'booking', 'Booking Cancelled', `A booking has been cancelled.`, `/bookings/${updated.id}`);

  res.json({
    success: true,
    message:
      booking?.payment?.status === 'COMPLETED'
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
    include: { payment: true },
  });
  if (!booking || booking.tutorId !== tutorProfile.id) throw new AppError('Booking not found', 404);
  if (booking.status !== 'PENDING') throw new AppError('Booking is not pending', 400);
  if (!booking.payment || booking.payment.status !== 'COMPLETED') {
    throw new AppError('Booking must be paid before it can be accepted', 400);
  }

  const updated = await prisma.booking.update({
    where: { id: req.params.id },
    data: {
      status: 'ACCEPTED',
      meetingLink,
      statusHistory: { create: { status: 'ACCEPTED' } },
    },
    include: bookingInclude,
  });

  // notify student
  await notificationService.notify(booking.learnerId, 'booking', 'Booking Accepted', `A booking has been accepted.`, `/bookings/${updated.id}`);

  res.json({ success: true, message: 'Booking accepted', data: updated });
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
      ...(booking?.payment?.status === 'COMPLETED'
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
  await notificationService.notify(booking.learnerId, 'booking', 'Booking Declined', `A booking has been declined.`, `/bookings/${updated.id}`);

  res.json({
    success: true,
    message:
      booking?.payment?.status === 'COMPLETED'
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
  await notificationService.notify(booking.learnerId, 'booking', 'Booking Rescheduled', `A booking has been rescheduled.`, `/bookings/${updated.id}`);

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
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: { payment: true },
  });

  if (!booking || booking.learnerId !== req.user.id) {
    throw new AppError('Booking not found', 404);
  }

  const payment =
    booking.payment ||
    (await prisma.payment.create({
      data: {
        userId: req.user.id,
        bookingId: booking.id,
        amount: booking.totalAmount,
        currency: booking.currency || 'AUD',
        status: 'PENDING',
        description: `${booking.subject} session booking payment`,
      },
    }));

  if (payment.status === 'COMPLETED') {
    throw new AppError('This booking has already been paid', 400);
  }

  const updated = await prisma.booking.update({
    where: { id: req.params.id },
    data: {
      status: booking.status === 'UNPAID' ? 'PENDING' : booking.status,
      payment: { update: { status: 'COMPLETED' } },
      ...(booking.status === 'UNPAID'
        ? {
            statusHistory: {
              create: { status: 'PENDING' },
            },
          }
        : {}),
    },
    include: bookingInclude,
  });

  res.json({
    success: true,
    message: booking.status === 'UNPAID' ? 'Payment completed and booking is now pending' : 'Mock payment completed',
    data: updated,
  });
};
