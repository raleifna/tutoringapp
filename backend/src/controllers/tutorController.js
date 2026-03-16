import { errorHandler } from "../middleware/errorHandler";

exports.searchTutors = async (req, res) => {
  const {
    subject,
    category,
    location,
    minRate,
    maxRate,
    minRating,
    sessionType,
    language,
    experience,
    sort = 'rating',
    page = 1,
    limit = 12,
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = {
    status: 'ACTIVE',
    ...(minRate || maxRate
      ? {
          hourlyRate: {
            ...(minRate && { gte: parseFloat(minRate) }),
            ...(maxRate && { lte: parseFloat(maxRate) }),
          },
        }
      : {}),
    ...(minRating && { rating: { gte: parseFloat(minRating) } }),
    ...(sessionType && { sessionTypes: { has: sessionType } }),
    ...(language && { languages: { has: language } }),
    ...(experience && { yearsExperience: { gte: parseInt(experience) } }),
    ...(location && {
      location: { contains: location, mode: 'insensitive' },
    }),
    ...(subject && {
      subjects: {
        some: {
          subject: { name: { contains: subject, mode: 'insensitive' } },
        },
      },
    }),
    ...(category && {
      subjects: {
        some: {
          subject: { category: { contains: category, mode: 'insensitive' } },
        },
      },
    }),
  };

  const orderBy = {
    rating: { rating: 'desc' },
    rate_asc: { hourlyRate: 'asc' },
    rate_desc: { hourlyRate: 'desc' },
    experience: { yearsExperience: 'desc' },
    sessions: { totalSessions: 'desc' },
  }[sort] || { rating: 'desc' };

  const [tutors, total] = await Promise.all([
    prisma.tutorProfile.findMany({
      where,
      select: tutorProfileSelect,
      orderBy,
      skip,
      take,
    }),
    prisma.tutorProfile.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      tutors,
      pagination: {
        page: parseInt(page),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    },
  });
};

exports.getTutorProfile = async (req, res) => {
  let userId = req.params.id;
  let tutor = await prisma.tutorProfile.findFirst({
    where: {
      userId: userId,
      status: 'ACTIVE',
    }
  });

  if (!tutor) {
    return res.status(400).json({
            success: false,
            message: 'Tutor not found',
        });
  }

  res.json({ success: true, data: tutor });
}

exports.getMyProfile = async (req, res) => {}

exports.updateApplication = async (req, res) => {}

exports.updateProfile = async (req, res) => {}

exports.updateAvailability = async (req, res) => {}

exports.getTutorAvailability = async (req, res) => {
  let userId = req.params.id;
  const profile = await prisma.tutorProfile.findFirst({
    where: { userId: userId },
    include: { availability: true },
  });

  if (!profile) {
    return res.status(400).json({
            success: false,
            message: 'Tutor not found',
        });
  }
  res.json({ success: true, data: profile.availability });
}

exports.addSubject = async (req, res) => {}

exports.removeSubject = async (req, res) => {}