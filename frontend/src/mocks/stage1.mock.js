// src/mocks/stage1.mock.js - Mock auth API for frontend-only development

const USERS_KEY = 'mock_auth_users_v1';
const VERIFY_TOKENS_KEY = 'mock_auth_verify_tokens_v1';
const SESSION_KEY = 'mock_auth_session_v1';

const wait = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

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

const normalizeEmail = (email = '') => String(email).trim().toLowerCase();

const makeToken = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
const clone = (value) => JSON.parse(JSON.stringify(value));
const filePlaceholderUrl = (fileName = 'verification-file') =>
  `data:text/plain;charset=utf-8,${encodeURIComponent(`Mock verification file: ${fileName}`)}`;

const toVerificationFileMeta = (files = []) => {
  if (!Array.isArray(files)) return [];
  return files
    .filter((item) => item && typeof item === 'object' && item.name)
    .map((file) => ({
      originalName: String(file.name || 'verification-file'),
      fileName: String(file.name || 'verification-file'),
      size: Number(file.size || 0),
      type: String(file.type || ''),
      url: filePlaceholderUrl(file.name || 'verification-file'),
    }));
};

const DEMO_PASSWORD = 'Demo1234!';

const DEMO_USERS = [
  {
    id: 'mock_seed_learner_1',
    firstName: 'Ava',
    lastName: 'Martin',
    email: 'ava.learner@example.com',
    password: DEMO_PASSWORD,
    role: 'LEARNER',
    isEmailVerified: true,
    phone: '0412 000 001',
    bio: 'Focus on Mathematics and Physics.',
    createdAt: '2026-01-12T09:00:00.000Z',
  },
  {
    id: 'mock_seed_learner_2',
    firstName: 'Ethan',
    lastName: 'Ng',
    email: 'ethan.learner@example.com',
    password: DEMO_PASSWORD,
    role: 'LEARNER',
    isEmailVerified: true,
    phone: '0412 000 002',
    bio: 'Preparing for exams and assignments.',
    createdAt: '2026-01-20T09:00:00.000Z',
  },
  {
    id: 'mock_seed_learner_3',
    firstName: 'Mia',
    lastName: 'Lopez',
    email: 'mia.learner@example.com',
    password: DEMO_PASSWORD,
    role: 'LEARNER',
    isEmailVerified: true,
    phone: '0412 000 003',
    bio: 'Looking for coding support.',
    createdAt: '2026-02-01T09:00:00.000Z',
  },
  {
    id: 'mock_seed_tutor_user_1',
    firstName: 'Emma',
    lastName: 'Wilson',
    email: 'emma.tutor@example.com',
    password: DEMO_PASSWORD,
    role: 'TUTOR',
    isEmailVerified: true,
    tutorProfileId: 'mock_tutor_1',
    tutorProfile: { id: 'mock_tutor_1', status: 'ACTIVE' },
    createdAt: '2026-01-18T09:00:00.000Z',
  },
  {
    id: 'mock_seed_tutor_user_2',
    firstName: 'Liam',
    lastName: 'Chen',
    email: 'liam.tutor@example.com',
    password: DEMO_PASSWORD,
    role: 'TUTOR',
    isEmailVerified: true,
    tutorProfileId: 'mock_tutor_2',
    tutorProfile: { id: 'mock_tutor_2', status: 'ACTIVE' },
    createdAt: '2026-01-25T09:00:00.000Z',
  },
  {
    id: 'mock_seed_tutor_user_3',
    firstName: 'Sophie',
    lastName: 'Brown',
    email: 'sophie.tutor@example.com',
    password: DEMO_PASSWORD,
    role: 'TUTOR',
    isEmailVerified: true,
    tutorProfileId: 'mock_tutor_3',
    tutorProfile: { id: 'mock_tutor_3', status: 'ACTIVE' },
    createdAt: '2026-02-02T09:00:00.000Z',
  },
  {
    id: 'mock_seed_tutor_user_4',
    firstName: 'Noah',
    lastName: 'Patel',
    email: 'noah.tutor@example.com',
    password: DEMO_PASSWORD,
    role: 'TUTOR',
    isEmailVerified: true,
    tutorProfileId: 'mock_tutor_4',
    tutorProfile: { id: 'mock_tutor_4', status: 'PENDING' },
    createdAt: '2026-02-10T09:00:00.000Z',
  },
  {
    id: 'mock_admin_1',
    firstName: 'Alex',
    lastName: 'Admin',
    email: 'admin@mock.local',
    password: DEMO_PASSWORD,
    role: 'ADMIN',
    isEmailVerified: true,
    createdAt: '2026-01-05T09:00:00.000Z',
  },
  {
    id: 'mock_system_admin_1',
    firstName: 'System',
    lastName: 'Owner',
    email: 'sysadmin@mock.local',
    password: DEMO_PASSWORD,
    role: 'SYSTEM_ADMIN',
    isEmailVerified: true,
    createdAt: '2026-01-01T09:00:00.000Z',
  },
];

