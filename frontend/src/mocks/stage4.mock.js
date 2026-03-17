// src/mocks/stage4.mock.js - Mock APIs for stage 4 pages (tutor private + profile)

const USERS_KEY = 'mock_auth_users_v1';
const SESSION_KEY = 'mock_auth_session_v1';
const BOOKINGS_KEY = 'mock_stage3_bookings_v1';
const TUTOR_PROFILES_KEY = 'mock_stage4_tutor_profiles_v1';
const TUTOR_USER_MAP_KEY = 'mock_stage4_tutor_user_map_v1';

const wait = (ms = 280) => new Promise((resolve) => setTimeout(resolve, ms));

const readJson = (key, fallback) => {
  if (typeof window === 'undefined') return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
};

const ok = (data = null, message = 'OK') => ({
  data: {
    message,
    data,
  },
});

const buildError = (message, status = 400) => ({
  response: {
    status,
    data: { message },
  },
});

const fail = (message, status = 400) => Promise.reject(buildError(message, status));

const clone = (value) => JSON.parse(JSON.stringify(value));

const normalize = (value = '') => String(value).trim().toLowerCase();

const parsePage = (value, fallback = 1) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 1) return fallback;
  return Math.floor(num);
};

const parseLimit = (value, fallback = 10) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 1) return fallback;
  return Math.floor(num);
};

const toPublicUser = (user) => {
  const { password, ...rest } = user || {};
  return rest;
};

const getUsers = () => readJson(USERS_KEY, []);

const writeUsers = (users) => writeJson(USERS_KEY, users);

const getSessionUser = () => {
  if (typeof window === 'undefined') return null;
  const session = readJson(SESSION_KEY, null);
  if (!session) return null;

  const accessToken = localStorage.getItem('accessToken');
  if (!accessToken || accessToken !== session.accessToken) return null;

  const users = getUsers();
  return users.find((item) => item.id === session.userId) || null;
};

const updateStoredCurrentUser = (nextUser) => {
  if (typeof window === 'undefined' || !nextUser) return;
  localStorage.setItem('user', JSON.stringify(toPublicUser(nextUser)));
};

const updateUserRecord = (userId, patch) => {
  const users = getUsers();
  const index = users.findIndex((item) => item.id === userId);
  if (index < 0) return null;
  users[index] = { ...users[index], ...patch };
  writeUsers(users);
  return users[index];
};

const SESSION_TYPES = ['ONLINE', 'IN_PERSON', 'HYBRID'];

const MOCK_SUBJECTS = [
  { id: 'subj_data_science', name: 'Data Science', category: 'Technology' },
  { id: 'subj_english', name: 'English', category: 'Languages' },
  { id: 'subj_ielts', name: 'IELTS Prep', category: 'Languages' },
  { id: 'subj_math', name: 'Mathematics', category: 'STEM' },
  { id: 'subj_physics', name: 'Physics', category: 'STEM' },
  { id: 'subj_programming', name: 'Programming', category: 'Technology' },
  { id: 'subj_science', name: 'Science', category: 'STEM' },
];

const findSubject = (subjectId) => {
  const match = MOCK_SUBJECTS.find((item) => String(item.id) === String(subjectId));
  return match || { id: subjectId, name: 'Unknown Subject', category: 'General' };
};

