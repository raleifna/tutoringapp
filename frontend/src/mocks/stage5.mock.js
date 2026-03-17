// src/mocks/stage5.mock.js - Mock admin APIs for stage 5 pages

const USERS_KEY = 'mock_auth_users_v1';
const SESSION_KEY = 'mock_auth_session_v1';
const TUTOR_PROFILES_KEY = 'mock_stage4_tutor_profiles_v1';
const TUTOR_USER_MAP_KEY = 'mock_stage4_tutor_user_map_v1';
const BOOKINGS_KEY = 'mock_stage3_bookings_v1';
const SUBJECTS_KEY = 'mock_stage5_subjects_v1';
const ACTIONS_KEY = 'mock_stage5_admin_actions_v1';
const USER_STATUS_KEY = 'mock_stage5_user_status_v1';

const wait = (ms = 260) => new Promise((resolve) => setTimeout(resolve, ms));

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

const fail = (message, status = 400) =>
  Promise.reject({
    response: {
      status,
      data: { message },
    },
  });

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

const parsePeriodDays = (value, fallback = 30) => {
  const raw = String(value || '').trim();
  const match = raw.match(/(\d+)/);
  if (!match) return fallback;
  const days = Number(match[1]);
  if (!Number.isFinite(days) || days <= 0) return fallback;
  return days;
};

const DEFAULT_ADMIN_USERS = [
  {
    id: 'mock_admin_1',
    firstName: 'Alex',
    lastName: 'Admin',
    email: 'admin@mock.local',
    role: 'ADMIN',
    status: 'ACTIVE',
    createdAt: '2026-01-10T09:00:00.000Z',
    avatar: '',
    isEmailVerified: true,
  },
  {
    id: 'mock_system_admin_1',
    firstName: 'System',
    lastName: 'Owner',
    email: 'sysadmin@mock.local',
    role: 'SYSTEM_ADMIN',
    status: 'ACTIVE',
    createdAt: '2026-01-01T09:00:00.000Z',
    avatar: '',
    isEmailVerified: true,
  },
];

const SEED_SUBJECTS = [
  { id: 'subj_math', name: 'Mathematics', category: 'STEM', description: 'General mathematics' },
  { id: 'subj_physics', name: 'Physics', category: 'STEM', description: 'Physics concepts and exam support' },
  { id: 'subj_programming', name: 'Programming', category: 'Technology', description: 'Coding fundamentals and projects' },
  { id: 'subj_data_science', name: 'Data Science', category: 'Technology', description: 'Data analysis and ML basics' },
  { id: 'subj_english', name: 'English', category: 'Languages', description: 'English writing and reading' },
  { id: 'subj_ielts', name: 'IELTS Prep', category: 'Languages', description: 'IELTS exam preparation' },
  { id: 'subj_science', name: 'Science', category: 'STEM', description: 'General school science support' },
];