const ensureSeedUsers = () => {
  const current = readJson(USERS_KEY, []);
  const users = Array.isArray(current) ? [...current] : [];
  let changed = !Array.isArray(current);

  DEMO_USERS.forEach((seedUser) => {
    const hasSameId = users.some((user) => user.id === seedUser.id);
    const hasSameEmail = users.some(
      (user) => normalizeEmail(user.email) === normalizeEmail(seedUser.email)
    );

    if (!hasSameId && !hasSameEmail) {
      users.push(clone(seedUser));
      changed = true;
    }
  });

  if (changed) writeJson(USERS_KEY, users);
  return users;
};

const toPublicUser = (user) => {
  const { password, ...rest } = user;
  return rest;
};

const parseRegisterPayload = (payload) => {
  if (typeof FormData !== 'undefined' && payload instanceof FormData) {
    const verificationFiles = payload.getAll('verificationFiles');
    return {
      firstName: payload.get('firstName') || '',
      lastName: payload.get('lastName') || '',
      email: payload.get('email') || '',
      password: payload.get('password') || '',
      role: payload.get('role') || 'LEARNER',
      tutorEducationSummary: payload.get('tutorEducationSummary') || '',
      tutorExperienceYears: payload.get('tutorExperienceYears') || '',
      tutorSupportingNotes: payload.get('tutorSupportingNotes') || '',
      hasVerificationFiles: verificationFiles.length > 0,
      verificationFiles: toVerificationFileMeta(verificationFiles),
      isMinor: false,
      parentName: '',
      parentEmail: '',
      parentPhone: '',
    };
  }

  return {
    firstName: payload?.firstName || '',
    lastName: payload?.lastName || '',
    email: payload?.email || '',
    password: payload?.password || '',
    role: payload?.role || 'LEARNER',
    tutorEducationSummary: payload?.tutorEducationSummary || '',
    tutorExperienceYears: payload?.tutorExperienceYears || '',
    tutorSupportingNotes: payload?.tutorSupportingNotes || '',
    hasVerificationFiles: false,
    verificationFiles: Array.isArray(payload?.verificationFiles) ? payload.verificationFiles : [],
    isMinor: Boolean(payload?.isMinor),
    parentName: payload?.parentName || '',
    parentEmail: payload?.parentEmail || '',
    parentPhone: payload?.parentPhone || '',
  };
};

const createVerifyToken = (email) => {
  const tokens = readJson(VERIFY_TOKENS_KEY, []);
  const token = makeToken('verify');
  tokens.push({
    token,
    email: normalizeEmail(email),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    used: false,
  });
  writeJson(VERIFY_TOKENS_KEY, tokens);
  return token;
};

const getSessionUser = () => {
  if (typeof window === 'undefined') return null;
  const session = readJson(SESSION_KEY, null);
  if (!session) return null;

  const accessToken = localStorage.getItem('accessToken');
  if (!accessToken || accessToken !== session.accessToken) return null;

  const users = ensureSeedUsers();
  const user = users.find((item) => item.id === session.userId);
  if (!user) return null;

  return user;
};

