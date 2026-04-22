const request = require('supertest');
const { beforeEach, describe, expect, test, vi } = require('vitest');

const prisma = {
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  tutorProfile: {
    findFirst: vi.fn(),
  },
  booking: {
    count: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
  },
};

const notify = vi.fn();
const notifyOrRefresh = vi.fn();
const notifyAdmin = vi.fn();

vi.mock('../../src/config/database', () => ({
  prisma,
}));

vi.mock('../../src/services/notificationService', () => ({
  notify,
  notifyOrRefresh,
  notifyAdmin,
}));

vi.mock('../../src/config/stripe', () => ({
  isStripeConfigured: vi.fn(() => false),
  getStripe: vi.fn(),
}));

const app = require('../../src/app');
const { createAccessToken } = require('../../src/utils/tokens');

const learnerUser = {
  id: 'learner-1',
  email: 'learner@example.com',
  role: 'LEARNER',
  status: 'ACTIVE',
};

const learnerRecord = {
  ...learnerUser,
  firstName: 'Learner',
  lastName: 'Example',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('booking and payment API integration tests', () => {
  test('creates a booking for an active tutor profile', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(learnerUser);
    prisma.tutorProfile.findFirst.mockResolvedValueOnce({
      id: 'tutor-profile-1',
      userId: 'tutor-user-1',
      status: 'ACTIVE',
      hourlyRate: '80.00',
      currency: 'AUD',
      preferredMeetingTool: 'ZOOM',
      user: {
        id: 'tutor-user-1',
        firstName: 'Tutor',
        lastName: 'Example',
        avatar: null,
        email: 'tutor@example.com',
      },
      subjects: [
        {
          subjectId: 'subject-1',
          subject: { name: 'Mathematics' },
        },
      ],
    });
    prisma.booking.count.mockResolvedValueOnce(0);
    prisma.booking.findMany.mockResolvedValueOnce([]);
    prisma.booking.create.mockResolvedValueOnce({
      id: 'booking-1',
      learnerId: learnerUser.id,
      tutorId: 'tutor-profile-1',
      subject: 'Mathematics',
      status: 'PENDING',
      totalAmount: 80,
      currency: 'AUD',
      payment: { id: 'payment-1', status: 'PENDING', amount: 80, currency: 'AUD' },
      learner: {
        id: learnerUser.id,
        firstName: 'Learner',
        lastName: 'Example',
        avatar: null,
        email: learnerUser.email,
      },
      tutorProfile: {
        user: {
          id: 'tutor-user-1',
          firstName: 'Tutor',
          lastName: 'Example',
          avatar: null,
          email: 'tutor@example.com',
        },
      },
      statusHistory: [{ status: 'PENDING' }],
    });

    const response = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${createAccessToken(learnerUser)}`)
      .send({
        tutorId: 'tutor-profile-1',
        subjectId: 'subject-1',
        scheduledAt: '2026-05-01T10:00:00.000Z',
        duration: 60,
        sessionType: 'ONLINE',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Booking request sent successfully');
    expect(response.body.data.subject).toBe('Mathematics');
    expect(prisma.booking.create).toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith(
      'tutor-user-1',
      'booking',
      'New Booking Request',
      'Please handle a booking request.',
      '/bookings/booking-1'
    );
  });

  test('returns empty payment method data when the learner has no saved card', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce(learnerUser)
      .mockResolvedValueOnce({
        stripeCustomerId: null,
        stripeDefaultPaymentMethodId: null,
      });

    const response = await request(app)
      .get('/api/v1/payments/method')
      .set('Authorization', `Bearer ${createAccessToken(learnerUser)}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual({
      hasPaymentMethod: false,
      paymentMethod: null,
      paymentMethods: [],
    });
  });

  test('creates a local setup intent when Stripe is not configured', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(learnerUser);

    const response = await request(app)
      .post('/api/v1/payments/setup-intent')
      .set('Authorization', `Bearer ${createAccessToken(learnerUser)}`)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.localMode).toBe(true);
    expect(response.body.data.customerId).toBe(`local_customer_${learnerUser.id}`);
    expect(response.body.data.setupIntentId).toBe(`local_setup_${learnerUser.id}`);
  });

  test('updates the default payment method in local mode', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce(learnerUser)
      .mockResolvedValueOnce({
        stripeCustomerId: 'local_customer_learner-1',
      });
    prisma.user.update.mockResolvedValueOnce({
      id: learnerUser.id,
      stripeDefaultPaymentMethodId: 'pm_local_1',
    });

    const response = await request(app)
      .patch('/api/v1/payments/method/default')
      .set('Authorization', `Bearer ${createAccessToken(learnerUser)}`)
      .send({ paymentMethodId: 'pm_local_1' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Default payment method updated');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: learnerUser.id },
      data: {
        stripeDefaultPaymentMethodId: 'pm_local_1',
      },
    });
  });
});