const SEED_TUTOR_PROFILES = [
  {
    id: 'mock_tutor_1',
    userId: 'mock_seed_tutor_user_1',
    user: { id: 'mock_seed_tutor_user_1', firstName: 'Emma', lastName: 'Wilson', email: 'emma.tutor@example.com', avatar: '' },
    status: 'ACTIVE',
    headline: 'Math and Physics Tutor',
    bio: 'I help high school and first-year uni students build confidence in STEM subjects.',
    hourlyRate: 65,
    currency: 'AUD',
    location: 'Sydney, NSW',
    yearsExperience: 6,
    rating: 4.9,
    availability: [
      { dayOfWeek: 1, startTime: '16:00', endTime: '19:00' },
      { dayOfWeek: 3, startTime: '17:00', endTime: '20:00' },
      { dayOfWeek: 6, startTime: '09:00', endTime: '12:00' },
    ],
    subjects: [
      { id: 'mock_tutor_subject_1', subjectId: 'subj_math', level: 'advanced', subject: { id: 'subj_math', name: 'Mathematics', category: 'STEM' } },
      { id: 'mock_tutor_subject_2', subjectId: 'subj_physics', level: 'intermediate', subject: { id: 'subj_physics', name: 'Physics', category: 'STEM' } },
    ],
    education: ['BSc Physics, UNSW', 'MTeach Secondary Education, USYD'],
    certifications: [],
    createdAt: '2026-01-22T09:00:00.000Z',
    updatedAt: '2026-03-01T09:00:00.000Z',
  },
  {
    id: 'mock_tutor_2',
    userId: 'mock_seed_tutor_user_2',
    user: { id: 'mock_seed_tutor_user_2', firstName: 'Liam', lastName: 'Chen', email: 'liam.tutor@example.com', avatar: '' },
    status: 'ACTIVE',
    headline: 'Programming and Data Science Tutor',
    bio: 'I teach Python, JavaScript and data projects with practical examples.',
    hourlyRate: 72,
    currency: 'AUD',
    location: 'Melbourne, VIC',
    yearsExperience: 5,
    rating: 4.8,
    availability: [{ dayOfWeek: 2, startTime: '18:00', endTime: '21:00' }],
    subjects: [
      { id: 'mock_tutor_subject_3', subjectId: 'subj_programming', level: 'all', subject: { id: 'subj_programming', name: 'Programming', category: 'Technology' } },
      { id: 'mock_tutor_subject_4', subjectId: 'subj_data_science', level: 'intermediate', subject: { id: 'subj_data_science', name: 'Data Science', category: 'Technology' } },
    ],
    education: ['BEng Software Engineering, Monash'],
    certifications: [],
    createdAt: '2026-01-25T09:00:00.000Z',
    updatedAt: '2026-03-01T09:00:00.000Z',
  },
  {
    id: 'mock_tutor_3',
    userId: 'mock_seed_tutor_user_3',
    user: { id: 'mock_seed_tutor_user_3', firstName: 'Sophie', lastName: 'Brown', email: 'sophie.tutor@example.com', avatar: '' },
    status: 'PENDING',
    headline: 'English and IELTS Coach',
    bio: 'I focus on writing structure, speaking fluency and exam confidence.',
    hourlyRate: 58,
    currency: 'AUD',
    location: 'Brisbane, QLD',
    yearsExperience: 8,
    rating: 4.7,
    availability: [{ dayOfWeek: 5, startTime: '14:00', endTime: '18:00' }],
    subjects: [
      { id: 'mock_tutor_subject_5', subjectId: 'subj_english', level: 'all', subject: { id: 'subj_english', name: 'English', category: 'Languages' } },
      { id: 'mock_tutor_subject_6', subjectId: 'subj_ielts', level: 'advanced', subject: { id: 'subj_ielts', name: 'IELTS Prep', category: 'Languages' } },
    ],
    education: ['BA Linguistics, UQ'],
    certifications: [{ text: 'Please verify identity documents.' }],
    createdAt: '2026-03-03T09:00:00.000Z',
    updatedAt: '2026-03-10T09:00:00.000Z',
  },
];

