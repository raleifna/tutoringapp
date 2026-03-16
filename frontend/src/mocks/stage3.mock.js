// src/mocks/stage3.mock.js - Mock booking APIs for stage 3 pages

import { tutorApi as stage2TutorApi } from './stage2.mock.js';

const USERS_KEY = 'mock_auth_users_v1';
const SESSION_KEY = 'mock_auth_session_v1';
const BOOKINGS_KEY = 'mock_stage3_bookings_v1';

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

const sortBookings = (bookings) =>
  [...bookings].sort((a, b) => {
    const aTime = new Date(a.createdAt || a.scheduledAt || 0).getTime();
    const bTime = new Date(b.createdAt || b.scheduledAt || 0).getTime();
    return bTime - aTime;
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

    const bookings = readBookings();
    bookings.unshift(newBooking);
    writeBookings(bookings);

    return ok(clone(newBooking), 'Booking created');
  },

  getMyBookings: async (params = {}) => {
    await wait(220);

    const sessionUser = getSessionUser();
    if (!sessionUser) return fail('Unauthorized', 401);

    const status = String(params?.status || '').trim().toUpperCase();
    const page = parsePage(params?.page);
    const limit = parseLimit(params?.limit);

    let bookings = readBookings().filter((item) => item.learnerId === sessionUser.id);

    if (status) {
      bookings = bookings.filter((item) => String(item.status || '').toUpperCase() === status);
    }

    bookings = sortBookings(bookings);

    const total = bookings.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    const paged = bookings.slice(start, start + limit);

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

    const booking = readBookings().find((item) => String(item.id) === String(id));
    if (!booking) return fail('Booking not found', 404);

    if (booking.learnerId !== sessionUser.id && booking.tutorId !== sessionUser.id) {
      return fail('Forbidden', 403);
    }

    return ok(clone(booking));
  },

  cancel: async (id, reason) => {
    await wait(220);

    const sessionUser = getSessionUser();
    const learnerError = ensureLearner(sessionUser);
    if (learnerError) return learnerError;

    const bookings = readBookings();
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
    return ok(clone(booking), 'Booking cancelled');
  },

  // Stage 3 learner scope: keep methods for API shape compatibility.
  getTutorBookings: async () => fail('Not implemented in stage3 mock', 501),
  accept: async () => fail('Not implemented in stage3 mock', 501),
  decline: async () => fail('Not implemented in stage3 mock', 501),
  reschedule: async () => fail('Not implemented in stage3 mock', 501),
  complete: async () => fail('Not implemented in stage3 mock', 501),
};
