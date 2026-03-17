// src/mocks/stage2.mock.js - Mock tutor/subject APIs for stage 2 pages

const wait = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));
const STAGE4_TUTOR_PROFILES_KEY = 'mock_stage4_tutor_profiles_v1';
const STAGE5_SUBJECTS_KEY = 'mock_stage5_subjects_v1';

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

const getStage5Subjects = () => {
  const extras = readJson(STAGE5_SUBJECTS_KEY, []);
  if (!Array.isArray(extras)) return [];
  return extras
    .map((item) => ({
      id: item?.id ? String(item.id) : '',
      name: item?.name ? String(item.name) : '',
      category: item?.category ? String(item.category) : '',
    }))
    .filter((item) => item.id && item.name);
};

const MOCK_TUTORS = [
  {
    id: 'mock_tutor_1',
    userId: 'mock_user_t_1',
    user: { firstName: 'Emma', lastName: 'Wilson', avatar: '' },
    headline: 'Math and Physics Tutor',
    bio: 'I help high school and first-year uni students build confidence in STEM subjects.',
    hourlyRate: 65,
    currency: 'AUD',
    rating: 4.9,
    totalSessions: 126,
    location: 'Sydney, NSW',
    isVerified: true,
    yearsExperience: 6,
    languages: ['English'],
    education: [
      { degree: 'BSc', field: 'Physics', institution: 'UNSW' },
      { degree: 'MTeach', field: 'Secondary Education', institution: 'USYD' },
    ],
    sessionTypes: ['ONLINE', 'IN_PERSON'],
    subjects: [
      {
        id: 'ts_1',
        subjectId: 'subj_math',
        level: 'ADVANCED',
        subject: { id: 'subj_math', name: 'Mathematics', category: 'STEM' },
      },
      {
        id: 'ts_2',
        subjectId: 'subj_physics',
        level: 'INTERMEDIATE',
        subject: { id: 'subj_physics', name: 'Physics', category: 'STEM' },
      },
    ],
  },
  {
    id: 'mock_tutor_2',
    userId: 'mock_user_t_2',
    user: { firstName: 'Liam', lastName: 'Chen', avatar: '' },
    headline: 'Programming and Data Science Tutor',
    bio: 'I teach Python, JavaScript and data projects with practical examples.',
    hourlyRate: 72,
    currency: 'AUD',
    rating: 4.8,
    totalSessions: 98,
    location: 'Melbourne, VIC',
    isVerified: true,
    yearsExperience: 5,
    languages: ['English', 'Mandarin'],
    education: [{ degree: 'BEng', field: 'Software Engineering', institution: 'Monash' }],
    sessionTypes: ['ONLINE', 'HYBRID'],
    subjects: [
      {
        id: 'ts_3',
        subjectId: 'subj_programming',
        level: 'ALL_LEVELS',
        subject: { id: 'subj_programming', name: 'Programming', category: 'Technology' },
      },
      {
        id: 'ts_4',
        subjectId: 'subj_data_science',
        level: 'INTERMEDIATE',
        subject: { id: 'subj_data_science', name: 'Data Science', category: 'Technology' },
      },
    ],
  },
  {
    id: 'mock_tutor_3',
    userId: 'mock_user_t_3',
    user: { firstName: 'Sophie', lastName: 'Brown', avatar: '' },
    headline: 'English and IELTS Coach',
    bio: 'I focus on writing structure, speaking fluency and exam confidence.',
    hourlyRate: 58,
    currency: 'AUD',
    rating: 4.7,
    totalSessions: 140,
    location: 'Brisbane, QLD',
    isVerified: true,
    yearsExperience: 8,
    languages: ['English'],
    education: [{ degree: 'BA', field: 'Linguistics', institution: 'UQ' }],
    sessionTypes: ['ONLINE', 'IN_PERSON', 'HYBRID'],
    subjects: [
      {
        id: 'ts_5',
        subjectId: 'subj_english',
        level: 'ALL_LEVELS',
        subject: { id: 'subj_english', name: 'English', category: 'Languages' },
      },
      {
        id: 'ts_6',
        subjectId: 'subj_ielts',
        level: 'ADVANCED',
        subject: { id: 'subj_ielts', name: 'IELTS Prep', category: 'Languages' },
      },
    ],
  },
  {
    id: 'mock_tutor_4',
    userId: 'mock_user_t_4',
    user: { firstName: 'Noah', lastName: 'Patel', avatar: '' },
    headline: 'General Science Tutor',
    bio: 'Friendly support for school science and problem-solving skills.',
    hourlyRate: 52,
    currency: 'AUD',
    rating: 4.6,
    totalSessions: 64,
    location: 'Perth, WA',
    isVerified: false,
    yearsExperience: 3,
    languages: ['English', 'Hindi'],
    education: [{ degree: 'BSc', field: 'Chemistry', institution: 'UWA' }],
    sessionTypes: ['ONLINE'],
    subjects: [
      {
        id: 'ts_7',
        subjectId: 'subj_science',
        level: 'INTERMEDIATE',
        subject: { id: 'subj_science', name: 'Science', category: 'STEM' },
      },
    ],
  },
];

