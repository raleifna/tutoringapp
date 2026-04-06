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

const formatHour = (hour) => `${String(hour).padStart(2, '0')}:00`;

const readHour = (value, { allow24 = false } = {}) => {
  const [rawHour, rawMinute] = String(value || '').trim().split(':');
  const hour = Number.parseInt(rawHour, 10);
  const minute = Number.parseInt(rawMinute, 10);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    minute !== 0 ||
    hour < 0 ||
    hour > (allow24 ? 24 : 23) ||
    (!allow24 && hour === 24)
  ) {
    throw new AppError('Availability time must use whole hours like 09:00 or 24:00', 400);
  }

  return hour;
};

const normalizeAvailabilitySlots = (availability) => {
  if (availability == null) return [];
  if (!Array.isArray(availability)) throw new AppError('Availability must be an array', 400);

  const normalized = availability
    .map((slot) => {
      const dayOfWeek = normalizeDayOfWeek(slot?.dayOfWeek);
      const startHour = readHour(slot?.startTime);
      const endHour = readHour(slot?.endTime, { allow24: true });

      if (endHour <= startHour) {
        throw new AppError('Availability end time must be after start time', 400);
      }

      return {
        dayOfWeek,
        startHour,
        endHour,
        timezone: slot?.timezone || 'UTC',
      };
    })
    .sort((left, right) => {
      if (left.dayOfWeek !== right.dayOfWeek) return left.dayOfWeek - right.dayOfWeek;
      if (left.startHour !== right.startHour) return left.startHour - right.startHour;
      return left.endHour - right.endHour;
    });

  return normalized.reduce((merged, slot) => {
    const previous = merged[merged.length - 1];

    if (
      previous &&
      previous.dayOfWeek === slot.dayOfWeek &&
      previous.timezone === slot.timezone &&
      slot.startHour <= previous.endHour
    ) {
      previous.endHour = Math.max(previous.endHour, slot.endHour);
      return merged;
    }

    merged.push({ ...slot });
    return merged;
  }, []).map((slot) => ({
    dayOfWeek: slot.dayOfWeek,
    startTime: formatHour(slot.startHour),
    endTime: formatHour(slot.endHour),
    timezone: slot.timezone,
  }));
};

const getCurrentWeekStart = (date = new Date()) => {
  const start = new Date(date);
  const dayOffset = (start.getDay() + 6) % 7;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - dayOffset);
  return start;
};

const availabilityOrderBy = [{ dayOfWeek: 'asc' }, { startTime: 'asc' }];

const serializeAvailabilitySlots = (slots = [], defaultTimezone) =>
  slots.map((slot) => ({
    dayOfWeek: slot.dayOfWeek,
    startTime: slot.startTime,
    endTime: slot.endTime,
    timezone: slot.timezone || defaultTimezone || 'UTC',
  }));

const getCurrentWeekAvailabilityOverride = (tutorId) =>
  prisma.tutorAvailabilityOverrideWeek.findUnique({
    where: {
      tutorId_weekStart: {
        tutorId,
        weekStart: getCurrentWeekStart(),
      },
    },
    include: {
      slots: {
        orderBy: availabilityOrderBy,
      },
    },
  });

const buildAvailabilityState = (baseAvailability = [], currentWeekOverride = null) => {
  const availability = serializeAvailabilitySlots(baseAvailability);
  const currentWeekAvailabilityOverride = currentWeekOverride
    ? serializeAvailabilitySlots(currentWeekOverride.slots, currentWeekOverride.timezone)
    : [];

  return {
    availability,
    currentWeekAvailabilityOverride,
    currentWeekEffectiveAvailability: currentWeekOverride
      ? currentWeekAvailabilityOverride
      : availability,
    hasCurrentWeekAvailabilityOverride: Boolean(currentWeekOverride),
  };
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
  availability: {
    orderBy: availabilityOrderBy,
  },
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

  const currentWeekOverride = await getCurrentWeekAvailabilityOverride(profile.id);

  res.json({
    success: true,
    data: {
      ...profile,
      ...buildAvailabilityState(profile.availability, currentWeekOverride),
      latestReviewAction,
    },
  });
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
  const normalizedAvailability = normalizeAvailabilitySlots(availability);

  const profile = await prisma.tutorProfile.findUnique({
    where: { userId: req.user.id },
  });
  ensureTutorProfileEditable(profile);

  await prisma.$transaction(async (tx) => {
    await tx.tutorAvailability.deleteMany({ where: { tutorId: profile.id } });

    if (normalizedAvailability.length > 0) {
      await tx.tutorAvailability.createMany({
        data: normalizedAvailability.map((slot) => ({
          tutorId: profile.id,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          timezone: slot.timezone,
        })),
      });
    }
  });

  const updated = await prisma.tutorAvailability.findMany({
    where: { tutorId: profile.id },
    orderBy: availabilityOrderBy,
  });
  res.json({ success: true, data: updated });
};

exports.updateCurrentWeekAvailability = async (req, res) => {
  const availability = Array.isArray(req.body) ? req.body : req.body.availability;
  const normalizedAvailability = normalizeAvailabilitySlots(availability);

  const profile = await prisma.tutorProfile.findUnique({
    where: { userId: req.user.id },
  });
  ensureTutorProfileEditable(profile);

  const weekStart = getCurrentWeekStart();

  const updated = await prisma.tutorAvailabilityOverrideWeek.upsert({
    where: {
      tutorId_weekStart: {
        tutorId: profile.id,
        weekStart,
      },
    },
    create: {
      tutorId: profile.id,
      weekStart,
      timezone: 'UTC',
      ...(normalizedAvailability.length > 0
        ? {
            slots: {
              create: normalizedAvailability.map((slot) => ({
                dayOfWeek: slot.dayOfWeek,
                startTime: slot.startTime,
                endTime: slot.endTime,
              })),
            },
          }
        : {}),
    },
    update: {
      timezone: 'UTC',
      slots: {
        deleteMany: {},
        ...(normalizedAvailability.length > 0
          ? {
              create: normalizedAvailability.map((slot) => ({
                dayOfWeek: slot.dayOfWeek,
                startTime: slot.startTime,
                endTime: slot.endTime,
              })),
            }
          : {}),
      },
    },
    include: {
      slots: {
        orderBy: availabilityOrderBy,
      },
    },
  });

  res.json({
    success: true,
    data: {
      currentWeekAvailabilityOverride: serializeAvailabilitySlots(updated.slots, updated.timezone),
      hasCurrentWeekAvailabilityOverride: true,
    },
  });
};

exports.clearCurrentWeekAvailability = async (req, res) => {
  const profile = await prisma.tutorProfile.findUnique({
    where: { userId: req.user.id },
  });
  ensureTutorProfileEditable(profile);

  await prisma.tutorAvailabilityOverrideWeek.deleteMany({
    where: {
      tutorId: profile.id,
      weekStart: getCurrentWeekStart(),
    },
  });

  res.json({
    success: true,
    message: 'Current week availability override cleared',
  });
};

exports.getTutorAvailability = async (req, res) => {
  const profile = await prisma.tutorProfile.findFirst({
    where: { OR: [{ id: req.params.id }, { userId: req.params.id }] },
    select: {
      id: true,
      availability: {
        orderBy: availabilityOrderBy,
      },
    },
  });
  if (!profile) throw new AppError('Tutor not found', 404);

  const currentWeekOverride = await getCurrentWeekAvailabilityOverride(profile.id);

  res.json({
    success: true,
    data: buildAvailabilityState(profile.availability, currentWeekOverride),
  });
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