export const authApi = {
  register: async (payload) => {
    await wait();
    const data = parseRegisterPayload(payload);
    const email = normalizeEmail(data.email);
    const users = ensureSeedUsers();

    if (!data.firstName || !data.lastName || !email || !data.password) {
      return fail('Please complete all required fields');
    }

    if (users.some((user) => normalizeEmail(user.email) === email)) {
      return fail('Email is already registered', 409);
    }

    if (data.role === 'TUTOR' && !data.tutorEducationSummary.trim()) {
      return fail('Education summary is required for tutors');
    }

    const newUser = {
      id: `mock_user_${Date.now()}`,
      firstName: String(data.firstName).trim(),
      lastName: String(data.lastName).trim(),
      email,
      password: data.password,
      role: data.role === 'TUTOR' ? 'TUTOR' : 'LEARNER',
      isEmailVerified: false,
      isMinor: data.isMinor,
      parentName: data.parentName,
      parentEmail: data.parentEmail,
      parentPhone: data.parentPhone,
      tutorEducationSummary: data.tutorEducationSummary,
      tutorExperienceYears: data.tutorExperienceYears,
      tutorSupportingNotes: data.tutorSupportingNotes,
      hasVerificationFiles: data.hasVerificationFiles,
      verificationFiles: Array.isArray(data.verificationFiles) ? data.verificationFiles : [],
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    writeJson(USERS_KEY, users);
    const verificationToken = createVerifyToken(email);

    return ok(
      {
        user: toPublicUser(newUser),
        verificationToken,
      },
      'Registered successfully'
    );
  },

  login: async ({ email, password }) => {
    await wait();
    const users = ensureSeedUsers();
    const normalizedEmail = normalizeEmail(email);
    const user = users.find((item) => normalizeEmail(item.email) === normalizedEmail);

    if (!user || user.password !== password) {
      return fail('Invalid email or password', 401);
    }

    if (!user.isEmailVerified) {
      return fail('Please verify your email before logging in', 403);
    }

    const accessToken = makeToken('mock_access');
    const refreshToken = makeToken('mock_refresh');

    writeJson(SESSION_KEY, {
      userId: user.id,
      accessToken,
      refreshToken,
      createdAt: Date.now(),
    });

    return ok({
      user: toPublicUser(user),
      accessToken,
      refreshToken,
    });
  },

  logout: async (refreshToken) => {
    await wait(200);
    const session = readJson(SESSION_KEY, null);
    if (typeof window !== 'undefined' && session && session.refreshToken === refreshToken) {
      localStorage.removeItem(SESSION_KEY);
    }
    return ok(null, 'Logged out');
  },

  getMe: async () => {
    await wait(220);
    const user = getSessionUser();
    if (!user) return fail('Unauthorized', 401);
    return ok(toPublicUser(user));
  },

  changePassword: async ({ currentPassword, newPassword }) => {
    await wait();
    const sessionUser = getSessionUser();
    if (!sessionUser) return fail('Unauthorized', 401);
    if (!newPassword || String(newPassword).length < 8) {
      return fail('New password must be at least 8 characters');
    }

    const users = readJson(USERS_KEY, []);
    const target = users.find((item) => item.id === sessionUser.id);
    if (!target) return fail('User not found', 404);
    if (target.password !== currentPassword) return fail('Current password is incorrect');

    target.password = newPassword;
    writeJson(USERS_KEY, users);
    return ok(null, 'Password updated');
  },

  verifyEmail: async (token) => {
    await wait();
    const tokens = readJson(VERIFY_TOKENS_KEY, []);
    const record = tokens.find((item) => item.token === token);

    if (!record || record.used || record.expiresAt < Date.now()) {
      return fail('This verification link is invalid or has expired.', 400);
    }

    const users = ensureSeedUsers();
    const user = users.find((item) => normalizeEmail(item.email) === record.email);
    if (!user) return fail('User not found for this verification link', 404);

    user.isEmailVerified = true;
    record.used = true;

    writeJson(USERS_KEY, users);
    writeJson(VERIFY_TOKENS_KEY, tokens);

    return ok(null, 'Email verified');
  },

  resendVerification: async ({ email }) => {
    await wait();
    const normalizedEmail = normalizeEmail(email);
    const users = ensureSeedUsers();
    const user = users.find((item) => normalizeEmail(item.email) === normalizedEmail);

    if (!user) return fail('No account found for this email', 404);
    if (user.isEmailVerified) return fail('This email is already verified', 400);

    const verificationToken = createVerifyToken(normalizedEmail);
    return ok({ verificationToken }, 'Verification email resent');
  },
};