const MOCK_AVAILABILITY = {
  mock_tutor_1: [
    { dayOfWeek: 1, startTime: '16:00', endTime: '19:00' },
    { dayOfWeek: 3, startTime: '17:00', endTime: '20:00' },
    { dayOfWeek: 6, startTime: '09:00', endTime: '12:00' },
  ],
  mock_tutor_2: [
    { dayOfWeek: 2, startTime: '18:00', endTime: '21:00' },
    { dayOfWeek: 4, startTime: '18:00', endTime: '21:00' },
    { dayOfWeek: 0, startTime: '10:00', endTime: '13:00' },
  ],
  mock_tutor_3: [
    { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
    { dayOfWeek: 5, startTime: '14:00', endTime: '18:00' },
  ],
  mock_tutor_4: [{ dayOfWeek: 6, startTime: '11:00', endTime: '15:00' }],
};

const normalize = (value = '') => String(value).trim().toLowerCase();

const clone = (data) => JSON.parse(JSON.stringify(data));

const mapStage4Education = (education = []) => {
  if (!Array.isArray(education)) return [];
  return education
    .map((item) => {
      if (typeof item === 'string') return { degree: item };
      if (item && typeof item === 'object') {
        return {
          degree: item.degree || item.text || '',
          field: item.field || '',
          institution: item.institution || '',
        };
      }
      return null;
    })
    .filter(Boolean);
};

const getTutorFromStage4 = (id) => {
  const profiles = readJson(STAGE4_TUTOR_PROFILES_KEY, []);
  const profile = profiles.find((item) => String(item.id) === String(id));
  if (!profile) return null;

  return {
    id: profile.id,
    userId: profile.userId,
    user: {
      firstName: profile.user?.firstName || 'Tutor',
      lastName: profile.user?.lastName || '',
      avatar: profile.user?.avatar || '',
    },
    headline: profile.headline || 'Tutor',
    bio: profile.bio || '',
    hourlyRate: Number(profile.hourlyRate || 0),
    currency: profile.currency || 'AUD',
    rating: 0,
    totalSessions: 0,
    location: profile.location || '',
    isVerified: String(profile.status || '').toUpperCase() === 'ACTIVE',
    yearsExperience: Number(profile.yearsExperience || 0),
    languages: Array.isArray(profile.languages) ? profile.languages : [],
    education: mapStage4Education(profile.education),
    sessionTypes: Array.isArray(profile.sessionTypes) ? profile.sessionTypes : ['ONLINE'],
    subjects: Array.isArray(profile.subjects)
      ? profile.subjects.map((item, index) => ({
          id: item.id || `stage4_subject_${index}`,
          subjectId: item.subjectId || item.subject?.id || '',
          level: String(item.level || 'ALL_LEVELS').toUpperCase(),
          subject: item.subject || {
            id: item.subjectId || '',
            name: 'Subject',
            category: 'General',
          },
        }))
      : [],
  };
};

const getAllSubjects = () => {
  const map = new Map();

  MOCK_TUTORS.forEach((tutor) => {
    (tutor.subjects || []).forEach((item) => {
      const id = item?.subject?.id || item?.subjectId;
      const name = item?.subject?.name || '';
      const category = item?.subject?.category || '';
      if (!id || !name) return;
      if (!map.has(id)) {
        map.set(id, { id, name, category });
      }
    });
  });

  getStage5Subjects().forEach((item) => {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  });

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
};

const filterAndSortTutors = (params = {}) => {
  const subject = normalize(params.subject);
  const location = normalize(params.location);
  const sessionType = normalize(params.sessionType);
  const sort = params.sort || 'rating';

  let result = clone(MOCK_TUTORS);

  if (subject) {
    result = result.filter((tutor) => {
      const inHeadline = normalize(tutor.headline).includes(subject);
      const inSubjects = (tutor.subjects || []).some((item) => {
        const name = normalize(item?.subject?.name || item?.name || '');
        const category = normalize(item?.subject?.category || item?.category || '');
        return name.includes(subject) || category.includes(subject);
      });
      return inHeadline || inSubjects;
    });
  }

  if (location) {
    result = result.filter((tutor) => normalize(tutor.location).includes(location));
  }

  if (sessionType) {
    result = result.filter((tutor) =>
      (tutor.sessionTypes || []).some((type) => normalize(type) === sessionType)
    );
  }

  if (sort === 'rate_asc') {
    result.sort((a, b) => Number(a.hourlyRate || 0) - Number(b.hourlyRate || 0));
  } else if (sort === 'rate_desc') {
    result.sort((a, b) => Number(b.hourlyRate || 0) - Number(a.hourlyRate || 0));
  } else if (sort === 'experience') {
    result.sort((a, b) => Number(b.yearsExperience || 0) - Number(a.yearsExperience || 0));
  } else {
    result.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
  }

  return result;
};

export const subjectApi = {
  getCategories: async () => {
    await wait();
    const categories = Array.from(
      new Set(
        getAllSubjects()
          .map((item) => item.category)
          .filter(Boolean)
      )
    );
    return ok(categories);
  },

  getAll: async () => {
    await wait();
    return ok({ subjects: getAllSubjects() });
  },
};

export const tutorApi = {
  search: async (params = {}) => {
    await wait();
    const filtered = filterAndSortTutors(params);

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 10);
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    const tutors = filtered.slice(start, start + limit);

    return ok({
      tutors,
      pagination: {
        page: safePage,
        limit,
        total,
        totalPages,
      },
    });
  },

  getById: async (id) => {
    await wait();
    const tutor =
      MOCK_TUTORS.find((item) => String(item.id) === String(id)) || getTutorFromStage4(id);
    if (!tutor) return fail('Tutor not found', 404);
    return ok(clone(tutor));
  },

  getAvailability: async (id) => {
    await wait(200);
    const tutor =
      MOCK_TUTORS.find((item) => String(item.id) === String(id)) || getTutorFromStage4(id);
    if (!tutor) return fail('Tutor not found', 404);
    if (MOCK_AVAILABILITY[id]) return ok(clone(MOCK_AVAILABILITY[id]));

    const profiles = readJson(STAGE4_TUTOR_PROFILES_KEY, []);
    const profile = profiles.find((item) => String(item.id) === String(id));
    return ok(clone(profile?.availability || []));
  },
};
