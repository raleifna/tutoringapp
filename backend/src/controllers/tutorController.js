const { prisma } = require('../config/database');

async function searchTutors(req, res) {
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

  const pageNumber = parseInt(page, 10) || 1;
  const limitNumber = parseInt(limit, 10) || 12;
  const skip = (pageNumber - 1) * limitNumber;

  const where = {
    status: 'ACTIVE',
    ...(minRate || maxRate
      ? {
        hourlyRate: {
          ...(minRate ? { gte: parseFloat(minRate) } : {}),
          ...(maxRate ? { lte: parseFloat(maxRate) } : {}),
        },
      }
      : {}),
    ...(minRating ? { rating: { gte: parseFloat(minRating) } } : {}),
    ...(sessionType ? { sessionTypes: { has: sessionType } } : {}),
    ...(language ? { languages: { has: language } } : {}),
    ...(experience ? { yearsExperience: { gte: parseInt(experience, 10) } } : {}),
    ...(location
      ? {
        location: {
          contains: location,
          mode: 'insensitive',
        },
      }
      : {}),
    ...(subject
      ? {
        subjects: {
          some: {
            subject: {
              name: {
                contains: subject,
                mode: 'insensitive',
              },
            },
          },
        },
      }
      : {}),
    ...(category
      ? {
        subjects: {
          some: {
            subject: {
              category: {
                contains: category,
                mode: 'insensitive',
              },
            },
          },
        },
      }
      : {}),
  };

  const orderByMap = {
    rating: { rating: 'desc' },
    rate_asc: { hourlyRate: 'asc' },
    rate_desc: { hourlyRate: 'desc' },
    experience: { yearsExperience: 'desc' },
    sessions: { totalSessions: 'desc' },
  };

  const orderBy = orderByMap[sort] || { rating: 'desc' };

  const [tutors, total] = await Promise.all([
    prisma.tutorProfile.findMany({
      where,
      orderBy,
      skip,
      take: limitNumber,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            bio: true,
          },
        },
        subjects: {
          include: {
            subject: true,
          },
        },
      },
    }),
    prisma.tutorProfile.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      tutors,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber),
      },
    },
  });
}

async function getTutorProfile(req, res) {
  const tutorId = req.params.id;

  const tutor = await prisma.tutorProfile.findFirst({
    where: {
      OR: [{ id: tutorId }, { userId: tutorId }],
      status: 'ACTIVE',
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
          bio: true,
          preferredLang: true,
          timezone: true,
        },
      },
      subjects: {
        include: {
          subject: true,
        },
      },
      availability: true,
    },
  });

  if (!tutor) {
    return res.status(404).json({
      success: false,
      message: 'Tutor not found.',
    });
  }

  res.json({
    success: true,
    data: tutor,
  });
}

async function getTutorAvailability(req, res) {
  const tutorId = req.params.id;

  const tutor = await prisma.tutorProfile.findFirst({
    where: {
      OR: [{ id: tutorId }, { userId: tutorId }],
      status: 'ACTIVE',
    },
    include: {
      availability: true,
    },
  });

  if (!tutor) {
    return res.status(404).json({
      success: false,
      message: 'Tutor not found.',
    });
  }

  res.json({
    success: true,
    data: tutor.availability,
  });
}


const getLatestReviewAction = (userId) =>
  prisma.adminAction.findFirst({
    where: {
      targetUserId: userId,
      action: { in: ['TUTOR_PROFILE_RETURNED', 'TUTOR_REJECTED', 'TUTOR_APPROVED'] },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      action: true,
      description: true,
      createdAt: true,
      admin: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });


async function getMyProfile(req, res) {
  let userId = req.user.id;
  if (!userId) {
    return res.status(400).json({
      success: false,
      message: 'User ID is required.',
    });
  }

  let profile = await prisma.tutorProfile.findUnique({
      where: { userId: userId },
    });
  let latestReviewAction = await getLatestReviewAction(userId);

  if (!profile) {
    return res.status(404).json({
      success: false,
      message: 'Profile not found.',
    });
  }
  res.json({ 
    success: true, 
    data: { ...profile, latestReviewAction } 
  });
};

async function updateProfile(req, res) {
  let userId = req.user?.id;
  let {
    headline,
    hourlyRate,
    currency,
    yearsExperience,
    education,
    certifications,
    languages,
    sessionTypes,
    location,
    bio
  } = req.body;
  if (!userId) {
    return res.status(400).json({
      success: false,
      message: 'User ID is required.',
    });
  }

  let profile = await prisma.tutorProfile.findUnique({
    where: { userId: userId },
  });
  if (!profile || profile.status !== 'ACTIVE') {
    return res.status(403).json({
      success: false,
      message: 'Not profile or no permission.',
    });
  }

  // Update user bio
  if (bio) {
    await prisma.user.update({
      where: { id: userId },
      data: { bio },
    });
  }

  const newProfile = await prisma.tutorProfile.update({
    where: { userId: userId },
    data: {
      ...(headline !== undefined && { headline }),
      ...(hourlyRate !== undefined && { hourlyRate: parseFloat(hourlyRate) }),
      ...(currency && { currency }),
      ...(yearsExperience !== undefined && { yearsExperience: parseInt(yearsExperience) }),
      ...(education && { education }),
      ...(certifications && { certifications }),
      ...(languages && { languages }),
      ...(sessionTypes && { sessionTypes }),
      ...(location !== undefined && { location }),
    },
  });

  res.json({ 
    success: true, message: 'Profile updated', 
    data: newProfile
  });
};





module.exports = {
  searchTutors,
  getTutorProfile,
  getTutorAvailability,
  getMyProfile,
  updateProfile,
};