const buildSeedBookings = () => {
    const now = Date.now();
    const h = 60 * 60 * 1000;
    const d = 24 * h;

    return [
      {
        id: 'mock_booking_seed_1',
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
        scheduledAt: new Date(now + d).toISOString(),
        duration: 60,
        status: 'PENDING',
        currency: 'AUD',
        totalAmount: 65,
        payment: { status: 'PENDING' },
        statusHistory: [
          { id: 'mock_booking_seed_1_h1', status: 'PENDING', createdAt: new Date(now - 4 * h).toISOString(), reason: '' },
        ],
        createdAt: new Date(now - 4 * h).toISOString(),
        updatedAt: new Date(now - 4 * h).toISOString(),
      },
      {
        id: 'mock_booking_seed_2',
        learnerId: 'mock_seed_learner_1',
        learner: {
          id: 'mock_seed_learner_1',
          firstName: 'Ava',
          lastName: 'Martin',
          email: 'ava.learner@example.com',
          avatar: '',
        },
        tutorId: 'mock_tutor_1',
        subjectId: 'subj_physics',
        subject: 'Physics',
        sessionType: 'IN_PERSON',
        scheduledAt: new Date(now + 2 * d).toISOString(),
        duration: 90,
        status: 'ACCEPTED',
        currency: 'AUD',
        totalAmount: 97.5,
        payment: { status: 'COMPLETED' },
        statusHistory: [
          { id: 'mock_booking_seed_2_h1', status: 'PENDING', createdAt: new Date(now - 10 * h).toISOString(), reason: '' },
          { id: 'mock_booking_seed_2_h2', status: 'ACCEPTED', createdAt: new Date(now - 8 * h).toISOString(), reason: '' },
        ],
        createdAt: new Date(now - 10 * h).toISOString(),
        updatedAt: new Date(now - 8 * h).toISOString(),
      },
      {
        id: 'mock_booking_seed_3',
        learnerId: 'mock_seed_learner_1',
        learner: {
          id: 'mock_seed_learner_1',
          firstName: 'Ava',
          lastName: 'Martin',
          email: 'ava.learner@example.com',
          avatar: '',
        },
        tutorId: 'mock_tutor_2',
        subjectId: 'subj_programming',
        subject: 'Programming',
        sessionType: 'ONLINE',
        scheduledAt: new Date(now - 2 * d).toISOString(),
        duration: 60,
        status: 'COMPLETED',
        currency: 'AUD',
        totalAmount: 72,
        payment: { status: 'COMPLETED' },
        statusHistory: [
          { id: 'mock_booking_seed_3_h1', status: 'PENDING', createdAt: new Date(now - 4 * d).toISOString(), reason: '' },
          { id: 'mock_booking_seed_3_h2', status: 'ACCEPTED', createdAt: new Date(now - 3 * d).toISOString(), reason: '' },
          { id: 'mock_booking_seed_3_h3', status: 'COMPLETED', createdAt: new Date(now - 2 * d).toISOString(), reason: '' },
        ],
        createdAt: new Date(now - 4 * d).toISOString(),
        updatedAt: new Date(now - 2 * d).toISOString(),
      },
      {
        id: 'mock_booking_seed_4',
        learnerId: 'mock_seed_learner_2',
        learner: {
          id: 'mock_seed_learner_2',
          firstName: 'Ethan',
          lastName: 'Ng',
          email: 'ethan.learner@example.com',
          avatar: '',
        },
        tutorId: 'mock_tutor_3',
        subjectId: 'subj_english',
        subject: 'English',
        sessionType: 'ONLINE',
        scheduledAt: new Date(now + 2 * d).toISOString(),
        duration: 60,
        status: 'DECLINED',
        currency: 'AUD',
        totalAmount: 58,
        payment: { status: 'FAILED' },
        statusHistory: [
          { id: 'mock_booking_seed_4_h1', status: 'PENDING', createdAt: new Date(now - 12 * h).toISOString(), reason: '' },
          { id: 'mock_booking_seed_4_h2', status: 'DECLINED', createdAt: new Date(now - 10 * h).toISOString(), reason: 'Not available at requested level' },
        ],
        createdAt: new Date(now - 12 * h).toISOString(),
        updatedAt: new Date(now - 10 * h).toISOString(),
      },
      {
        id: 'mock_booking_seed_5',
        learnerId: 'mock_seed_learner_3',
        learner: {
          id: 'mock_seed_learner_3',
          firstName: 'Mia',
          lastName: 'Lopez',
          email: 'mia.learner@example.com',
          avatar: '',
        },
        tutorId: 'mock_tutor_2',
        subjectId: 'subj_data_science',
        subject: 'Data Science',
        sessionType: 'ONLINE',
        scheduledAt: new Date(now + 5 * d).toISOString(),
        duration: 90,
        status: 'RESCHEDULED',
        currency: 'AUD',
        totalAmount: 108,
        payment: { status: 'PENDING' },
        statusHistory: [
          { id: 'mock_booking_seed_5_h1', status: 'PENDING', createdAt: new Date(now - 14 * h).toISOString(), reason: '' },
          { id: 'mock_booking_seed_5_h2', status: 'ACCEPTED', createdAt: new Date(now - 11 * h).toISOString(), reason: '' },
          { id: 'mock_booking_seed_5_h3', status: 'RESCHEDULED', createdAt: new Date(now - 6 * h).toISOString(), reason: 'Tutor requested time shift' },
        ],
        createdAt: new Date(now - 14 * h).toISOString(),
        updatedAt: new Date(now - 6 * h).toISOString(),
      },
      {
        id: 'mock_booking_seed_6',
        learnerId: 'mock_seed_learner_2',
        learner: {
          id: 'mock_seed_learner_2',
          firstName: 'Ethan',
          lastName: 'Ng',
          email: 'ethan.learner@example.com',
          avatar: '',
        },
        tutorId: 'mock_tutor_1',
        subjectId: 'subj_math',
        subject: 'Mathematics',
        sessionType: 'ONLINE',
        scheduledAt: new Date(now + 3 * d).toISOString(),
        duration: 60,
        status: 'PENDING',
        currency: 'AUD',
        totalAmount: 65,
        payment: { status: 'PENDING' },
        statusHistory: [
          { id: 'mock_booking_seed_6_h1', status: 'PENDING', createdAt: new Date(now - 2 * h).toISOString(), reason: '' },
        ],
        createdAt: new Date(now - 2 * h).toISOString(),
        updatedAt: new Date(now - 2 * h).toISOString(),
      },
      {
        id: 'mock_booking_seed_7',
        learnerId: 'mock_seed_learner_3',
        learner: {
          id: 'mock_seed_learner_3',
          firstName: 'Mia',
          lastName: 'Lopez',
          email: 'mia.learner@example.com',
          avatar: '',
        },
        tutorId: 'mock_tutor_1',
        subjectId: 'subj_physics',
        subject: 'Physics',
        sessionType: 'ONLINE',
        scheduledAt: new Date(now + 4 * d).toISOString(),
        duration: 60,
        status: 'ACCEPTED',
        currency: 'AUD',
        totalAmount: 65,
        payment: { status: 'COMPLETED' },
        statusHistory: [
          { id: 'mock_booking_seed_7_h1', status: 'PENDING', createdAt: new Date(now - 9 * h).toISOString(), reason: '' },
          { id: 'mock_booking_seed_7_h2', status: 'ACCEPTED', createdAt: new Date(now - 7 * h).toISOString(), reason: '' },
        ],
        createdAt: new Date(now - 9 * h).toISOString(),
        updatedAt: new Date(now - 7 * h).toISOString(),
      },
      {
        id: 'mock_booking_seed_8',
        learnerId: 'mock_seed_learner_1',
        learner: {
          id: 'mock_seed_learner_1',
          firstName: 'Ava',
          lastName: 'Martin',
          email: 'ava.learner@example.com',
          avatar: '',
        },
        tutorId: 'mock_tutor_2',
        subjectId: 'subj_data_science',
        subject: 'Data Science',
        sessionType: 'ONLINE',
        scheduledAt: new Date(now - d).toISOString(),
        duration: 60,
        status: 'CANCELLED',
        currency: 'AUD',
        totalAmount: 72,
        payment: { status: 'FAILED' },
        statusHistory: [
          { id: 'mock_booking_seed_8_h1', status: 'PENDING', createdAt: new Date(now - 2 * d).toISOString(), reason: '' },
          { id: 'mock_booking_seed_8_h2', status: 'CANCELLED', createdAt: new Date(now - 30 * h).toISOString(), reason: 'Unavailable this week' },
        ],
        createdAt: new Date(now - 2 * d).toISOString(),
        updatedAt: new Date(now - 30 * h).toISOString(),
      },
    ];
};

