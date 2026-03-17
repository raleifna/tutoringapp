// src/controllers/bookingController.js - Booking Management Controller
const { prisma } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

const bookingInclude = {
  learner: {
    select: { id: true, firstName: true, lastName: true, avatar: true, email: true },
  },
  tutorProfile: {
    include: {
      user: { select: { id: true, firstName: true, lastName: true, avatar: true, email: true } },
    },
  },
  statusHistory: { orderBy: { createdAt: 'desc' } },
};

// ==================== CREATE BOOKING ====================
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

  const durationHours = duration / 60;
  const rate = hourlyRate || parseFloat(tutorProfile.hourlyRate);
  const totalAmount = rate * durationHours;

  const booking = await prisma.booking.create({
    data: {
      learnerId: req.user.id,
      tutorId: tutorProfile.id,
      subject: bookingSubject,
      scheduledAt: new Date(scheduledAt),
      duration,
      sessionType: sessionType || 'ONLINE',
      hourlyRate: rate,
      totalAmount,
      notes,
      status: 'PENDING',
      recurringType: recurringType || 'ONE_OFF',
      meetingTool: meetingTool || tutorProfile.preferredMeetingTool || null,
      statusHistory: {
        create: { status: 'PENDING' },
      },
    },
    include: bookingInclude,
  });

  res.status(201).json({
    success: true,
    message: 'Booking request sent successfully',
    data: booking,
  });
};

