const { prisma } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

const parsePagination = (page = 1, limit = 10) => {
  const parsedPage = Math.max(Number.parseInt(page, 10) || 1, 1);
  const parsedLimit = Math.max(Number.parseInt(limit, 10) || 10, 1);

  return {
    page: parsedPage,
    limit: parsedLimit,
    skip: (parsedPage - 1) * parsedLimit,
  };
};

const reviewInclude = {
  learner: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatar: true,
    },
  },
  tutorProfile: {
    select: {
      id: true,
      rating: true,
      totalReviews: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      },
    },
  },
  booking: {
    select: {
      id: true,
      subject: true,
      scheduledAt: true,
      duration: true,
      status: true,
      learnerId: true,
      tutorId: true,
    },
  },
};

const canViewTutorProfileReviews = (tutorProfile, user) => {
  if (!tutorProfile) return false;
  if (tutorProfile.status === 'ACTIVE') return true;
  if (!user) return false;
  if (user.role === 'ADMIN' || user.role === 'SYSTEM_ADMIN') return true;
  return tutorProfile.userId === user.id;
};

const recalculateTutorReviewSummary = async (tutorProfileId) => {
  const aggregate = await prisma.review.aggregate({
    where: { tutorProfileId },
    _avg: { rating: true },
    _count: { id: true },
  });

  await prisma.tutorProfile.update({
    where: { id: tutorProfileId },
    data: {
      rating: aggregate._avg.rating || 0,
      totalReviews: aggregate._count.id || 0,
    },
  });
};

exports.getTutorReviews = async (req, res) => {
  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      userId: true,
      status: true,
      rating: true,
      totalReviews: true,
    },
  });

  if (!tutorProfile || !canViewTutorProfileReviews(tutorProfile, req.user)) {
    throw new AppError('Tutor not found', 404);
  }

  const pagination = parsePagination(req.query.page, req.query.limit || 10);

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: { tutorProfileId: tutorProfile.id },
      include: reviewInclude,
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.review.count({ where: { tutorProfileId: tutorProfile.id } }),
  ]);

  res.json({
    success: true,
    data: {
      reviews,
      summary: {
        rating: tutorProfile.rating,
        totalReviews: tutorProfile.totalReviews,
      },
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    },
  });
};

exports.createReview = async (req, res) => {
  const { bookingId, rating, comment } = req.body;
  const learnerId = req.user.id;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      learnerId: true,
      tutorId: true,
      status: true,
      subject: true,
      review: {
        select: { id: true },
      },
    },
  });

  if (!booking) throw new AppError('Booking not found', 404);
  if (booking.learnerId !== learnerId) throw new AppError('You can only review your own bookings', 403);
  if (booking.status !== 'COMPLETED') {
    throw new AppError('You can only review a tutor after the booking is completed', 400);
  }
  if (booking.review) {
    throw new AppError('This booking has already been reviewed', 409);
  }

  const review = await prisma.review.create({
    data: {
      bookingId: booking.id,
      learnerId,
      tutorProfileId: booking.tutorId,
      rating,
      comment: comment?.trim() || null,
    },
    include: reviewInclude,
  });

  await recalculateTutorReviewSummary(booking.tutorId);

  res.status(201).json({
    success: true,
    message: 'Review submitted',
    data: review,
  });
};

exports.deleteReview = async (req, res) => {
  const review = await prisma.review.findUnique({
    where: { id: req.params.id },
    include: {
      booking: {
        select: {
          learnerId: true,
        },
      },
    },
  });

  if (!review) throw new AppError('Review not found', 404);

  const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SYSTEM_ADMIN';
  const isOwner = review.learnerId === req.user.id;

  if (!isAdmin && !isOwner) {
    throw new AppError('You can only delete your own review', 403);
  }

  await prisma.review.delete({ where: { id: review.id } });
  await recalculateTutorReviewSummary(review.tutorProfileId);

  res.json({
    success: true,
    message: 'Review deleted',
  });
};

exports.getAdminReviews = async (req, res) => {
  const pagination = parsePagination(req.query.page, req.query.limit || 12);
  const normalizedSearch = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const ratingFilter = Number.parseInt(req.query.rating, 10);

  const where = {
    ...(Number.isInteger(ratingFilter) && ratingFilter >= 1 && ratingFilter <= 5
      ? { rating: ratingFilter }
      : {}),
    ...(normalizedSearch
      ? {
          OR: [
            { comment: { contains: normalizedSearch, mode: 'insensitive' } },
            { learner: { firstName: { contains: normalizedSearch, mode: 'insensitive' } } },
            { learner: { lastName: { contains: normalizedSearch, mode: 'insensitive' } } },
            { tutorProfile: { user: { firstName: { contains: normalizedSearch, mode: 'insensitive' } } } },
            { tutorProfile: { user: { lastName: { contains: normalizedSearch, mode: 'insensitive' } } } },
            { booking: { subject: { contains: normalizedSearch, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: reviewInclude,
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.review.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      reviews,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    },
  });
};
