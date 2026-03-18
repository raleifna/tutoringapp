// src/mocks/stage3.mock.js - Mock booking APIs for stage 3 pages

import { tutorApi as stage2TutorApi } from './stage2.mock.js';

const USERS_KEY = 'mock_auth_users_v1';
const SESSION_KEY = 'mock_auth_session_v1';
const BOOKINGS_KEY = 'mock_stage3_bookings_v1';
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

const fail = (message, status = 400) =>
  Promise.reject({
    response: {
      status,
      data: { message },
    },
  });

const clone = (value) => JSON.parse(JSON.stringify(value));
const getUsers = () => readJson(USERS_KEY, []);

const getSessionUser = () => {
  if (typeof window === 'undefined') return null;

  const session = readJson(SESSION_KEY, null);
  if (!session) return null;

  const accessToken = localStorage.getItem('accessToken');
  if (!accessToken || accessToken !== session.accessToken) return null;

  const users = readJson(USERS_KEY, []);
  return users.find((user) => user.id === session.userId) || null;
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
      tutorId: 'mock_tutor_1',
      tutorProfile: {
        id: 'mock_tutor_1',
        user: {
          id: 'mock_seed_tutor_user_1',
          firstName: 'Emma',
          lastName: 'Wilson',
          avatar: '',
          email: 'emma.tutor@example.com',
        },
      },
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
      learnerId: 'mock_seed_learner_1',
      tutorId: 'mock_tutor_1',
      tutorProfile: {
        id: 'mock_tutor_1',
        user: {
          id: 'mock_seed_tutor_user_1',
          firstName: 'Emma',
          lastName: 'Wilson',
          avatar: '',
          email: 'emma.tutor@example.com',
        },
      },
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
      learnerId: 'mock_seed_learner_1',
      tutorId: 'mock_tutor_2',
      tutorProfile: {
        id: 'mock_tutor_2',
        user: {
          id: 'mock_seed_tutor_user_2',
          firstName: 'Liam',
          lastName: 'Chen',
          avatar: '',
          email: 'liam.tutor@example.com',
        },
      },
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
      tutorId: 'mock_tutor_2',
      tutorProfile: {
        id: 'mock_tutor_2',
        user: {
          id: 'mock_seed_tutor_user_2',
          firstName: 'Liam',
          lastName: 'Chen',
          avatar: '',
          email: 'liam.tutor@example.com',
        },
      },
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
      tutorId: 'mock_tutor_1',
      tutorProfile: {
        id: 'mock_tutor_1',
        user: {
          id: 'mock_seed_tutor_user_1',
          firstName: 'Emma',
          lastName: 'Wilson',
          avatar: '',
          email: 'emma.tutor@example.com',
        },
      },
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
      tutorId: 'mock_tutor_1',
      tutorProfile: {
        id: 'mock_tutor_1',
        user: {
          id: 'mock_seed_tutor_user_1',
          firstName: 'Emma',
          lastName: 'Wilson',
          avatar: '',
          email: 'emma.tutor@example.com',
        },
      },
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
      tutorId: 'mock_tutor_3',
      tutorProfile: {
        id: 'mock_tutor_3',
        user: {
          id: 'mock_seed_tutor_user_3',
          firstName: 'Sophie',
          lastName: 'Brown',
          avatar: '',
          email: 'sophie.tutor@example.com',
        },
      },
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
      tutorId: 'mock_tutor_2',
      tutorProfile: {
        id: 'mock_tutor_2',
        user: {
          id: 'mock_seed_tutor_user_2',
          firstName: 'Liam',
          lastName: 'Chen',
          avatar: '',
          email: 'liam.tutor@example.com',
        },
      },
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

const parsePage = (page) => {
  const parsed = Number(page);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
};

const parseLimit = (limit) => {
  const parsed = Number(limit);
  if (!Number.isFinite(parsed) || parsed < 1) return 10;
  return Math.floor(parsed);
};

const pickTutorSubject = (tutor, subjectId, subjectName) => {
  if (!tutor || !Array.isArray(tutor.subjects)) return null;

  const byId = tutor.subjects.find((item) => {
    const id = String(item?.subjectId || item?.subject?.id || item?.id || '');
    return id === String(subjectId || '');
  });
  if (byId) return byId;

  if (subjectName) {
    const normalized = String(subjectName).trim().toLowerCase();
    return (
      tutor.subjects.find((item) => {
        const name = String(item?.subject?.name || item?.name || '')
          .trim()
          .toLowerCase();
        return name === normalized;
      }) || null
    );
  }

  return null;
};

const ensureLearner = (user) => {
  if (!user) return fail('Unauthorized', 401);
  if (user.role !== 'LEARNER') return fail('Only learners can access this action', 403);
  return null;
};

const getTutorProfileIdFromUser = (user) => {
  if (!user) return null;
  if (user.tutorProfileId) return String(user.tutorProfileId);
  const map = readJson(TUTOR_USER_MAP_KEY, {});
  if (map && map[user.id]) return String(map[user.id]);
  return null;
};

const sortBookings = (bookings) =>
  [...bookings].sort((a, b) => {
    const aTime = new Date(a.createdAt || a.scheduledAt || 0).getTime();
    const bTime = new Date(b.createdAt || b.scheduledAt || 0).getTime();
    return bTime - aTime;
  });

const toLearnerSummary = (learnerId) => {
  const user = getUsers().find((item) => String(item.id) === String(learnerId));
  if (!user) {
    return {
      id: String(learnerId || ''),
      firstName: 'Learner',
      lastName: '',
      email: '',
      avatar: '',
    };
  }
  return {
    id: String(user.id || learnerId || ''),
    firstName: user.firstName || 'Learner',
    lastName: user.lastName || '',
    email: user.email || '',
    avatar: user.avatar || '',
  };
};

const enrichBooking = (booking) => ({
  ...booking,
  learner: toLearnerSummary(booking?.learnerId),
});

export const bookingApi = {
  create: async (payload = {}) => {
    await wait();

    const sessionUser = getSessionUser();
    const learnerError = ensureLearner(sessionUser);
    if (learnerError) return learnerError;

    const tutorId = String(payload?.tutorId || '').trim();
    const subjectId = String(payload?.subjectId || '').trim();
    const subjectName = String(payload?.subject || '').trim();
    const sessionType = String(payload?.sessionType || 'ONLINE').trim();
    const notes = String(payload?.notes || '').trim();
    const duration = Number(payload?.duration || 0);
    const scheduledAtRaw = payload?.scheduledAt;
    const scheduledAt = new Date(scheduledAtRaw);

    if (!tutorId) return fail('Tutor is required');
    if (!subjectId) return fail('Subject is required');
    if (!Number.isFinite(duration) || duration < 30 || duration > 360) {
      return fail('Duration must be between 30 and 360 minutes');
    }
    if (!scheduledAtRaw || Number.isNaN(scheduledAt.getTime())) {
      return fail('Please choose a valid session time');
    }

    const tutorRes = await stage2TutorApi.getById(tutorId).catch(() => null);
    if (!tutorRes?.data?.data) return fail('Tutor not found', 404);
    const tutor = tutorRes.data.data;

    const selectedSubject = pickTutorSubject(tutor, subjectId, subjectName);
    if (!selectedSubject) return fail('Please select a valid subject');

    const resolvedSubjectId = String(
      selectedSubject?.subjectId || selectedSubject?.subject?.id || subjectId
    );
    const resolvedSubjectName =
      selectedSubject?.subject?.name || selectedSubject?.name || subjectName || 'Subject';

    const hourlyRate = Number(tutor.hourlyRate || 0);
    const totalAmount = Number(((hourlyRate * duration) / 60).toFixed(2));

    const newBooking = {
      id: `mock_booking_${Date.now()}`,
      learnerId: sessionUser.id,
      learner: toLearnerSummary(sessionUser.id),
      tutorId: tutor.id,
      tutorProfile: {
        id: tutor.id,
        user: {
          id: tutor.userId || tutor.user?.id || `mock_tutor_user_${tutor.id}`,
          firstName: tutor.user?.firstName || 'Tutor',
          lastName: tutor.user?.lastName || '',
          avatar: tutor.user?.avatar || '',
          email: tutor.user?.email || '',
        },
      },
      subjectId: resolvedSubjectId,
      subject: resolvedSubjectName,
      sessionType,
      scheduledAt: scheduledAt.toISOString(),
      duration,
      notes,
      status: 'PENDING',
      currency: tutor.currency || 'AUD',
      hourlyRate,
      totalAmount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const bookings = ensureBookings();
    bookings.unshift(newBooking);
    writeBookings(bookings);

    return ok(clone(enrichBooking(newBooking)), 'Booking created');
  },

  getMyBookings: async (params = {}) => {
    await wait(220);

    const sessionUser = getSessionUser();
    if (!sessionUser) return fail('Unauthorized', 401);

    const status = String(params?.status || '').trim().toUpperCase();
    const page = parsePage(params?.page);
    const limit = parseLimit(params?.limit);

    let bookings = ensureBookings().filter((item) => item.learnerId === sessionUser.id);

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
      bookings: clone(paged),
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
      const tutorProfileId = getTutorProfileIdFromUser(sessionUser);
      if (!tutorProfileId || String(booking.tutorId) !== String(tutorProfileId)) {
        return fail('Forbidden', 403);
      }
    } else if (sessionUser.role !== 'ADMIN' && sessionUser.role !== 'SYSTEM_ADMIN') {
      return fail('Forbidden', 403);
    }

    return ok(clone(enrichBooking(booking)));
  },

  cancel: async (id, reason) => {
    await wait(220);

    const sessionUser = getSessionUser();
    const learnerError = ensureLearner(sessionUser);
    if (learnerError) return learnerError;

    const bookings = ensureBookings();
    const booking = bookings.find((item) => String(item.id) === String(id));
    if (!booking) return fail('Booking not found', 404);
    if (booking.learnerId !== sessionUser.id) return fail('Forbidden', 403);
    if (!['PENDING', 'ACCEPTED'].includes(booking.status)) {
      return fail('This booking cannot be cancelled anymore');
    }

    booking.status = 'CANCELLED';
    booking.cancelReason = reason ? String(reason) : '';
    booking.updatedAt = new Date().toISOString();

    writeBookings(bookings);
    return ok(clone(enrichBooking(booking)), 'Booking cancelled');
  },

  // Stage 3 learner scope: keep methods for API shape compatibility.
  getTutorBookings: async () => fail('Not implemented in stage3 mock', 501),
  accept: async () => fail('Not implemented in stage3 mock', 501),
  decline: async () => fail('Not implemented in stage3 mock', 501),
  reschedule: async () => fail('Not implemented in stage3 mock', 501),
  complete: async () => fail('Not implemented in stage3 mock', 501),
};
