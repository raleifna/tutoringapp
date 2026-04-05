const { prisma } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

const weekdayMap = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

const normalizeDayOfWeek = (value) => {
  if (typeof value === 'number' && value >= 0 && value <= 6) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim().toUpperCase();
    if (trimmed !== '' && Number.isInteger(Number(trimmed))) {
      const num = Number(trimmed);
      if (num >= 0 && num <= 6) return num;
    }
    if (trimmed in weekdayMap) return weekdayMap[trimmed];
  }
  throw new AppError('Invalid day of week', 400);
};

const normalizeSubjectLevel = (value) => {
  if (!value) return 'all';

  const normalized = String(value).trim().toUpperCase();
  const levelMap = {
    BEGINNER: 'beginner',
    INTERMEDIATE: 'intermediate',
    ADVANCED: 'advanced',
    ALL: 'all',
    ALL_LEVELS: 'all',
  };

  return levelMap[normalized] || String(value).trim().toLowerCase();
};

const tutorProfileSelect = {
  id: true,
  userId: true,
  status: true,
  headline: true,
  hourlyRate: true,
  currency: true,
  yearsExperience: true,
  education: true,
  certifications: true,
  languages: true,
  sessionTypes: true,
  location: true,
  rating: true,
  totalSessions: true,
  isVerified: true,
  responseTime: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatar: true,
      bio: true,
      createdAt: true,
    },
  },
  subjects: {
    include: { subject: true },
  },
  availability: true,
};

const REVIEW_ACTIONS = ['TUTOR_PROFILE_RETURNED', 'TUTOR_REJECTED', 'TUTOR_APPROVED'];

const ensureTutorProfileEditable = (profile) => {
  if (!profile) throw new AppError('Tutor profile not found', 404);
  if (profile.status !== 'ACTIVE') {
    throw new AppError(
      'Your tutor application is still under admin review. You can edit your public profile after approval.',
      403
    );
  }
};

const toReviewItems = (value) =>
  typeof value === 'string'
    ? value
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => ({ text: item }))
    : [];

const toUploadedFileItems = (files = []) =>
  files.map((file) => ({
    kind: 'file',
    originalName: file.originalname,
    fileName: file.filename,
    url: `/uploads/documents/${file.filename}`,
    mimeType: file.mimetype,
    size: file.size,
    uploadedAt: new Date().toISOString(),
  }));

const getApplicationFileItems = (items) =>
  Array.isArray(items) ? items.filter((item) => item && typeof item === 'object' && item.url) : [];

const getLatestReviewAction = (userId) =>
  prisma.adminAction.findFirst({
    where: {
      targetUserId: userId,
      action: { in: REVIEW_ACTIONS },
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

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const take = parseInt(limit, 10);

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
    ...(experience && { yearsExperience: { gte: parseInt(experience, 10) } }),
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

  const orderBy =
    {
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
        page: parseInt(page, 10),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    },
  });
};

exports.getTutorProfile = async (req, res) => {
  const tutor = await prisma.tutorProfile.findFirst({
    where: {
      OR: [{ id: req.params.id }, { userId: req.params.id }],
      status: 'ACTIVE',
    },
    select: tutorProfileSelect,
  });

  if (!tutor) throw new AppError('Tutor not found', 404);

  res.json({ success: true, data: tutor });
};

exports.getMyProfile = async (req, res) => {
  const [profile, latestReviewAction] = await Promise.all([
    prisma.tutorProfile.findUnique({
      where: { userId: req.user.id },
      select: tutorProfileSelect,
    }),
    getLatestReviewAction(req.user.id),
  ]);

  if (!profile) throw new AppError('Tutor profile not found', 404);
  res.json({ success: true, data: { ...profile, latestReviewAction } });
};

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

  // notify admin
  await notificationService.notifyAdmin('system', 'Tutor Application Resubmitted', `A tutor application has been resubmitted for review.`, `/admin/tutors?status=PENDING`);

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
      ...(yearsExperience !== undefined && { yearsExperience: parseInt(yearsExperience, 10) }),
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

exports.updateAvailability = async (req, res) => {
  const availability = Array.isArray(req.body) ? req.body : req.body.availability;

  const profile = await prisma.tutorProfile.findUnique({
    where: { userId: req.user.id },
  });
  ensureTutorProfileEditable(profile);

  await prisma.tutorAvailability.deleteMany({ where: { tutorId: profile.id } });

  if (availability && availability.length > 0) {
    await prisma.tutorAvailability.createMany({
      data: availability.map((a) => ({
        tutorId: profile.id,
        dayOfWeek: normalizeDayOfWeek(a.dayOfWeek),
        startTime: a.startTime,
        endTime: a.endTime,
        timezone: a.timezone || 'UTC',
      })),
    });
  }

  const updated = await prisma.tutorAvailability.findMany({ where: { tutorId: profile.id } });
  res.json({ success: true, data: updated });
};

exports.getTutorAvailability = async (req, res) => {
  const profile = await prisma.tutorProfile.findFirst({
    where: { OR: [{ id: req.params.id }, { userId: req.params.id }] },
    include: { availability: true },
  });
  if (!profile) throw new AppError('Tutor not found', 404);
  res.json({ success: true, data: profile.availability });
};

exports.addSubject = async (req, res) => {
  const { subjectId, level, description } = req.body;

  const profile = await prisma.tutorProfile.findUnique({ where: { userId: req.user.id } });
  ensureTutorProfileEditable(profile);

  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!subject) throw new AppError('Subject not found', 404);

  const tutorSubject = await prisma.tutorSubject.upsert({
    where: { tutorId_subjectId: { tutorId: profile.id, subjectId } },
    update: { level: normalizeSubjectLevel(level), description },
    create: {
      tutorId: profile.id,
      subjectId,
      level: normalizeSubjectLevel(level),
      description,
    },
    include: { subject: true },
  });

  res.json({ success: true, data: tutorSubject });
};

exports.removeSubject = async (req, res) => {
  const profile = await prisma.tutorProfile.findUnique({ where: { userId: req.user.id } });
  ensureTutorProfileEditable(profile);

  await prisma.tutorSubject.deleteMany({
    where: { tutorId: profile.id, subjectId: req.params.subjectId },
  });

  res.json({ success: true, message: 'Subject removed' });
};
