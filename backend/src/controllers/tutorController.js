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

exports.updateApplication = async (req, res) => {
  const profile = await prisma.tutorProfile.findUnique({
    where: { userId: req.user.id },
    select: {
      ...tutorProfileSelect,
      certifications: true,
    },
  });

  if (!profile) throw new AppError('Tutor profile not found', 404);
  if (profile.status === 'ACTIVE') {
    throw new AppError(
      'Approved tutors should update their public profile instead of re-submitting verification materials',
      400
    );
  }

  const { tutorEducationSummary, tutorExperienceYears, tutorSupportingNotes } = req.body;

  if (!tutorEducationSummary || !tutorEducationSummary.trim()) {
    throw new AppError('Education summary is required', 400);
  }

  const uploadedFiles = toUploadedFileItems(req.files || []);
  const nextFileItems =
    uploadedFiles.length > 0 ? uploadedFiles : getApplicationFileItems(profile.certifications);

  if (nextFileItems.length === 0) {
    throw new AppError('Upload at least one verification file before resubmitting', 400);
  }

  const updated = await prisma.tutorProfile.update({
    where: { userId: req.user.id },
    data: {
      yearsExperience:
        tutorExperienceYears === undefined || tutorExperienceYears === ''
          ? profile.yearsExperience
          : parseInt(tutorExperienceYears, 10) || 0,
      education: toReviewItems(tutorEducationSummary),
      certifications: [
        ...nextFileItems,
        ...toReviewItems(tutorSupportingNotes).map((item) => ({ ...item, kind: 'note' })),
      ],
      status: 'PENDING',
      isVerified: false,
      verifiedAt: null,
    },
    select: tutorProfileSelect,
  });

  const latestReviewAction = await getLatestReviewAction(req.user.id);

  res.json({
    success: true,
    message: 'Verification materials resubmitted for admin review',
    data: { ...updated, latestReviewAction },
  });
};

exports.updateProfile = async (req, res) => {
  const profile = await prisma.tutorProfile.findUnique({
    where: { userId: req.user.id },
  });
  ensureTutorProfileEditable(profile);

  const {
    headline,
    hourlyRate,
    currency,
    yearsExperience,
    education,
    certifications,
    languages,
    sessionTypes,
    location,
  } = req.body;

  // Update user bio too if provided
  if (req.body.bio) {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { bio: req.body.bio },
    });
  }

  const updated = await prisma.tutorProfile.update({
    where: { userId: req.user.id },
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
    select: tutorProfileSelect,
  });

  res.json({ success: true, message: 'Profile updated', data: updated });
};

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