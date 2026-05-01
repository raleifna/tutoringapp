const request = require('supertest');

const prisma = {
  user: {
    findUnique: vi.fn(),
  },
  booking: {
    findUnique: vi.fn(),
  },
  review: {
    create: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
    aggregate: vi.fn(),
  },
  tutorProfile: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

const databaseModulePath = require.resolve('../../src/config/database');
const appModulePath = require.resolve('../../src/app');

delete require.cache[databaseModulePath];
delete require.cache[appModulePath];

require.cache[databaseModulePath] = {
  id: databaseModulePath,
  filename: databaseModulePath,
  loaded: true,
  exports: { prisma },
};

const app = require('../../src/app');
const { createAccessToken } = require('../../src/utils/tokens');

const learnerUser = {
  id: 'learner-1',
  email: 'learner@example.com',
  timezone: 'UTC',
  role: 'LEARNER',
  status: 'ACTIVE',
  tutorProfile: null,
};

const adminUser = {
  id: 'admin-1',
  email: 'admin@example.com',
  timezone: 'UTC',
  role: 'ADMIN',
  status: 'ACTIVE',
  tutorProfile: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('review API integration tests', () => {
  test('creates a review for a completed booking and refreshes the tutor review summary', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(learnerUser);
    prisma.booking.findUnique.mockResolvedValueOnce({
      id: 'booking-1',
      learnerId: learnerUser.id,
      tutorId: 'tutor-profile-1',
      status: 'COMPLETED',
      subject: 'Mathematics',
      review: null,
    });
    prisma.review.create.mockResolvedValueOnce({
      id: 'review-1',
      bookingId: 'booking-1',
      learnerId: learnerUser.id,
      tutorProfileId: 'tutor-profile-1',
      rating: 5,
      comment: 'Excellent tutor',
      learner: {
        id: learnerUser.id,
        firstName: 'Learner',
        lastName: 'Example',
        avatar: null,
      },
      tutorProfile: {
        id: 'tutor-profile-1',
        rating: 0,
        totalReviews: 0,
        user: {
          id: 'tutor-user-1',
          firstName: 'Tutor',
          lastName: 'Example',
          avatar: null,
        },
      },
      booking: {
        id: 'booking-1',
        subject: 'Mathematics',
        scheduledAt: '2026-05-02T10:00:00.000Z',
        duration: 60,
        status: 'COMPLETED',
        learnerId: learnerUser.id,
        tutorId: 'tutor-profile-1',
      },
    });
    prisma.review.aggregate.mockResolvedValueOnce({
      _avg: { rating: 5 },
      _count: { id: 1 },
    });
    prisma.tutorProfile.update.mockResolvedValueOnce({
      id: 'tutor-profile-1',
      rating: 5,
      totalReviews: 1,
    });

    const response = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${createAccessToken(learnerUser)}`)
      .send({
        bookingId: 'booking-1',
        rating: 5,
        comment: 'Excellent tutor',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Review submitted');
    expect(response.body.data.rating).toBe(5);
    expect(prisma.review.create).toHaveBeenCalledWith({
      data: {
        bookingId: 'booking-1',
        learnerId: learnerUser.id,
        tutorProfileId: 'tutor-profile-1',
        rating: 5,
        comment: 'Excellent tutor',
      },
      include: expect.any(Object),
    });
    expect(prisma.review.aggregate).toHaveBeenCalledWith({
      where: { tutorProfileId: 'tutor-profile-1' },
      _avg: { rating: true },
      _count: { id: true },
    });
    expect(prisma.tutorProfile.update).toHaveBeenCalledWith({
      where: { id: 'tutor-profile-1' },
      data: {
        rating: 5,
        totalReviews: 1,
      },
    });
  });

  test('rejects review creation when the booking is not completed', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(learnerUser);
    prisma.booking.findUnique.mockResolvedValueOnce({
      id: 'booking-1',
      learnerId: learnerUser.id,
      tutorId: 'tutor-profile-1',
      status: 'ACCEPTED',
      subject: 'Mathematics',
      review: null,
    });

    const response = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${createAccessToken(learnerUser)}`)
      .send({
        bookingId: 'booking-1',
        rating: 4,
        comment: 'Too early',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('You can only review a tutor after the booking is completed');
    expect(prisma.review.create).not.toHaveBeenCalled();
  });

  test('rejects review creation for a booking owned by another learner', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(learnerUser);
    prisma.booking.findUnique.mockResolvedValueOnce({
      id: 'booking-2',
      learnerId: 'another-learner',
      tutorId: 'tutor-profile-1',
      status: 'COMPLETED',
      subject: 'Physics',
      review: null,
    });

    const response = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${createAccessToken(learnerUser)}`)
      .send({
        bookingId: 'booking-2',
        rating: 3,
        comment: 'Not my lesson',
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('You can only review your own bookings');
    expect(prisma.review.create).not.toHaveBeenCalled();
  });

  test('rejects duplicate reviews for the same booking', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(learnerUser);
    prisma.booking.findUnique.mockResolvedValueOnce({
      id: 'booking-1',
      learnerId: learnerUser.id,
      tutorId: 'tutor-profile-1',
      status: 'COMPLETED',
      subject: 'Mathematics',
      review: {
        id: 'existing-review',
      },
    });

    const response = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${createAccessToken(learnerUser)}`)
      .send({
        bookingId: 'booking-1',
        rating: 5,
        comment: 'Second try',
      });

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('This booking has already been reviewed');
    expect(prisma.review.create).not.toHaveBeenCalled();
  });

  test('allows an admin to delete any review and refresh the tutor review summary', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(adminUser);
    prisma.review.findUnique.mockResolvedValueOnce({
      id: 'review-1',
      learnerId: 'learner-2',
      tutorProfileId: 'tutor-profile-1',
      booking: {
        learnerId: 'learner-2',
      },
    });
    prisma.review.delete.mockResolvedValueOnce({ id: 'review-1' });
    prisma.review.aggregate.mockResolvedValueOnce({
      _avg: { rating: null },
      _count: { id: 0 },
    });
    prisma.tutorProfile.update.mockResolvedValueOnce({
      id: 'tutor-profile-1',
      rating: 0,
      totalReviews: 0,
    });

    const response = await request(app)
      .delete('/api/v1/admin/reviews/review-1')
      .set('Authorization', `Bearer ${createAccessToken(adminUser)}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'Review deleted',
    });
    expect(prisma.review.delete).toHaveBeenCalledWith({
      where: { id: 'review-1' },
    });
    expect(prisma.tutorProfile.update).toHaveBeenCalledWith({
      where: { id: 'tutor-profile-1' },
      data: {
        rating: 0,
        totalReviews: 0,
      },
    });
  });
});