const ensureSubjects = () => {
  const current = readJson(SUBJECTS_KEY, null);
  if (Array.isArray(current) && current.length > 0) return current;
  const seeded = clone(SEED_SUBJECTS).map((item) => ({
    ...item,
    createdAt: new Date('2026-02-01T00:00:00.000Z').toISOString(),
    updatedAt: new Date('2026-02-01T00:00:00.000Z').toISOString(),
  }));
  writeJson(SUBJECTS_KEY, seeded);
  return seeded;
};

const ensureTutorProfiles = () => {
  const current = readJson(TUTOR_PROFILES_KEY, null);
  if (Array.isArray(current) && current.length > 0) return current;
  const seeded = clone(SEED_TUTOR_PROFILES);
  writeJson(TUTOR_PROFILES_KEY, seeded);
  return seeded;
};

const ensureTutorUserMap = () => {
  const current = readJson(TUTOR_USER_MAP_KEY, null);
  if (current && typeof current === 'object') return current;
  const seeded = {};
  writeJson(TUTOR_USER_MAP_KEY, seeded);
  return seeded;
};

const ensureBookings = () => {
  const current = readJson(BOOKINGS_KEY, null);
  if (Array.isArray(current) && current.length > 0) return current;
  const seeded = buildSeedBookings();
  writeJson(BOOKINGS_KEY, seeded);
  return seeded;
};

const ensureActions = () => {
  const current = readJson(ACTIONS_KEY, null);
  if (Array.isArray(current)) return current;
  const seeded = [];
  writeJson(ACTIONS_KEY, seeded);
  return seeded;
};

const ensureUserStatusMap = () => {
  const current = readJson(USER_STATUS_KEY, null);
  if (current && typeof current === 'object') return current;
  const seeded = {};
  writeJson(USER_STATUS_KEY, seeded);
  return seeded;
};

const getSessionUser = () => {
  if (typeof window === 'undefined') return null;
  const session = readJson(SESSION_KEY, null);
  if (!session) return null;
  const accessToken = localStorage.getItem('accessToken');
  if (!accessToken || accessToken !== session.accessToken) return null;
  const users = readJson(USERS_KEY, []);
  return users.find((item) => item.id === session.userId) || null;
};

const getAdminActor = () => {
  const sessionUser = getSessionUser();
  if (sessionUser && (sessionUser.role === 'ADMIN' || sessionUser.role === 'SYSTEM_ADMIN')) {
    return {
      id: sessionUser.id,
      firstName: sessionUser.firstName || 'Admin',
      lastName: sessionUser.lastName || '',
      email: sessionUser.email || '',
    };
  }

  return {
    id: DEFAULT_ADMIN_USERS[0].id,
    firstName: DEFAULT_ADMIN_USERS[0].firstName,
    lastName: DEFAULT_ADMIN_USERS[0].lastName,
    email: DEFAULT_ADMIN_USERS[0].email,
  };
};

