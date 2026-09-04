// src/mocks/stage4.mock.js - Mock APIs for stage 4 pages (tutor private + profile)

const USERS_KEY = 'mock_auth_users_v1';
const SESSION_KEY = 'mock_auth_session_v1';
const BOOKINGS_KEY = 'mock_stage3_bookings_v1';
const TUTOR_PROFILES_KEY = 'mock_stage4_tutor_profiles_v1';
const TUTOR_USER_MAP_KEY = 'mock_stage4_tutor_user_map_v1';
const MESSAGES_KEY = 'mock_stage4_messages_v1';

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

const verificationFilePlaceholderUrl = (fileName = 'verification-file.pdf') =>
  `data:text/plain;charset=utf-8,${encodeURIComponent(`Mock verification file: ${fileName}`)}`;

const fallbackVerificationFile = (fileName = 'uploaded-verification-file.pdf') => ({
  originalName: fileName,
  fileName,
  url: verificationFilePlaceholderUrl(fileName),
});

const toVerificationFileMeta = (item, index = 0) => {
  if (!item) return null;

  if (typeof item === 'string') {
    const fileName = item.trim();
    return fileName ? fallbackVerificationFile(fileName) : null;
  }

  if (typeof item !== 'object') return null;

  const hasFileFields = Boolean(item.url || item.originalName || item.fileName || item.name);
  if (!hasFileFields) return null;

  const rawName = item.originalName || item.fileName || item.name || `verification-file-${index + 1}.pdf`;
  const fileName = String(rawName || `verification-file-${index + 1}.pdf`);
  const url = String(item.url || '').trim() || verificationFilePlaceholderUrl(fileName);

  return {
    ...item,
    originalName: String(item.originalName || fileName),
    fileName: String(item.fileName || fileName),
    url,
  };
};

const normalizeVerificationFiles = (items, hasVerificationFiles = false) => {
  const source = Array.isArray(items) ? items : [];
  const files = source
    .map((item, index) => toVerificationFileMeta(item, index))
    .filter(Boolean);

  if (files.length === 0 && hasVerificationFiles) {
    files.push(fallbackVerificationFile());
  }

  return files;
};

const parseTextList = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean);
  }

  const raw = String(value || '').trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => String(item || '').trim())
        .filter(Boolean);
    }
  } catch {
    // fall back to line-based parsing
  }

  return raw
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
};

const buildTypedTextItems = (items, kind) =>
  parseTextList(items).map((text) => ({
    kind,
    text,
  }));

const buildVerificationFilesWithDescriptions = (
  files,
  descriptions,
  hasVerificationFiles = false
) =>
  normalizeVerificationFiles(files, hasVerificationFiles).map((item, index) => ({
    ...item,
    description: String(item?.description || parseTextList(descriptions)[index] || '').trim(),
  }));

const toPublicUser = (user) => {
  const { password, ...rest } = user || {};
  return rest;
};