const SEED_TUTOR_PROFILES = [
  {
    id: 'mock_tutor_1',
    userId: 'mock_seed_tutor_user_1',
    user: {
      id: 'mock_seed_tutor_user_1',
      firstName: 'Emma',
      lastName: 'Wilson',
      email: 'emma.tutor@example.com',
      avatar: '',
    },
    status: 'ACTIVE',
    headline: 'Math and Physics Tutor',
    bio: 'I help high school and first-year uni students build confidence in STEM subjects.',
    hourlyRate: 65,
    currency: 'AUD',
    location: 'Sydney, NSW',
    sessionTypes: ['ONLINE', 'IN_PERSON'],
    yearsExperience: 6,
    education: ['BSc Physics, UNSW', 'MTeach Secondary Education, USYD'],
    languages: ['English'],
    availability: [
      { dayOfWeek: 1, startTime: '16:00', endTime: '19:00' },
      { dayOfWeek: 3, startTime: '17:00', endTime: '20:00' },
      { dayOfWeek: 6, startTime: '09:00', endTime: '12:00' },
    ],
    subjects: [
      {
        id: 'mock_tutor_subject_1',
        subjectId: 'subj_math',
        level: 'advanced',
        subject: findSubject('subj_math'),
      },
      {
        id: 'mock_tutor_subject_2',
        subjectId: 'subj_physics',
        level: 'intermediate',
        subject: findSubject('subj_physics'),
      },
    ],
    certifications: [
      {
        name: 'Working With Children Check',
        url: 'https://mock.local/files/mock_tutor_1_wwcc.pdf',
      },
      {
        text: 'Strong exam prep track record for Year 11-12 students.',
      },
    ],
    latestReviewAction: {
      action: 'APPROVED',
      feedback: 'Application approved',
      createdAt: new Date().toISOString(),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mock_tutor_2',
    userId: 'mock_seed_tutor_user_2',
    user: {
      id: 'mock_seed_tutor_user_2',
      firstName: 'Liam',
      lastName: 'Chen',
      email: 'liam.tutor@example.com',
      avatar: '',
    },
    status: 'ACTIVE',
    headline: 'Programming and Data Science Tutor',
    bio: 'I teach Python, JavaScript and data projects with practical examples.',
    hourlyRate: 72,
    currency: 'AUD',
    location: 'Melbourne, VIC',
    sessionTypes: ['ONLINE', 'HYBRID'],
    yearsExperience: 5,
    education: ['BEng Software Engineering, Monash'],
    languages: ['English', 'Mandarin'],
    availability: [
      { dayOfWeek: 2, startTime: '18:00', endTime: '21:00' },
      { dayOfWeek: 4, startTime: '18:00', endTime: '21:00' },
    ],
    subjects: [
      {
        id: 'mock_tutor_subject_3',
        subjectId: 'subj_programming',
        level: 'all',
        subject: findSubject('subj_programming'),
      },
      {
        id: 'mock_tutor_subject_4',
        subjectId: 'subj_data_science',
        level: 'intermediate',
        subject: findSubject('subj_data_science'),
      },
    ],
    certifications: [],
    latestReviewAction: {
      action: 'APPROVED',
      feedback: 'Application approved',
      createdAt: new Date().toISOString(),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mock_tutor_3',
    userId: 'mock_seed_tutor_user_3',
    user: {
      id: 'mock_seed_tutor_user_3',
      firstName: 'Sophie',
      lastName: 'Brown',
      email: 'sophie.tutor@example.com',
      avatar: '',
    },
    status: 'ACTIVE',
    headline: 'English and IELTS Coach',
    bio: 'I focus on writing structure, speaking fluency and exam confidence.',
    hourlyRate: 58,
    currency: 'AUD',
    location: 'Brisbane, QLD',
    sessionTypes: ['ONLINE', 'IN_PERSON', 'HYBRID'],
    yearsExperience: 8,
    education: ['BA Linguistics, UQ'],
    languages: ['English'],
    availability: [{ dayOfWeek: 5, startTime: '14:00', endTime: '18:00' }],
    subjects: [
      {
        id: 'mock_tutor_subject_5',
        subjectId: 'subj_english',
        level: 'all',
        subject: findSubject('subj_english'),
      },
      {
        id: 'mock_tutor_subject_6',
        subjectId: 'subj_ielts',
        level: 'advanced',
        subject: findSubject('subj_ielts'),
      },
    ],
    certifications: [],
    latestReviewAction: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mock_tutor_4',
    userId: 'mock_seed_tutor_user_4',
    user: {
      id: 'mock_seed_tutor_user_4',
      firstName: 'Noah',
      lastName: 'Patel',
      email: 'noah.tutor@example.com',
      avatar: '',
    },
    status: 'PENDING',
    headline: 'General Science Tutor',
    bio: 'Friendly support for school science and problem-solving skills.',
    hourlyRate: 52,
    currency: 'AUD',
    location: 'Perth, WA',
    sessionTypes: ['ONLINE'],
    yearsExperience: 3,
    education: ['BSc Chemistry, UWA'],
    languages: ['English', 'Hindi'],
    availability: [{ dayOfWeek: 6, startTime: '11:00', endTime: '15:00' }],
    subjects: [
      {
        id: 'mock_tutor_subject_7',
        subjectId: 'subj_science',
        level: 'intermediate',
        subject: findSubject('subj_science'),
      },
    ],
    certifications: [],
    latestReviewAction: {
      action: 'RETURNED',
      feedback: 'Please provide clearer identity documentation.',
      createdAt: new Date().toISOString(),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const ensureTutorProfiles = () => {
  const current = readJson(TUTOR_PROFILES_KEY, null);
  if (Array.isArray(current) && current.length > 0) return current;
  const seeded = clone(SEED_TUTOR_PROFILES);
  writeJson(TUTOR_PROFILES_KEY, seeded);
  return seeded;
};

const writeTutorProfiles = (profiles) => writeJson(TUTOR_PROFILES_KEY, profiles);

const ensureTutorUserMap = () => {
  const current = readJson(TUTOR_USER_MAP_KEY, null);
  if (current && typeof current === 'object') return current;
  const seeded = {};
  writeJson(TUTOR_USER_MAP_KEY, seeded);
  return seeded;
};

const createEmptyTutorProfile = (user) => ({
  id: `mock_tutor_${Date.now()}`,
  userId: user.id,
  user: {
    id: user.id,
    firstName: user.firstName || 'Tutor',
    lastName: user.lastName || '',
    email: user.email || '',
    avatar: user.avatar || '',
  },
  // New tutor starts with editable empty profile in mock flow.
  status: 'ACTIVE',
  headline: '',
  bio: '',
  hourlyRate: 50,
  currency: 'AUD',
  location: '',
  sessionTypes: ['ONLINE'],
  yearsExperience: 0,
  education: [],
  languages: [],
  availability: [],
  subjects: [],
  certifications: [],
  latestReviewAction: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const ensureTutorProfileForUser = (user) => {
  if (!user) throw buildError('Unauthorized', 401);
  if (user.role !== 'TUTOR') throw buildError('Tutor access required', 403);

  const profiles = ensureTutorProfiles();
  const map = ensureTutorUserMap();

  let profileId = user.tutorProfileId || map[user.id];
  let profile = profiles.find((item) => item.id === profileId);

  const isLegacySeedBinding =
    !!profile &&
    String(user.id || '').startsWith('mock_user_') &&
    /^mock_tutor_[1-4]$/.test(String(profile.id || ''));

  if (isLegacySeedBinding) {
    const migrated = createEmptyTutorProfile(user);
    profiles.push(migrated);
    writeTutorProfiles(profiles);
    profile = migrated;
    profileId = migrated.id;
    map[user.id] = profileId;
    writeJson(TUTOR_USER_MAP_KEY, map);
  }

  if (!profile) {
    profile = createEmptyTutorProfile(user);
    profileId = profile.id;
    profiles.push(profile);
    writeTutorProfiles(profiles);
    map[user.id] = profileId;
    writeJson(TUTOR_USER_MAP_KEY, map);
  }

  profile.userId = user.id;
  profile.user = {
    ...(profile.user || {}),
    id: user.id,
    firstName: user.firstName || profile.user?.firstName || 'Tutor',
    lastName: user.lastName || profile.user?.lastName || '',
    email: user.email || profile.user?.email || '',
    avatar: user.avatar || profile.user?.avatar || '',
  };
  profile.updatedAt = new Date().toISOString();

  writeTutorProfiles(profiles);

  const nextUser = updateUserRecord(user.id, {
    tutorProfileId: profileId,
    tutorProfile: { id: profileId, status: profile.status },
  });
  updateStoredCurrentUser(nextUser || user);

  return clone(profile);
};

const readBookings = () => readJson(BOOKINGS_KEY, []);

const writeBookings = (bookings) => writeJson(BOOKINGS_KEY, bookings);

const buildSeedBookings = () => {
  const now = Date.now();
  return [
    {
      id: `mock_booking_seed_${now}_1`,
      learnerId: 'mock_seed_learner_1',
      learner: {
        id: 'mock_seed_learner_1',
        firstName: 'Ava',
        lastName: 'Martin',
        email: 'ava.learner@example.com',
        avatar: '',
      },
      tutorId: 'mock_tutor_1',
      subjectId: 'subj_math',
      subject: 'Mathematics',
      sessionType: 'ONLINE',
      scheduledAt: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
      duration: 60,
      notes: 'Need help with calculus homework.',
      status: 'PENDING',
      currency: 'AUD',
      hourlyRate: 65,
      totalAmount: 65,
      createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: `mock_booking_seed_${now}_2`,
      learnerId: 'mock_seed_learner_2',
      learner: {
        id: 'mock_seed_learner_2',
        firstName: 'Ethan',
        lastName: 'Ng',
        email: 'ethan.learner@example.com',
        avatar: '',
      },
      tutorId: 'mock_tutor_1',
      subjectId: 'subj_physics',
      subject: 'Physics',
      sessionType: 'IN_PERSON',
      scheduledAt: new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString(),
      duration: 90,
      notes: 'Focus on mechanics and vectors.',
      status: 'ACCEPTED',
      currency: 'AUD',
      hourlyRate: 65,
      totalAmount: 97.5,
      createdAt: new Date(now - 10 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now - 9 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: `mock_booking_seed_${now}_3`,
      learnerId: 'mock_seed_learner_3',
      learner: {
        id: 'mock_seed_learner_3',
        firstName: 'Mia',
        lastName: 'Lopez',
        email: 'mia.learner@example.com',
        avatar: '',
      },
      tutorId: 'mock_tutor_2',
      subjectId: 'subj_programming',
      subject: 'Programming',
      sessionType: 'ONLINE',
      scheduledAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
      duration: 60,
      notes: 'Intro to JavaScript functions.',
      status: 'COMPLETED',
      currency: 'AUD',
      hourlyRate: 72,
      totalAmount: 72,
      createdAt: new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
};

const ensureBookings = () => {
  const current = readBookings();
  if (Array.isArray(current) && current.length > 0) return current;
  const seeded = buildSeedBookings();
  writeBookings(seeded);
  return seeded;
};

const enrichBooking = (booking) => {
  const item = clone(booking);
  const users = getUsers();

  if (!item.learner) {
    const learner = users.find((user) => user.id === item.learnerId);
    if (learner) {
      item.learner = {
        id: learner.id,
        firstName: learner.firstName,
        lastName: learner.lastName,
        email: learner.email,
        avatar: learner.avatar || '',
      };
    } else {
      item.learner = {
        id: item.learnerId || '',
        firstName: 'Learner',
        lastName: '',
        email: '',
        avatar: '',
      };
    }
  }

  if (!item.tutorProfile) {
    const profiles = ensureTutorProfiles();
    const tutorProfile = profiles.find((profile) => profile.id === item.tutorId);
    if (tutorProfile) {
      item.tutorProfile = {
        id: tutorProfile.id,
        user: {
          id: tutorProfile.user?.id || tutorProfile.userId || '',
          firstName: tutorProfile.user?.firstName || 'Tutor',
          lastName: tutorProfile.user?.lastName || '',
          email: tutorProfile.user?.email || '',
          avatar: tutorProfile.user?.avatar || '',
        },
      };
    }
  }

  return item;
};

const sortBookings = (bookings) =>
  [...bookings].sort((a, b) => {
    const aTime = new Date(a.scheduledAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.scheduledAt || b.createdAt || 0).getTime();
    return bTime - aTime;
  });

const mutateTutorBooking = async (id, updater) => {
  await wait(220);
  const sessionUser = getSessionUser();
  if (!sessionUser) return fail('Unauthorized', 401);
  if (sessionUser.role !== 'TUTOR') return fail('Tutor access required', 403);

  const profile = ensureTutorProfileForUser(sessionUser);
  const bookings = ensureBookings();
  const index = bookings.findIndex((item) => String(item.id) === String(id));
  if (index < 0) return fail('Booking not found', 404);

  const booking = bookings[index];
  if (String(booking.tutorId) !== String(profile.id)) return fail('Forbidden', 403);

  try {
    updater(booking);
  } catch (error) {
    return Promise.reject(error);
  }

  booking.updatedAt = new Date().toISOString();
  bookings[index] = booking;
  writeBookings(bookings);
  return ok(enrichBooking(booking));
};

const normalizeLevel = (value = '') => {
  const level = normalize(value);
  if (!level) return 'all';
  if (level === 'beginner') return 'beginner';
  if (level === 'intermediate') return 'intermediate';
  if (level === 'advanced') return 'advanced';
  return 'all';
};

const parseApplicationPayload = (payload) => {
  if (typeof FormData !== 'undefined' && payload instanceof FormData) {
    return {
      tutorEducationSummary: payload.get('tutorEducationSummary') || '',
      tutorExperienceYears: payload.get('tutorExperienceYears') || '',
      tutorSupportingNotes: payload.get('tutorSupportingNotes') || '',
      verificationFiles: payload.getAll('verificationFiles') || [],
    };
  }

  return {
    tutorEducationSummary: payload?.tutorEducationSummary || '',
    tutorExperienceYears: payload?.tutorExperienceYears || '',
    tutorSupportingNotes: payload?.tutorSupportingNotes || '',
    verificationFiles: [],
  };
};

export const tutorApi = {
  getMyProfile: async () => {
    await wait();
    const sessionUser = getSessionUser();
    if (!sessionUser) return fail('Unauthorized', 401);
    if (sessionUser.role !== 'TUTOR') return fail('Tutor access required', 403);

    const profile = ensureTutorProfileForUser(sessionUser);
    return ok(profile);
  },

  updateProfile: async (payload = {}) => {
    await wait();
    const sessionUser = getSessionUser();
    if (!sessionUser) return fail('Unauthorized', 401);
    if (sessionUser.role !== 'TUTOR') return fail('Tutor access required', 403);

    const profiles = ensureTutorProfiles();
    const profile = ensureTutorProfileForUser(sessionUser);
    const index = profiles.findIndex((item) => item.id === profile.id);
    if (index < 0) return fail('Tutor profile not found', 404);

    const current = profiles[index];
    current.headline = payload?.headline ?? current.headline;
    current.bio = payload?.bio ?? current.bio;
    current.hourlyRate = Number((payload?.hourlyRate ?? current.hourlyRate) || 0);
    current.currency = payload?.currency || current.currency || 'AUD';
    current.location = payload?.location ?? current.location;
    current.yearsExperience = Number((payload?.yearsExperience ?? current.yearsExperience) || 0);
    current.sessionTypes = Array.isArray(payload?.sessionTypes)
      ? payload.sessionTypes.filter((type) => SESSION_TYPES.includes(type))
      : current.sessionTypes;
    if (!current.sessionTypes || current.sessionTypes.length === 0) {
      current.sessionTypes = ['ONLINE'];
    }

    if (Array.isArray(payload?.education)) {
      current.education = payload.education;
    } else if (typeof payload?.education === 'string') {
      current.education = payload.education
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean);
    }

    if (Array.isArray(payload?.languages)) {
      current.languages = payload.languages;
    } else if (typeof payload?.languages === 'string') {
      current.languages = payload.languages
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }

    current.updatedAt = new Date().toISOString();

    writeTutorProfiles(profiles);
    return ok(clone(current), 'Profile updated');
  },

  updateAvailability: async (payload = []) => {
    await wait();
    const sessionUser = getSessionUser();
    if (!sessionUser) return fail('Unauthorized', 401);
    if (sessionUser.role !== 'TUTOR') return fail('Tutor access required', 403);

    const profiles = ensureTutorProfiles();
    const profile = ensureTutorProfileForUser(sessionUser);
    const index = profiles.findIndex((item) => item.id === profile.id);
    if (index < 0) return fail('Tutor profile not found', 404);

    const rawSlots = Array.isArray(payload) ? payload : payload?.availability;
    const slots = Array.isArray(rawSlots) ? rawSlots : [];

    profiles[index].availability = slots
      .map((slot) => ({
        dayOfWeek: Number(slot?.dayOfWeek),
        startTime: String(slot?.startTime || ''),
        endTime: String(slot?.endTime || ''),
      }))
      .filter(
        (slot) =>
          Number.isInteger(slot.dayOfWeek) &&
          slot.dayOfWeek >= 0 &&
          slot.dayOfWeek <= 6 &&
          slot.startTime &&
          slot.endTime
      );
    profiles[index].updatedAt = new Date().toISOString();

    writeTutorProfiles(profiles);
    return ok(clone(profiles[index]), 'Availability updated');
  },

  addSubject: async (subjectId, data = {}) => {
    await wait();
    const sessionUser = getSessionUser();
    if (!sessionUser) return fail('Unauthorized', 401);
    if (sessionUser.role !== 'TUTOR') return fail('Tutor access required', 403);
    if (!subjectId) return fail('Subject is required');

    const profiles = ensureTutorProfiles();
    const profile = ensureTutorProfileForUser(sessionUser);
    const index = profiles.findIndex((item) => item.id === profile.id);
    if (index < 0) return fail('Tutor profile not found', 404);

    const exists = (profiles[index].subjects || []).some(
      (item) => String(item.subjectId) === String(subjectId)
    );
    if (exists) return fail('Subject already added', 409);

    const entry = {
      id: `mock_tutor_subject_${Date.now()}`,
      subjectId: String(subjectId),
      level: normalizeLevel(data?.level),
      subject: findSubject(subjectId),
    };

    profiles[index].subjects = [...(profiles[index].subjects || []), entry];
    profiles[index].updatedAt = new Date().toISOString();
    writeTutorProfiles(profiles);

    return ok(clone(entry), 'Subject added');
  },

  removeSubject: async (subjectId) => {
    await wait(220);
    const sessionUser = getSessionUser();
    if (!sessionUser) return fail('Unauthorized', 401);
    if (sessionUser.role !== 'TUTOR') return fail('Tutor access required', 403);

    const profiles = ensureTutorProfiles();
    const profile = ensureTutorProfileForUser(sessionUser);
    const index = profiles.findIndex((item) => item.id === profile.id);
    if (index < 0) return fail('Tutor profile not found', 404);

    const currentSubjects = profiles[index].subjects || [];
    const nextSubjects = currentSubjects.filter(
      (item) => String(item.subjectId) !== String(subjectId)
    );
    if (nextSubjects.length === currentSubjects.length) return fail('Subject not found', 404);

    profiles[index].subjects = nextSubjects;
    profiles[index].updatedAt = new Date().toISOString();
    writeTutorProfiles(profiles);

    return ok(null, 'Subject removed');
  },

  updateApplication: async (payload) => {
    await wait(320);
    const sessionUser = getSessionUser();
    if (!sessionUser) return fail('Unauthorized', 401);
    if (sessionUser.role !== 'TUTOR') return fail('Tutor access required', 403);

    const profiles = ensureTutorProfiles();
    const profile = ensureTutorProfileForUser(sessionUser);
    const index = profiles.findIndex((item) => item.id === profile.id);
    if (index < 0) return fail('Tutor profile not found', 404);

    const parsed = parseApplicationPayload(payload);
    if (!String(parsed.tutorEducationSummary || '').trim()) {
      return fail('Education summary is required');
    }

    const files = parsed.verificationFiles || [];
    const notes = String(parsed.tutorSupportingNotes || '').trim();

    profiles[index].education = parsed.tutorEducationSummary
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
    profiles[index].yearsExperience = Number(parsed.tutorExperienceYears || 0);

    const certifications = [];
    if (notes) certifications.push({ text: notes });
    files.forEach((file, idx) => {
      certifications.push({
        name: file?.name || `verification-${idx + 1}.pdf`,
        url: `https://mock.local/files/${Date.now()}_${idx + 1}`,
      });
    });

    if (certifications.length > 0) {
      profiles[index].certifications = certifications;
    }

    profiles[index].status = 'PENDING';
    profiles[index].latestReviewAction = {
      action: 'RESUBMITTED',
      feedback: 'Application resubmitted and pending review.',
      createdAt: new Date().toISOString(),
    };
    profiles[index].updatedAt = new Date().toISOString();

    writeTutorProfiles(profiles);

    const nextUser = updateUserRecord(sessionUser.id, {
      tutorProfileId: profiles[index].id,
      tutorProfile: { id: profiles[index].id, status: profiles[index].status },
    });
    updateStoredCurrentUser(nextUser || sessionUser);

    return ok(clone(profiles[index]), 'Verification materials resubmitted');
  },
};

export const bookingApi = {
  getTutorBookings: async (params = {}) => {
    await wait();
    const sessionUser = getSessionUser();
    if (!sessionUser) return fail('Unauthorized', 401);
    if (sessionUser.role !== 'TUTOR') return fail('Tutor access required', 403);

    const profile = ensureTutorProfileForUser(sessionUser);
    const status = String(params?.status || '').trim().toUpperCase();
    const page = parsePage(params?.page, 1);
    const limit = parseLimit(params?.limit, 10);

    let bookings = ensureBookings().filter(
      (item) => String(item.tutorId) === String(profile.id)
    );

    if (status) {
      bookings = bookings.filter((item) => String(item.status || '').toUpperCase() === status);
    }

    bookings = sortBookings(bookings);
    const total = bookings.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    const paged = bookings.slice(start, start + limit).map(enrichBooking);

    return ok({
      bookings: paged,
      pagination: {
        page: safePage,
        limit,
        total,
        totalPages,
      },
    });
  },

  getById: async (id) => {
    await wait(200);
    const sessionUser = getSessionUser();
    if (!sessionUser) return fail('Unauthorized', 401);

    const booking = ensureBookings().find((item) => String(item.id) === String(id));
    if (!booking) return fail('Booking not found', 404);

    if (sessionUser.role === 'LEARNER') {
      if (String(booking.learnerId) !== String(sessionUser.id)) return fail('Forbidden', 403);
    } else if (sessionUser.role === 'TUTOR') {
      const profile = ensureTutorProfileForUser(sessionUser);
      if (String(booking.tutorId) !== String(profile.id)) return fail('Forbidden', 403);
    } else {
      return fail('Forbidden', 403);
    }

    return ok(enrichBooking(booking));
  },

  accept: async (id, data = {}) =>
    mutateTutorBooking(id, (booking) => {
      if (booking.status !== 'PENDING') {
        throw buildError('Only pending bookings can be accepted');
      }
      booking.status = 'ACCEPTED';
      if (data && typeof data === 'object' && Object.keys(data).length > 0) {
        booking.acceptPayload = clone(data);
      }
    }),

  decline: async (id, reason = '') =>
    mutateTutorBooking(id, (booking) => {
      if (booking.status !== 'PENDING') {
        throw buildError('Only pending bookings can be declined');
      }
      booking.status = 'DECLINED';
      booking.declineReason = reason ? String(reason) : '';
    }),

  complete: async (id) =>
    mutateTutorBooking(id, (booking) => {
      if (booking.status !== 'ACCEPTED') {
        throw buildError('Only accepted bookings can be completed');
      }
      booking.status = 'COMPLETED';
    }),

  reschedule: async (id, data = {}) =>
    mutateTutorBooking(id, (booking) => {
      if (!['PENDING', 'ACCEPTED'].includes(booking.status)) {
        throw buildError('This booking cannot be rescheduled');
      }

      const nextDate = new Date(data?.scheduledAt || '');
      if (Number.isNaN(nextDate.getTime())) {
        throw buildError('Please provide a valid new schedule');
      }

      booking.scheduledAt = nextDate.toISOString();
      booking.status = 'ACCEPTED';
      booking.rescheduleReason = data?.reason ? String(data.reason) : '';
    }),
};

export const userApi = {
  updateProfile: async (payload = {}) => {
    await wait();
    const sessionUser = getSessionUser();
    if (!sessionUser) return fail('Unauthorized', 401);

    const patch = {
      firstName: payload?.firstName ?? sessionUser.firstName,
      lastName: payload?.lastName ?? sessionUser.lastName,
      phone: payload?.phone ?? sessionUser.phone ?? '',
      bio: payload?.bio ?? sessionUser.bio ?? '',
    };

    const nextUser = updateUserRecord(sessionUser.id, patch);
    if (!nextUser) return fail('User not found', 404);
    updateStoredCurrentUser(nextUser);

    if (nextUser.role === 'TUTOR') {
      const profiles = ensureTutorProfiles();
      const map = ensureTutorUserMap();
      const profileId = nextUser.tutorProfileId || map[nextUser.id];
      const profile = profiles.find((item) => item.id === profileId);
      if (profile) {
        profile.user = {
          ...(profile.user || {}),
          id: nextUser.id,
          firstName: nextUser.firstName || '',
          lastName: nextUser.lastName || '',
          email: nextUser.email || '',
          avatar: nextUser.avatar || '',
        };
        profile.userId = nextUser.id;
        profile.updatedAt = new Date().toISOString();
        writeTutorProfiles(profiles);
      }
    }

    return ok(toPublicUser(nextUser), 'Profile updated');
  },

  uploadAvatar: async (formData) => {
    await wait(260);
    const sessionUser = getSessionUser();
    if (!sessionUser) return fail('Unauthorized', 401);

    const file =
      typeof FormData !== 'undefined' && formData instanceof FormData ? formData.get('avatar') : null;

    const fallbackName = `${sessionUser.firstName || ''} ${sessionUser.lastName || ''}`.trim() || 'User';
    const avatar =
      file && file.name
        ? `https://mock.local/avatar/${Date.now()}_${encodeURIComponent(file.name)}`
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName)}&background=0ea5e9&color=fff`;

    const nextUser = updateUserRecord(sessionUser.id, { avatar });
    if (!nextUser) return fail('User not found', 404);
    updateStoredCurrentUser(nextUser);

    if (nextUser.role === 'TUTOR') {
      const profiles = ensureTutorProfiles();
      const map = ensureTutorUserMap();
      const profileId = nextUser.tutorProfileId || map[nextUser.id];
      const profile = profiles.find((item) => item.id === profileId);
      if (profile) {
        profile.user = {
          ...(profile.user || {}),
          id: nextUser.id,
          firstName: nextUser.firstName || '',
          lastName: nextUser.lastName || '',
          email: nextUser.email || '',
          avatar,
        };
        profile.userId = nextUser.id;
        profile.updatedAt = new Date().toISOString();
        writeTutorProfiles(profiles);
      }
    }

    return ok({ avatar }, 'Avatar updated');
  },
};