const getRegisteredUsers = () => {
  const statusMap = ensureUserStatusMap();
  const users = readJson(USERS_KEY, []);
  if (!Array.isArray(users)) return [];

  return users.map((user) => ({
    id: user.id,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    role: user.role || 'LEARNER',
    status: statusMap[user.id] || 'ACTIVE',
    avatar: user.avatar || '',
    phone: user.phone || '',
    bio: user.bio || '',
    timezone: user.timezone || 'Australia/Sydney',
    createdAt: user.createdAt || new Date().toISOString(),
    lastLoginAt: user.lastLoginAt || null,
    isEmailVerified: Boolean(user.isEmailVerified),
  }));
};

const getAllUsersForAdmin = () => {
  const registered = getRegisteredUsers();
  const byKey = new Map();

  [...clone(DEFAULT_ADMIN_USERS), ...registered].forEach((user) => {
    const idKey = user?.id ? `id:${user.id}` : null;
    const emailKey = user?.email ? `email:${normalize(user.email)}` : null;
    const key = idKey || emailKey;
    if (!key) return;

    const previous = byKey.get(key);
    byKey.set(key, previous ? { ...previous, ...user } : user);
  });

  return Array.from(byKey.values()).sort((a, b) => {
    const aTime = new Date(a.createdAt || 0).getTime();
    const bTime = new Date(b.createdAt || 0).getTime();
    return bTime - aTime;
  });
};

const getTutorProfileByUserId = (userId) => {
  const profiles = ensureTutorProfiles();
  const userMap = ensureTutorUserMap();
  const mappedId = userMap[userId];
  if (mappedId) {
    const matched = profiles.find((item) => String(item.id) === String(mappedId));
    if (matched) return matched;
  }
  return profiles.find((item) => String(item.userId) === String(userId)) || null;
};

const enrichBooking = (booking) => {
  const item = clone(booking);
  const users = getAllUsersForAdmin();
  const profiles = ensureTutorProfiles();

  if (!item.learner) {
    const learner = users.find((user) => String(user.id) === String(item.learnerId));
    item.learner = learner
      ? {
          id: learner.id,
          firstName: learner.firstName,
          lastName: learner.lastName,
          email: learner.email,
          avatar: learner.avatar || '',
        }
      : { id: item.learnerId || '', firstName: 'Learner', lastName: '', email: '', avatar: '' };
  }

  if (!item.tutorProfile) {
    const profile = profiles.find((p) => String(p.id) === String(item.tutorId));
    if (profile) {
      item.tutorProfile = {
        id: profile.id,
        user: {
          id: profile.user?.id || profile.userId || '',
          firstName: profile.user?.firstName || 'Tutor',
          lastName: profile.user?.lastName || '',
          email: profile.user?.email || '',
          avatar: profile.user?.avatar || '',
        },
      };
    } else {
      item.tutorProfile = {
        id: item.tutorId || '',
        user: { id: '', firstName: 'Tutor', lastName: '', email: '', avatar: '' },
      };
    }
  }

  if (!Array.isArray(item.statusHistory)) {
    item.statusHistory = [
      {
        id: `history_${item.id}`,
        status: item.status || 'PENDING',
        createdAt: item.createdAt || new Date().toISOString(),
        reason: '',
      },
    ];
  }

  if (!item.payment) {
    const completed = item.status === 'COMPLETED';
    item.payment = { status: completed ? 'COMPLETED' : 'PENDING' };
  }

  return item;
};

const getEnrichedBookings = () => ensureBookings().map(enrichBooking);