const blobToDataUrl = (blob) =>
  new Promise((resolve) => {
    if (
      !blob ||
      typeof Blob === 'undefined' ||
      !(blob instanceof Blob) ||
      typeof FileReader === 'undefined'
    ) {
      resolve(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });

const toMockAvatarUrl = async (file, fallbackName) => {
  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName)}&background=0ea5e9&color=fff`;

  if (file && typeof Blob !== 'undefined' && file instanceof Blob) {
    const dataUrl = await blobToDataUrl(file);
    if (dataUrl) return dataUrl;
  }

  return fallback;
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

const createEmptyTutorProfile = (user) => {
  const shortBio = String(user?.shortBio || user?.bio || '').trim();
  const educationSummary = parseTextList(user?.tutorEducationItems || user?.tutorEducationSummary);
  const yearsExperience = Number(user?.tutorExperienceYears || 0);
  const supportingNotes = String(user?.tutorSupportingNotes || '').trim();
  const registrationFiles = buildVerificationFilesWithDescriptions(
    user?.verificationFiles,
    user?.verificationFileDescriptions,
    Boolean(user?.hasVerificationFiles)
  );
  const workExperienceItems = buildTypedTextItems(user?.tutorWorkExperience, 'experience');
  const qualificationItems = buildTypedTextItems(user?.tutorQualificationItems, 'qualification');
  const noteItems = supportingNotes ? [{ kind: 'note', text: supportingNotes }] : [];
  const hasSubmissionData =
    Boolean(shortBio) ||
    registrationFiles.length > 0 ||
    educationSummary.length > 0 ||
    workExperienceItems.length > 0 ||
    qualificationItems.length > 0;
  const certifications = [
    ...registrationFiles,
    ...workExperienceItems,
    ...qualificationItems,
    ...noteItems,
  ];

  return {
    id: `mock_tutor_${Date.now()}`,
    userId: user.id,
    user: {
      id: user.id,
      firstName: user.firstName || 'Tutor',
      lastName: user.lastName || '',
      email: user.email || '',
      avatar: user.avatar || '',
    },
    applicationSubmitted: hasSubmissionData,
    status: hasSubmissionData ? 'PENDING' : 'SUSPENDED',
    headline: '',
    bio: shortBio,
    hourlyRate: 50,
    currency: 'AUD',
    location: '',
    sessionTypes: ['ONLINE'],
    yearsExperience: Number.isFinite(yearsExperience) ? yearsExperience : 0,
    education: educationSummary,
    languages: [],
    availability: [],
    currentWeekAvailabilityOverride: [],
    currentWeekEffectiveAvailability: [],
    hasCurrentWeekAvailabilityOverride: false,
    subjects: [],
    certifications,
    latestReviewAction: hasSubmissionData
      ? {
          action: 'SUBMITTED',
          description: 'Application submitted and pending admin review.',
          createdAt: new Date().toISOString(),
        }
      : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

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

  const isCustomTutor = String(user.id || '').startsWith('mock_user_');
  if (isCustomTutor) {
    const registrationFiles = buildVerificationFilesWithDescriptions(
      user?.verificationFiles,
      user?.verificationFileDescriptions,
      Boolean(user?.hasVerificationFiles)
    );
    const shortBio = String(user?.shortBio || user?.bio || '').trim();
    const supportNotes = String(user.tutorSupportingNotes || '').trim();
    const summaryLines = parseTextList(user?.tutorEducationItems || user?.tutorEducationSummary);
    const years = Number(user.tutorExperienceYears || 0);
    const workExperienceItems = buildTypedTextItems(user?.tutorWorkExperience, 'experience');
    const qualificationItems = buildTypedTextItems(user?.tutorQualificationItems, 'qualification');

    if ((!Array.isArray(profile.education) || profile.education.length === 0) && summaryLines.length > 0) {
      profile.education = summaryLines;
    }
    if (!String(profile.bio || '').trim() && shortBio) {
      profile.bio = shortBio;
    }
    if ((!profile.yearsExperience || profile.yearsExperience === 0) && Number.isFinite(years) && years > 0) {
      profile.yearsExperience = years;
    }
    const currentCertifications = Array.isArray(profile.certifications)
      ? [...profile.certifications]
      : [];
    const currentFileItems = currentCertifications
      .map((item, index) => toVerificationFileMeta(item, index))
      .filter(Boolean);
    const currentTextItems = [];
    const textItemSet = new Set();
    currentCertifications.forEach((item) => {
      if (!item || typeof item !== 'object' || item.url || !item.text) return;
      const text = String(item.text).trim();
      if (!text) return;
      const kind = String(item.kind || 'note').trim().toLowerCase() || 'note';
      const key = `${kind}:${normalize(text)}`;
      if (textItemSet.has(key)) return;
      textItemSet.add(key);
      currentTextItems.push({ kind, text });
    });

    const mergedFiles = [...currentFileItems];
    const fileKeySet = new Set(
      mergedFiles.map((item) =>
        normalize(String(item.url || item.originalName || item.fileName || item.name || ''))
      )
    );
    registrationFiles.forEach((file, index) => {
      const normalizedFile = toVerificationFileMeta(file, index);
      if (!normalizedFile) return;
      const fileKey = normalize(
        String(
          normalizedFile.url ||
            normalizedFile.originalName ||
            normalizedFile.fileName ||
            normalizedFile.name ||
            ''
        )
      );
      if (!fileKey || fileKeySet.has(fileKey)) return;
      fileKeySet.add(fileKey);
      mergedFiles.push(normalizedFile);
    });

    [...workExperienceItems, ...qualificationItems, ...(supportNotes ? [{ kind: 'note', text: supportNotes }] : [])]
      .forEach((item) => {
        const key = `${item.kind}:${normalize(item.text)}`;
        if (!item.text || textItemSet.has(key)) return;
        textItemSet.add(key);
        currentTextItems.push(item);
      });

    if (mergedFiles.length > 0 || currentTextItems.length > 0) {
      profile.certifications = [...mergedFiles, ...currentTextItems];
    }
    if (
      !profile.applicationSubmitted &&
      (shortBio || registrationFiles.length > 0 || summaryLines.length > 0)
    ) {
      profile.applicationSubmitted = true;
      profile.status = 'PENDING';
      profile.latestReviewAction = {
        action: 'SUBMITTED',
        description: 'Application submitted and pending admin review.',
        createdAt: new Date().toISOString(),
      };
    }
  }

  profile.updatedAt = new Date().toISOString();

  writeTutorProfiles(profiles);

  const nextUser = updateUserRecord(user.id, {
    tutorProfileId: profileId,
    bio: profile.bio || user.bio || '',
    tutorProfile: {
      id: profileId,
      status: profile.status,
      applicationSubmitted: Boolean(profile.applicationSubmitted),
    },
  });
  updateStoredCurrentUser(nextUser || user);

  return clone(profile);
};

const readBookings = () => readJson(BOOKINGS_KEY, []);

const writeBookings = (bookings) => writeJson(BOOKINGS_KEY, bookings);

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
      notes: 'Please focus on calculus practice questions.',
      status: 'PENDING',
      currency: 'AUD',
      hourlyRate: 65,
      totalAmount: 65,
      createdAt: new Date(now - 4 * h).toISOString(),
      updatedAt: new Date(now - 4 * h).toISOString(),
      statusHistory: [
        {
          id: 'mock_booking_seed_1_h1',
          status: 'PENDING',
          createdAt: new Date(now - 4 * h).toISOString(),
          reason: '',
        },
      ],
    },
    {
      id: 'mock_booking_seed_2',
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
      scheduledAt: new Date(now + 2 * d).toISOString(),
      duration: 90,
      notes: 'Mechanics revision before quiz.',
      status: 'ACCEPTED',
      currency: 'AUD',
      hourlyRate: 65,
      totalAmount: 97.5,
      createdAt: new Date(now - 10 * h).toISOString(),
      updatedAt: new Date(now - 8 * h).toISOString(),
      statusHistory: [
        {
          id: 'mock_booking_seed_2_h1',
          status: 'PENDING',
          createdAt: new Date(now - 10 * h).toISOString(),
          reason: '',
        },
        {
          id: 'mock_booking_seed_2_h2',
          status: 'ACCEPTED',
          createdAt: new Date(now - 8 * h).toISOString(),
          reason: '',
        },
      ],
    },
    {
      id: 'mock_booking_seed_3',
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
      scheduledAt: new Date(now - 2 * d).toISOString(),
      duration: 60,
      notes: 'Finished fundamentals module.',
      status: 'COMPLETED',
      currency: 'AUD',
      hourlyRate: 72,
      totalAmount: 72,
      createdAt: new Date(now - 4 * d).toISOString(),
      updatedAt: new Date(now - 2 * d).toISOString(),
      statusHistory: [
        {
          id: 'mock_booking_seed_3_h1',
          status: 'PENDING',
          createdAt: new Date(now - 4 * d).toISOString(),
          reason: '',
        },
        {
          id: 'mock_booking_seed_3_h2',
          status: 'ACCEPTED',
          createdAt: new Date(now - 3 * d).toISOString(),
          reason: '',
        },
        {
          id: 'mock_booking_seed_3_h3',
          status: 'COMPLETED',
          createdAt: new Date(now - 2 * d).toISOString(),
          reason: '',
        },
      ],
    },
    {
      id: 'mock_booking_seed_4',
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
      notes: 'Cancelled due to schedule conflict.',
      status: 'CANCELLED',
      currency: 'AUD',
      hourlyRate: 72,
      totalAmount: 72,
      createdAt: new Date(now - 2 * d).toISOString(),
      updatedAt: new Date(now - 30 * h).toISOString(),
      cancelReason: 'Unavailable this week',
      statusHistory: [
        {
          id: 'mock_booking_seed_4_h1',
          status: 'PENDING',
          createdAt: new Date(now - 2 * d).toISOString(),
          reason: '',
        },
        {
          id: 'mock_booking_seed_4_h2',
          status: 'CANCELLED',
          createdAt: new Date(now - 30 * h).toISOString(),
          reason: 'Unavailable this week',
        },
      ],
    },
    {
      id: 'mock_booking_seed_5',
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
      notes: 'Needs help with algebra before test.',
      status: 'PENDING',
      currency: 'AUD',
      hourlyRate: 65,
      totalAmount: 65,
      createdAt: new Date(now - 2 * h).toISOString(),
      updatedAt: new Date(now - 2 * h).toISOString(),
      statusHistory: [
        {
          id: 'mock_booking_seed_5_h1',
          status: 'PENDING',
          createdAt: new Date(now - 2 * h).toISOString(),
          reason: '',
        },
      ],
    },
    {
      id: 'mock_booking_seed_6',
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
      notes: 'Upcoming chapter review.',
      status: 'ACCEPTED',
      currency: 'AUD',
      hourlyRate: 65,
      totalAmount: 65,
      createdAt: new Date(now - 9 * h).toISOString(),
      updatedAt: new Date(now - 7 * h).toISOString(),
      statusHistory: [
        {
          id: 'mock_booking_seed_6_h1',
          status: 'PENDING',
          createdAt: new Date(now - 9 * h).toISOString(),
          reason: '',
        },
        {
          id: 'mock_booking_seed_6_h2',
          status: 'ACCEPTED',
          createdAt: new Date(now - 7 * h).toISOString(),
          reason: '',
        },
      ],
    },
    {
      id: 'mock_booking_seed_7',
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
      notes: 'Declined due to mismatch in level.',
      status: 'DECLINED',
      currency: 'AUD',
      hourlyRate: 58,
      totalAmount: 58,
      createdAt: new Date(now - 12 * h).toISOString(),
      updatedAt: new Date(now - 10 * h).toISOString(),
      declineReason: 'Not available at requested level',
      statusHistory: [
        {
          id: 'mock_booking_seed_7_h1',
          status: 'PENDING',
          createdAt: new Date(now - 12 * h).toISOString(),
          reason: '',
        },
        {
          id: 'mock_booking_seed_7_h2',
          status: 'DECLINED',
          createdAt: new Date(now - 10 * h).toISOString(),
          reason: 'Not available at requested level',
        },
      ],
    },
    {
      id: 'mock_booking_seed_8',
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
      notes: 'Rescheduled once.',
      status: 'RESCHEDULED',
      currency: 'AUD',
      hourlyRate: 72,
      totalAmount: 108,
      createdAt: new Date(now - 14 * h).toISOString(),
      updatedAt: new Date(now - 6 * h).toISOString(),
      rescheduleReason: 'Tutor requested time shift',
      statusHistory: [
        {
          id: 'mock_booking_seed_8_h1',
          status: 'PENDING',
          createdAt: new Date(now - 14 * h).toISOString(),
          reason: '',
        },
        {
          id: 'mock_booking_seed_8_h2',
          status: 'ACCEPTED',
          createdAt: new Date(now - 11 * h).toISOString(),
          reason: '',
        },
        {
          id: 'mock_booking_seed_8_h3',
          status: 'RESCHEDULED',
          createdAt: new Date(now - 6 * h).toISOString(),
          reason: 'Tutor requested time shift',
        },
      ],
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
  const previousStatus = booking.status;
  const previousScheduledAt = booking.scheduledAt;

  try {
    updater(booking);
  } catch (error) {
    return Promise.reject(error);
  }

  if (!Array.isArray(booking.statusHistory)) {
    booking.statusHistory = [];
  }

  if (booking.status !== previousStatus) {
    booking.statusHistory.push({
      id: `history_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      status: booking.status,
      createdAt: new Date().toISOString(),
      reason:
        booking.declineReason ||
        booking.cancelReason ||
        booking.rescheduleReason ||
        '',
    });
  } else if (booking.scheduledAt !== previousScheduledAt) {
    booking.statusHistory.push({
      id: `history_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      status: 'RESCHEDULED',
      createdAt: new Date().toISOString(),
      reason: booking.rescheduleReason || '',
    });
  }

  booking.updatedAt = new Date().toISOString();
  bookings[index] = booking;
  writeBookings(bookings);
  return ok(enrichBooking(booking));
};

const readConversations = () => readJson(MESSAGES_KEY, []);

const writeConversations = (conversations) => writeJson(MESSAGES_KEY, conversations);

const isSameUser = (a, b) => String(a) === String(b);

const isMessageReadBy = (message, userId) =>
  Array.isArray(message?.readBy) && message.readBy.some((id) => isSameUser(id, userId));

const getChatUser = (userId) => {
  const users = getUsers();
  const user = users.find((item) => isSameUser(item.id, userId));
  const profile = ensureTutorProfiles().find(
    (item) => isSameUser(item.userId, userId) || isSameUser(item.user?.id, userId)
  );

  if (user) {
    return {
      ...toPublicUser(user),
      avatar: user.avatar || profile?.user?.avatar || '',
    };
  }

  if (profile?.user) {
    return {
      id: profile.user.id || userId,
      firstName: profile.user.firstName || 'Tutor',
      lastName: profile.user.lastName || '',
      email: profile.user.email || '',
      avatar: profile.user.avatar || '',
      role: 'TUTOR',
    };
  }

  return {
    id: userId,
    firstName: 'User',
    lastName: '',
    email: '',
    avatar: '',
  };
};

const buildSeedConversations = () => {
  const now = Date.now();
  const h = 60 * 60 * 1000;
  const m = 60 * 1000;

  return [
    {
      id: 'mock_convo_1',
      participantIds: ['mock_seed_learner_1', 'mock_seed_tutor_user_1'],
      createdAt: new Date(now - 30 * h).toISOString(),
      updatedAt: new Date(now - 18 * m).toISOString(),
      messages: [
        {
          id: 'mock_msg_1',
          conversationId: 'mock_convo_1',
          senderId: 'mock_seed_learner_1',
          receiverId: 'mock_seed_tutor_user_1',
          content: 'Hi Emma, can we go over calculus this week?',
          status: 'READ',
          readBy: ['mock_seed_learner_1', 'mock_seed_tutor_user_1'],
          createdAt: new Date(now - 26 * h).toISOString(),
          updatedAt: new Date(now - 26 * h).toISOString(),
        },
        {
          id: 'mock_msg_2',
          conversationId: 'mock_convo_1',
          senderId: 'mock_seed_tutor_user_1',
          receiverId: 'mock_seed_learner_1',
          content: 'Sure, send me the topics you want to focus on.',
          status: 'READ',
          readBy: ['mock_seed_learner_1', 'mock_seed_tutor_user_1'],
          createdAt: new Date(now - 24 * h).toISOString(),
          updatedAt: new Date(now - 24 * h).toISOString(),
        },
        {
          id: 'mock_msg_3',
          conversationId: 'mock_convo_1',
          senderId: 'mock_seed_tutor_user_1',
          receiverId: 'mock_seed_learner_1',
          content: 'I also have a slot on Thursday night if that helps.',
          status: 'DELIVERED',
          readBy: ['mock_seed_tutor_user_1'],
          createdAt: new Date(now - 18 * m).toISOString(),
          updatedAt: new Date(now - 18 * m).toISOString(),
        },
      ],
    },
    {
      id: 'mock_convo_2',
      participantIds: ['mock_seed_learner_1', 'mock_seed_tutor_user_2'],
      createdAt: new Date(now - 12 * h).toISOString(),
      updatedAt: new Date(now - 3 * h).toISOString(),
      messages: [
        {
          id: 'mock_msg_4',
          conversationId: 'mock_convo_2',
          senderId: 'mock_seed_learner_1',
          receiverId: 'mock_seed_tutor_user_2',
          content: 'Thanks again for the data visualisation notes.',
          status: 'READ',
          readBy: ['mock_seed_learner_1', 'mock_seed_tutor_user_2'],
          createdAt: new Date(now - 5 * h).toISOString(),
          updatedAt: new Date(now - 5 * h).toISOString(),
        },
        {
          id: 'mock_msg_5',
          conversationId: 'mock_convo_2',
          senderId: 'mock_seed_tutor_user_2',
          receiverId: 'mock_seed_learner_1',
          content: 'No worries, happy to help.',
          status: 'READ',
          readBy: ['mock_seed_learner_1', 'mock_seed_tutor_user_2'],
          createdAt: new Date(now - 3 * h).toISOString(),
          updatedAt: new Date(now - 3 * h).toISOString(),
        },
      ],
    },
    {
      id: 'mock_convo_3',
      participantIds: ['mock_seed_learner_2', 'mock_seed_tutor_user_1'],
      createdAt: new Date(now - 10 * h).toISOString(),
      updatedAt: new Date(now - 45 * m).toISOString(),
      messages: [
        {
          id: 'mock_msg_6',
          conversationId: 'mock_convo_3',
          senderId: 'mock_seed_learner_2',
          receiverId: 'mock_seed_tutor_user_1',
          content: 'I uploaded the worksheet for tomorrow.',
          status: 'DELIVERED',
          readBy: ['mock_seed_learner_2'],
          createdAt: new Date(now - 45 * m).toISOString(),
          updatedAt: new Date(now - 45 * m).toISOString(),
        },
      ],
    },
    {
      id: 'mock_convo_4',
      participantIds: ['mock_seed_learner_3', 'mock_seed_tutor_user_2'],
      createdAt: new Date(now - 8 * h).toISOString(),
      updatedAt: new Date(now - 90 * m).toISOString(),
      messages: [
        {
          id: 'mock_msg_7',
          conversationId: 'mock_convo_4',
          senderId: 'mock_seed_tutor_user_2',
          receiverId: 'mock_seed_learner_3',
          content: 'Let me know if you want extra Python exercises.',
          status: 'READ',
          readBy: ['mock_seed_learner_3', 'mock_seed_tutor_user_2'],
          createdAt: new Date(now - 90 * m).toISOString(),
          updatedAt: new Date(now - 90 * m).toISOString(),
        },
      ],
    },
  ];
};

const ensureConversations = () => {
  const current = readConversations();
  if (Array.isArray(current) && current.length > 0) return current;
  const seeded = buildSeedConversations();
  writeConversations(seeded);
  return seeded;
};

const sortConversationMessages = (messages = []) =>
  [...messages].sort(
    (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
  );

const buildConversationData = (conversation, currentUserId) => {
  const messages = sortConversationMessages(conversation?.messages || []);
  const participants = (conversation?.participantIds || []).map((userId) => ({
    userId,
    user: getChatUser(userId),
  }));
  const unreadCount = messages.filter(
    (message) =>
      !isSameUser(message.senderId, currentUserId) && !isMessageReadBy(message, currentUserId)
  ).length;
  const lastMessage = messages[messages.length - 1] || null;

  return {
    id: conversation.id,
    participants,
    messages,
    lastMessage,
    unreadCount,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt || lastMessage?.createdAt || conversation.createdAt,
  };
};

const countUnreadMessages = (conversation, userId) =>
  sortConversationMessages(conversation?.messages || []).filter(
    (message) =>
      !isSameUser(message.senderId, userId) && !isMessageReadBy(message, userId)
  ).length;

const findConversationByUsers = (conversations, firstUserId, secondUserId) =>
  conversations.find((conversation) => {
    const ids = conversation.participantIds || [];
    return (
      ids.length === 2 &&
      ids.some((id) => isSameUser(id, firstUserId)) &&
      ids.some((id) => isSameUser(id, secondUserId))
    );
  });

const paginateMessages = (messages, params = {}) => {
  const page = parsePage(params?.page, 1);
  const limit = parseLimit(params?.limit, 50);
  const total = messages.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const start = Math.max(0, total - safePage * limit);
  const end = total - (safePage - 1) * limit;

  return {
    messages: messages.slice(start, end),
    pagination: {
      page: safePage,
      limit,
      total,
      totalPages,
    },
  };
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
      shortBio: payload.get('shortBio') || '',
      tutorEducationSummary: payload.get('tutorEducationSummary') || '',
      tutorEducationItems: payload.get('tutorEducationItems') || '',
      tutorExperienceYears: payload.get('tutorExperienceYears') || '',
      tutorWorkExperience: payload.get('tutorWorkExperience') || '',
      tutorQualificationItems: payload.get('tutorQualificationItems') || '',
      tutorSupportingNotes: payload.get('tutorSupportingNotes') || '',
      verificationFileDescriptions: payload.get('verificationFileDescriptions') || '',
      verificationFiles: payload.getAll('verificationFiles') || [],
    };
  }

  return {
    shortBio: payload?.shortBio || '',
    tutorEducationSummary: payload?.tutorEducationSummary || '',
    tutorEducationItems: payload?.tutorEducationItems || '',
    tutorExperienceYears: payload?.tutorExperienceYears || '',
    tutorWorkExperience: payload?.tutorWorkExperience || '',
    tutorQualificationItems: payload?.tutorQualificationItems || '',
    tutorSupportingNotes: payload?.tutorSupportingNotes || '',
    verificationFileDescriptions: payload?.verificationFileDescriptions || '',
    verificationFiles: payload?.verificationFiles || [],
  };
};

export const tutorApi = {
  getMyProfile: async () => {
    await wait();
    const sessionUser = getSessionUser();
    if (!sessionUser) return fail('Unauthorized', 401);
    if (sessionUser.role !== 'TUTOR') return fail('Tutor access required', 403);

    const profile = ensureTutorProfileForUser(sessionUser);
    profile.currentWeekAvailabilityOverride = Array.isArray(profile.currentWeekAvailabilityOverride)
      ? profile.currentWeekAvailabilityOverride
      : [];
    profile.currentWeekEffectiveAvailability = profile.hasCurrentWeekAvailabilityOverride
      ? [...profile.currentWeekAvailabilityOverride]
      : [...(profile.availability || [])];
    profile.hasCurrentWeekAvailabilityOverride = Boolean(profile.hasCurrentWeekAvailabilityOverride);
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

  updateCurrentWeekAvailability: async (payload = []) => {
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

    profiles[index].currentWeekAvailabilityOverride = slots
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
    profiles[index].hasCurrentWeekAvailabilityOverride = true;
    profiles[index].currentWeekEffectiveAvailability = [
      ...profiles[index].currentWeekAvailabilityOverride,
    ];
    profiles[index].updatedAt = new Date().toISOString();

    writeTutorProfiles(profiles);

    return ok(
      {
        currentWeekAvailabilityOverride: clone(profiles[index].currentWeekAvailabilityOverride),
        hasCurrentWeekAvailabilityOverride: true,
      },
      'This week availability updated'
    );
  },

  clearCurrentWeekAvailability: async () => {
    await wait();
    const sessionUser = getSessionUser();
    if (!sessionUser) return fail('Unauthorized', 401);
    if (sessionUser.role !== 'TUTOR') return fail('Tutor access required', 403);

    const profiles = ensureTutorProfiles();
    const profile = ensureTutorProfileForUser(sessionUser);
    const index = profiles.findIndex((item) => item.id === profile.id);
    if (index < 0) return fail('Tutor profile not found', 404);

    profiles[index].currentWeekAvailabilityOverride = [];
    profiles[index].currentWeekEffectiveAvailability = [...(profiles[index].availability || [])];
    profiles[index].hasCurrentWeekAvailabilityOverride = false;
    profiles[index].updatedAt = new Date().toISOString();

    writeTutorProfiles(profiles);
    return ok(null, 'Current week availability override cleared');
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
    if (String(profile.status || '').toUpperCase() === 'ACTIVE') {
      return fail(
        'Application resubmission is only available when your tutor verification is pending review or returned for updates',
        403
      );
    }

    const parsed = parseApplicationPayload(payload);
    const shortBio = String(parsed.shortBio || '').trim();
    const educationItems = parseTextList(
      parsed.tutorEducationItems || parsed.tutorEducationSummary
    );
    const workExperienceItems = buildTypedTextItems(parsed.tutorWorkExperience, 'experience');
    const qualificationItems = buildTypedTextItems(
      parsed.tutorQualificationItems,
      'qualification'
    );
    const noteItems = String(parsed.tutorSupportingNotes || '').trim()
      ? [{ kind: 'note', text: String(parsed.tutorSupportingNotes || '').trim() }]
      : [];
    const currentFiles = normalizeVerificationFiles(profile.certifications || []);
    const uploadedFiles = buildVerificationFilesWithDescriptions(
      parsed.verificationFiles || [],
      parsed.verificationFileDescriptions || ''
    );
    const mergedFiles = [...currentFiles];
    const fileKeys = new Set(
      mergedFiles.map((item) =>
        normalize(String(item.url || item.originalName || item.fileName || item.name || ''))
      )
    );

    uploadedFiles.forEach((file) => {
      const key = normalize(
        String(file.url || file.originalName || file.fileName || file.name || '')
      );
      if (!key || fileKeys.has(key)) return;
      fileKeys.add(key);
      mergedFiles.push(file);
    });

    if (!shortBio) {
      return fail('Short bio is required');
    }

    if (educationItems.length === 0) {
      return fail('Education is required');
    }

    if (mergedFiles.length === 0) {
      return fail('Please upload at least one verification file');
    }

    if (uploadedFiles.some((item) => !String(item.description || '').trim())) {
      return fail('Each uploaded file needs a short description');
    }
    profiles[index].bio = shortBio;
    profiles[index].education = educationItems;
    profiles[index].yearsExperience = Number(parsed.tutorExperienceYears || 0);
    profiles[index].applicationSubmitted = true;
    profiles[index].certifications = [
      ...mergedFiles,
      ...workExperienceItems,
      ...qualificationItems,
      ...noteItems,
    ];

    profiles[index].status = 'PENDING';
    profiles[index].latestReviewAction = {
      action: profile.applicationSubmitted ? 'RESUBMITTED' : 'SUBMITTED',
      description: 'Application submitted and pending admin review.',
      createdAt: new Date().toISOString(),
    };
    profiles[index].updatedAt = new Date().toISOString();

    writeTutorProfiles(profiles);

    const nextUser = updateUserRecord(sessionUser.id, {
      bio: shortBio,
      tutorProfileId: profiles[index].id,
      tutorProfile: {
        id: profiles[index].id,
        status: profiles[index].status,
        applicationSubmitted: true,
      },
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

export const messageApi = {
  getConversations: async () => {
    await wait(180);
    const sessionUser = getSessionUser();
    if (!sessionUser) return fail('Unauthorized', 401);

    const conversations = ensureConversations()
      .filter((conversation) => (conversation.participantIds || []).some((id) => isSameUser(id, sessionUser.id)))
      .map((conversation) => buildConversationData(conversation, sessionUser.id))
      .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());

    return ok({ conversations });
  },

  createConversation: async (userId) => {
    await wait(180);
    const sessionUser = getSessionUser();
    if (!sessionUser) return fail('Unauthorized', 401);
    if (!userId) return fail('User is required');
    if (isSameUser(userId, sessionUser.id)) return fail('Cannot message yourself');

    const targetUser = getChatUser(userId);
    if (!targetUser?.id || !targetUser?.email) return fail('User not found', 404);

    const conversations = ensureConversations();
    let conversation = findConversationByUsers(conversations, sessionUser.id, userId);

    if (!conversation) {
      const now = new Date().toISOString();
      conversation = {
        id: `mock_convo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        participantIds: [sessionUser.id, String(userId)],
        createdAt: now,
        updatedAt: now,
        messages: [],
      };
      conversations.unshift(conversation);
      writeConversations(conversations);
    }

    return ok(buildConversationData(conversation, sessionUser.id), 'Conversation ready');
  },

  getMessages: async (conversationId, params = {}) => {
    await wait(160);
    const sessionUser = getSessionUser();
    if (!sessionUser) return fail('Unauthorized', 401);

    const conversation = ensureConversations().find((item) => isSameUser(item.id, conversationId));
    if (!conversation) return fail('Conversation not found', 404);
    if (!(conversation.participantIds || []).some((id) => isSameUser(id, sessionUser.id))) {
      return fail('Forbidden', 403);
    }

    const messages = sortConversationMessages(conversation.messages || []);
    if (!params?.page && !params?.limit) {
      return ok({ messages });
    }

    return ok(paginateMessages(messages, params));
  },

  sendMessage: async (conversationId, payload = {}) => {
    await wait(140);
    const sessionUser = getSessionUser();
    if (!sessionUser) return fail('Unauthorized', 401);

    const content = String(payload?.content || '').trim();
    if (!content) return fail('Message content is required');

    const conversations = ensureConversations();
    const index = conversations.findIndex((item) => isSameUser(item.id, conversationId));
    if (index < 0) return fail('Conversation not found', 404);

    const conversation = conversations[index];
    if (!(conversation.participantIds || []).some((id) => isSameUser(id, sessionUser.id))) {
      return fail('Forbidden', 403);
    }

    const receiverId = (conversation.participantIds || []).find((id) => !isSameUser(id, sessionUser.id));
    if (!receiverId) return fail('Conversation invalid', 400);

    const now = new Date().toISOString();
    const message = {
      id: `mock_msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      conversationId: conversation.id,
      senderId: sessionUser.id,
      receiverId,
      content,
      status: 'SENT',
      readBy: [sessionUser.id],
      createdAt: now,
      updatedAt: now,
    };

    conversation.messages = [...(conversation.messages || []), message];
    conversation.updatedAt = now;
    conversations[index] = conversation;
    writeConversations(conversations);

    return ok(message, 'Message sent');
  },

  generateAiReply: async (conversationId) => {
    await wait(420);
    const sessionUser = getSessionUser();
    if (!sessionUser) return fail('Unauthorized', 401);

    const conversation = ensureConversations().find((item) => isSameUser(item.id, conversationId));
    if (!conversation) return fail('Conversation not found', 404);
    if (!(conversation.participantIds || []).some((id) => isSameUser(id, sessionUser.id))) {
      return fail('Forbidden', 403);
    }

    const lastIncoming = sortConversationMessages(conversation.messages || [])
      .reverse()
      .find((message) => !isSameUser(message.senderId, sessionUser.id));
    const content = String(lastIncoming?.content || '');
    const reply = content.includes('?')
      ? 'Thanks for asking. That works for me, and I can share more detail if helpful.'
      : 'Thanks for the update. That sounds good to me, and I will keep an eye out for the next step.';

    return ok({ reply, mode: 'mock' }, 'AI reply generated');
  },

  markAsRead: async (conversationId) => {
    await wait(120);
    const sessionUser = getSessionUser();
    if (!sessionUser) return fail('Unauthorized', 401);

    const conversations = ensureConversations();
    const index = conversations.findIndex((item) => isSameUser(item.id, conversationId));
    if (index < 0) return fail('Conversation not found', 404);

    const conversation = conversations[index];
    if (!(conversation.participantIds || []).some((id) => isSameUser(id, sessionUser.id))) {
      return fail('Forbidden', 403);
    }

    let changed = 0;
    conversation.messages = sortConversationMessages(conversation.messages || []).map((message) => {
      if (isSameUser(message.senderId, sessionUser.id) || isMessageReadBy(message, sessionUser.id)) {
        return message;
      }
      changed += 1;
      return {
        ...message,
        status: 'READ',
        readBy: [...(message.readBy || []), sessionUser.id],
        updatedAt: new Date().toISOString(),
      };
    });

    conversations[index] = conversation;
    if (changed > 0) {
      writeConversations(conversations);
    }

    return ok({ count: changed }, 'Messages read');
  },

  getUnreadCount: async () => {
    await wait(100);
    const sessionUser = getSessionUser();
    if (!sessionUser) return fail('Unauthorized', 401);

    const count = ensureConversations()
      .filter((conversation) => (conversation.participantIds || []).some((id) => isSameUser(id, sessionUser.id)))
      .reduce((sum, conversation) => sum + countUnreadMessages(conversation, sessionUser.id), 0);

    return ok({ count });
  },
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
    let avatar = await toMockAvatarUrl(file, fallbackName);

    let nextUser;
    try {
      nextUser = updateUserRecord(sessionUser.id, { avatar });
    } catch {
      avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName)}&background=0ea5e9&color=fff`;
      nextUser = updateUserRecord(sessionUser.id, { avatar });
    }
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
