const { prisma } = require('../config/database');

const bookingInclude = {
  learner: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      avatar: true,
    },
  },
  tutorProfile: {
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
        },
      },
    },
  },
  statusHistory: {
    orderBy: {
      createdAt: 'desc',
    },
  },
};

async function createBooking(req, res) {
  const {
    tutorId,
    subject,
    scheduledAt,
    duration,
    sessionType,
    notes,
    hourlyRate,
    recurringType,
    meetingTool,
  } = req.body;

  if (!tutorId || !subject || !scheduledAt || !duration) {
    return res.status(400).json({
      success: false,
      message: 'tutorId, subject, scheduledAt and duration are required.',
    });
  }

  const tutorProfile = await prisma.tutorProfile.findFirst({
    where: {
      OR: [{ id: tutorId }, { userId: tutorId }],
      status: 'ACTIVE',
    },
    include: {
      user: true,
    },
  });

  if (!tutorProfile) {
    return res.status(404).json({
      success: false,
      message: 'Tutor not found.',
    });
  }

  if (tutorProfile.userId === req.user.id) {
    return res.status(400).json({
      success: false,
      message: 'You cannot book yourself.',
    });
  }

  const parsedDuration = parseInt(duration, 10);
  const rate = hourlyRate !== undefined ? parseFloat(hourlyRate) : parseFloat(tutorProfile.hourlyRate);
  const totalAmount = rate * (parsedDuration / 60);

  const booking = await prisma.booking.create({
    data: {
      learnerId: req.user.id,
      tutorId: tutorProfile.id,
      subject,
      scheduledAt: new Date(scheduledAt),
      duration: parsedDuration,
      sessionType: sessionType || 'ONLINE',
      notes,
      hourlyRate: rate,
      totalAmount,
      recurringType: recurringType || 'ONE_OFF',
      meetingTool: meetingTool || tutorProfile.preferredMeetingTool || null,
      status: 'PENDING',
      statusHistory: {
        create: {
          status: 'PENDING',
          reason: 'Booking created',
        },
      },
    },
    include: bookingInclude,
  });

  return res.status(201).json({
    success: true,
    message: 'Booking created successfully.',
    data: booking,
  });
}

async function getMyBookings(req, res) {
  let where = {};

  if (req.user.role === 'TUTOR') {
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!tutorProfile) {
      return res.status(404).json({
        success: false,
        message: 'Tutor profile not found.',
      });
    }

    where.tutorId = tutorProfile.id;
  } else {
    where.learnerId = req.user.id;
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: bookingInclude,
    orderBy: {
      scheduledAt: 'desc',
    },
  });

  return res.json({
    success: true,
    data: bookings,
  });
}

async function getBookingById(req, res) {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: bookingInclude,
  });

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found.',
    });
  }

  const isLearner = booking.learnerId === req.user.id;
  const isTutor = booking.tutorProfile.userId === req.user.id;

  if (!isLearner && !isTutor) {
    return res.status(403).json({
      success: false,
      message: 'You do not have access to this booking.',
    });
  }

  return res.json({
    success: true,
    data: booking,
  });
}

async function updateBookingStatus(req, res) {
  const { status, reason, proposedTime } = req.body;

  const allowedStatuses = ['ACCEPTED', 'DECLINED', 'CANCELLED', 'RESCHEDULED', 'COMPLETED'];

  if (!status || !allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status.',
    });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: {
      tutorProfile: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found.',
    });
  }

  const isLearner = booking.learnerId === req.user.id;
  const isTutor = booking.tutorProfile.userId === req.user.id;

  if (!isLearner && !isTutor) {
    return res.status(403).json({
      success: false,
      message: 'You do not have access to update this booking.',
    });
  }

  if (isLearner && status !== 'CANCELLED') {
    return res.status(403).json({
      success: false,
      message: 'Learners can only cancel bookings.',
    });
  }

  if (isTutor && !['ACCEPTED', 'DECLINED', 'RESCHEDULED', 'COMPLETED'].includes(status)) {
    return res.status(403).json({
      success: false,
      message: 'Tutors can only accept, decline, reschedule, or complete bookings.',
    });
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status,
      ...(status === 'DECLINED' ? { declineReason: reason || null } : {}),
      ...(status === 'CANCELLED' ? { cancellationReason: reason || null } : {}),
      ...(status === 'RESCHEDULED'
        ? {
          rescheduleNote: reason || null,
          proposedTime: proposedTime ? new Date(proposedTime) : null,
        }
        : {}),
      ...(status === 'COMPLETED' ? { completedAt: new Date() } : {}),
      statusHistory: {
        create: {
          status,
          reason: reason || null,
        },
      },
    },
    include: bookingInclude,
  });

  return res.json({
    success: true,
    message: 'Booking status updated.',
    data: updated,
  });
}

module.exports = {
  createBooking,
  getMyBookings,
  getBookingById,
  updateBookingStatus,
};