const addAdminAction = ({ action, description, targetUser = null }) => {
  const actions = ensureActions();
  actions.unshift({
    id: `mock_admin_action_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    action,
    admin: getAdminActor(),
    targetUser,
    description: description || '',
    createdAt: new Date().toISOString(),
  });
  writeJson(ACTIONS_KEY, actions);
};

const groupByDate = (items, valueGetter) => {
  const map = new Map();
  items.forEach((item) => {
    const date = new Date(item.createdAt || item.updatedAt || item.scheduledAt || Date.now());
    if (Number.isNaN(date.getTime())) return;
    const key = date.toISOString().slice(0, 10);
    map.set(key, (map.get(key) || 0) + Number(valueGetter(item) || 0));
  });

  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({ date, count: value, revenue: value }));
};

export const adminApi = {
  getDashboard: async () => {
    await wait();

    const users = getAllUsersForAdmin();
    const profiles = ensureTutorProfiles();
    const bookings = getEnrichedBookings();

    const totalRevenue = bookings
      .filter((booking) => booking.status === 'COMPLETED')
      .reduce((sum, booking) => sum + Number(booking.totalAmount || 0), 0);

    const usersByRole = users.reduce((acc, user) => {
      const role = String(user.role || 'UNKNOWN').toUpperCase();
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});

    const recentBookings = bookings
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 5);

    return ok({
      overview: {
        totalUsers: users.length,
        totalTutors: profiles.length,
        totalBookings: bookings.length,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        pendingTutors: profiles.filter((item) => String(item.status).toUpperCase() === 'PENDING').length,
      },
      usersByRole,
      recentBookings,
    });
  },

  getAnalytics: async (params = {}) => {
    await wait();

    const days = parsePeriodDays(params?.period, 30);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const users = getAllUsersForAdmin().filter((item) => new Date(item.createdAt || 0).getTime() >= cutoff);
    const bookings = getEnrichedBookings().filter((item) => new Date(item.createdAt || 0).getTime() >= cutoff);
    const profiles = ensureTutorProfiles();

    const newUsersTimeline = groupByDate(users, () => 1).map((item) => ({ date: item.date, count: item.count }));

    const statusMap = new Map();
    bookings.forEach((booking) => {
      const status = String(booking.status || 'UNKNOWN').toUpperCase();
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });
    const bookingsByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));

    const revenueTimeline = groupByDate(
      bookings.filter((booking) => String(booking.status || '').toUpperCase() === 'COMPLETED'),
      (booking) => Number(booking.totalAmount || 0)
    ).map((item) => ({ date: item.date, revenue: Number(item.revenue.toFixed(2)) }));

    const subjectMap = new Map();
    bookings.forEach((booking) => {
      const subject = booking.subject || 'Unknown';
      subjectMap.set(subject, (subjectMap.get(subject) || 0) + 1);
    });
    const topSubjects = Array.from(subjectMap.entries())
      .map(([subject, count]) => ({ subject, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const tutorStats = new Map();
    bookings
      .filter((booking) => String(booking.status || '').toUpperCase() === 'COMPLETED')
      .forEach((booking) => {
        const tutorId = String(booking.tutorId || booking.tutorProfile?.id || '');
        if (!tutorId) return;
        const current = tutorStats.get(tutorId) || { tutorId, totalSessions: 0, revenue: 0 };
        current.totalSessions += 1;
        current.revenue += Number(booking.totalAmount || 0);
        tutorStats.set(tutorId, current);
      });

    const topTutors = Array.from(tutorStats.values())
      .map((item) => {
        const profile = profiles.find((profileItem) => String(profileItem.id) === String(item.tutorId));
        return {
          id: item.tutorId,
          user: {
            firstName: profile?.user?.firstName || 'Tutor',
            lastName: profile?.user?.lastName || '',
          },
          totalSessions: item.totalSessions,
          revenue: Number(item.revenue.toFixed(2)),
          rating: Number(profile?.rating || 4.8),
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    return ok({
      newUsersTimeline,
      bookingsByStatus,
      revenueTimeline,
      topTutors,
      topSubjects,
    });
  },

  getUsers: async (params = {}) => {
    await wait();

    const search = normalize(params?.search);
    const role = normalize(params?.role);
    const status = normalize(params?.status);
    const page = parsePage(params?.page, 1);
    const limit = parseLimit(params?.limit, 15);

    let users = getAllUsersForAdmin();

    if (search) {
      users = users.filter((user) => {
        const fullName = normalize(`${user.firstName || ''} ${user.lastName || ''}`);
        const email = normalize(user.email);
        return fullName.includes(search) || email.includes(search);
      });
    }
    if (role) {
      users = users.filter((user) => normalize(user.role) === role);
    }
    if (status) {
      users = users.filter((user) => normalize(user.status) === status);
    }

    const total = users.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    const paged = users.slice(start, start + limit);

    return ok({
      users: paged,
      pagination: {
        page: safePage,
        limit,
        total,
        totalPages,
      },
    });
  },

  getUser: async (id) => {
    await wait();

    const targetId = String(id || '');
    const users = getAllUsersForAdmin();
    const user = users.find((item) => String(item.id) === targetId);
    if (!user) return fail('User not found', 404);

    const bookings = getEnrichedBookings();
    const bookingsAsLearner = bookings.filter((booking) => String(booking.learnerId) === targetId).slice(0, 6);
    const tutorProfileRaw = getTutorProfileByUserId(targetId);
    const tutorProfile = tutorProfileRaw
      ? {
          ...clone(tutorProfileRaw),
          bookings: bookings.filter((booking) => String(booking.tutorId) === String(tutorProfileRaw.id)).slice(0, 6),
        }
      : null;

    const learnerProfile =
      String(user.role).toUpperCase() === 'LEARNER'
        ? {
            gradeLevel: 'Year 11',
            learningGoals: user.bio || 'Improve subject confidence and exam readiness.',
            subjects: Array.from(new Set(bookingsAsLearner.map((item) => item.subject).filter(Boolean))),
          }
        : null;

    return ok({
      ...clone(user),
      bookingsAsLearner,
      tutorProfile,
      learnerProfile,
      subscription: user.subscription || null,
    });
  },

  updateUserStatus: async (id, data = {}) => {
    await wait();

    const targetId = String(id || '');
    const nextStatus = String(data?.status || '').toUpperCase();
    if (!['ACTIVE', 'SUSPENDED', 'DEACTIVATED'].includes(nextStatus)) {
      return fail('Invalid status');
    }

    const users = getAllUsersForAdmin();
    const user = users.find((item) => String(item.id) === targetId);
    if (!user) return fail('User not found', 404);
    if (user.role === 'ADMIN' || user.role === 'SYSTEM_ADMIN') {
      return fail('Cannot change admin account status');
    }

    const statusMap = ensureUserStatusMap();
    statusMap[targetId] = nextStatus;
    writeJson(USER_STATUS_KEY, statusMap);

    const tutorProfile = getTutorProfileByUserId(targetId);
    if (tutorProfile) {
      const profiles = ensureTutorProfiles();
      const profile = profiles.find((item) => String(item.id) === String(tutorProfile.id));
      if (profile) {
        profile.status = nextStatus === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED';
        profile.updatedAt = new Date().toISOString();
        writeJson(TUTOR_PROFILES_KEY, profiles);
      }
    }

    addAdminAction({
      action: 'USER_STATUS_UPDATED',
      description: `Status updated to ${nextStatus}`,
      targetUser: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });

    return ok({ id: targetId, status: nextStatus }, 'User status updated');
  },

  getPendingTutors: async (params = {}) => {
    await wait();

    const status = String(params?.status || '').trim().toUpperCase();
    let tutors = ensureTutorProfiles().map((item) => clone(item));

    if (status) {
      tutors = tutors.filter((item) => String(item.status || '').toUpperCase() === status);
    }

    tutors.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    return ok({
      tutors,
      pagination: {
        page: 1,
        limit: tutors.length || 1,
        total: tutors.length,
        totalPages: 1,
      },
    });
  },

  approveTutor: async (id) => {
    await wait();
    const profiles = ensureTutorProfiles();
    const profile = profiles.find((item) => String(item.id) === String(id));
    if (!profile) return fail('Tutor not found', 404);

    profile.status = 'ACTIVE';
    profile.latestReviewAction = {
      action: 'APPROVED',
      feedback: 'Tutor approved',
      createdAt: new Date().toISOString(),
    };
    profile.updatedAt = new Date().toISOString();
    writeJson(TUTOR_PROFILES_KEY, profiles);

    if (profile.userId) {
      const statusMap = ensureUserStatusMap();
      statusMap[String(profile.userId)] = 'ACTIVE';
      writeJson(USER_STATUS_KEY, statusMap);
    }

    addAdminAction({
      action: 'TUTOR_APPROVED',
      description: 'Tutor application approved',
      targetUser: profile.user
        ? {
            id: profile.user.id || profile.userId || '',
            firstName: profile.user.firstName || 'Tutor',
            lastName: profile.user.lastName || '',
            email: profile.user.email || '',
          }
        : null,
    });

    return ok(clone(profile), 'Tutor approved');
  },

  rejectTutor: async (id, reason) => {
    await wait();
    const profiles = ensureTutorProfiles();
    const profile = profiles.find((item) => String(item.id) === String(id));
    if (!profile) return fail('Tutor not found', 404);

    const reasonText =
      typeof reason === 'object' ? String(reason?.reason || '').trim() : String(reason || '').trim();

    profile.status = 'SUSPENDED';
    profile.latestReviewAction = {
      action: 'REJECTED',
      feedback: reasonText || 'Application rejected',
      createdAt: new Date().toISOString(),
    };
    profile.updatedAt = new Date().toISOString();
    writeJson(TUTOR_PROFILES_KEY, profiles);

    if (profile.userId) {
      const statusMap = ensureUserStatusMap();
      statusMap[String(profile.userId)] = 'SUSPENDED';
      writeJson(USER_STATUS_KEY, statusMap);
    }

    addAdminAction({
      action: 'TUTOR_REJECTED',
      description: reasonText || 'Tutor application rejected',
      targetUser: profile.user
        ? {
            id: profile.user.id || profile.userId || '',
            firstName: profile.user.firstName || 'Tutor',
            lastName: profile.user.lastName || '',
            email: profile.user.email || '',
          }
        : null,
    });

    return ok(clone(profile), 'Tutor rejected');
  },

  returnTutor: async (id, feedback) => {
    await wait();
    const feedbackText =
      typeof feedback === 'object'
        ? String(feedback?.feedback || '').trim()
        : String(feedback || '').trim();

    if (!feedbackText) {
      return fail('Feedback is required');
    }

    const profiles = ensureTutorProfiles();
    const profile = profiles.find((item) => String(item.id) === String(id));
    if (!profile) return fail('Tutor not found', 404);

    profile.status = 'SUSPENDED';
    profile.latestReviewAction = {
      action: 'RETURNED',
      feedback: feedbackText,
      createdAt: new Date().toISOString(),
    };
    profile.updatedAt = new Date().toISOString();
    writeJson(TUTOR_PROFILES_KEY, profiles);

    if (profile.userId) {
      const statusMap = ensureUserStatusMap();
      statusMap[String(profile.userId)] = 'SUSPENDED';
      writeJson(USER_STATUS_KEY, statusMap);
    }

    addAdminAction({
      action: 'TUTOR_RETURNED',
      description: feedbackText,
      targetUser: profile.user
        ? {
            id: profile.user.id || profile.userId || '',
            firstName: profile.user.firstName || 'Tutor',
            lastName: profile.user.lastName || '',
            email: profile.user.email || '',
          }
        : null,
    });

    return ok(clone(profile), 'Tutor returned for changes');
  },

  getBookings: async (params = {}) => {
    await wait();
    const status = String(params?.status || '').trim().toUpperCase();
    const page = parsePage(params?.page, 1);
    const limit = parseLimit(params?.limit, 10);

    let bookings = getEnrichedBookings();
    if (status) {
      bookings = bookings.filter((item) => String(item.status || '').toUpperCase() === status);
    }

    bookings.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    const total = bookings.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    const paged = bookings.slice(start, start + limit);

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

  getActions: async (params = {}) => {
    await wait();
    const page = parsePage(params?.page, 1);
    const limit = parseLimit(params?.limit, 12);

    const actions = ensureActions().sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    const total = actions.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    const paged = actions.slice(start, start + limit);

    return ok({
      actions: clone(paged),
      pagination: {
        page: safePage,
        limit,
        total,
        totalPages,
      },
    });
  },

  createSubject: async (payload = {}) => {
    await wait();
    const name = String(payload?.name || '').trim();
    const category = String(payload?.category || '').trim();
    const description = String(payload?.description || '').trim();

    if (!name || !category) return fail('Name and category are required');

    const subjects = ensureSubjects();
    const exists = subjects.some(
      (item) => normalize(item.name) === normalize(name) && normalize(item.category) === normalize(category)
    );
    if (exists) return fail('Subject already exists', 409);

    const next = {
      id: `mock_subject_${Date.now()}`,
      name,
      category,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    subjects.push(next);
    writeJson(SUBJECTS_KEY, subjects);

    addAdminAction({
      action: 'SUBJECT_CREATED',
      description: `Created subject "${name}"`,
    });

    return ok(clone(next), 'Subject created');
  },

  updateSubject: async (id, payload = {}) => {
    await wait();
    const subjectId = String(id || '');
    const subjects = ensureSubjects();
    const target = subjects.find((item) => String(item.id) === subjectId);
    if (!target) return fail('Subject not found', 404);

    const nextName = String(payload?.name ?? target.name).trim();
    const nextCategory = String(payload?.category ?? target.category).trim();
    const nextDescription = String(payload?.description ?? target.description ?? '').trim();

    if (!nextName || !nextCategory) return fail('Name and category are required');

    const duplicate = subjects.some(
      (item) =>
        String(item.id) !== subjectId &&
        normalize(item.name) === normalize(nextName) &&
        normalize(item.category) === normalize(nextCategory)
    );
    if (duplicate) return fail('Another subject with the same name/category already exists', 409);

    target.name = nextName;
    target.category = nextCategory;
    target.description = nextDescription;
    target.updatedAt = new Date().toISOString();
    writeJson(SUBJECTS_KEY, subjects);

    addAdminAction({
      action: 'SUBJECT_UPDATED',
      description: `Updated subject "${nextName}"`,
    });

    return ok(clone(target), 'Subject updated');
  },

  deleteSubject: async (id) => {
    await wait();
    const subjectId = String(id || '');
    const subjects = ensureSubjects();
    const index = subjects.findIndex((item) => String(item.id) === subjectId);
    if (index < 0) return fail('Subject not found', 404);

    const [removed] = subjects.splice(index, 1);
    writeJson(SUBJECTS_KEY, subjects);

    addAdminAction({
      action: 'SUBJECT_DELETED',
      description: `Deleted subject "${removed?.name || subjectId}"`,
    });

    return ok(null, 'Subject deleted');
  },
};
