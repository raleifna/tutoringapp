const { prisma } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { notify, notifyAdmin } = require('../services/notificationService');


const ELEVATED_ROLES = ['ADMIN', 'SYSTEM_ADMIN'];

const parsePagination = (page = 1, limit = 20) => {
  const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
  const parsedLimit = Math.max(parseInt(limit, 10) || 20, 1);

  return {
    page: parsedPage,
    limit: parsedLimit,
    skip: (parsedPage - 1) * parsedLimit,
  };
};

exports.getDashboard = async (req, res) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const totalUsers = await prisma.user.count({ where: { role: { notIn: ELEVATED_ROLES } } });
  const newUsersThisMonth = await prisma.user.count({
    where: { role: { notIn: ELEVATED_ROLES }, createdAt: { gte: monthStart } },
  });
  const totalTutors = await prisma.tutorProfile.count();
  const pendingTutors = await prisma.tutorProfile.count({
    where: { status: 'PENDING', applicationSubmitted: true },
  });
  const totalBookings = await prisma.booking.count();
  const bookingsThisMonth = await prisma.booking.count({ where: { createdAt: { gte: monthStart } } });
  const completedBookings = await prisma.booking.count({ where: { status: 'COMPLETED' } });
  const revenueResult = await prisma.payment.aggregate({
    where: { status: 'COMPLETED' },
    _sum: { amount: true },
  });
  const usersByRoleRaw = await prisma.user.groupBy({
    by: ['role'],
    _count: { role: true },
    where: { role: { notIn: ELEVATED_ROLES } },
  });
  const recentBookings = await prisma.booking.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      learner: { select: { id: true, firstName: true, lastName: true, email: true } },
      tutorProfile: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
    },
  });

  const usersByRole = {};
  for (const item of usersByRoleRaw) {
    usersByRole[item.role] = item._count.role;
  }

  const overview = {
    totalUsers,
    newUsersThisMonth,
    totalTutors,
    pendingTutors,
    totalBookings,
    bookingsThisMonth,
    completedBookings,
    totalRevenue: revenueResult._sum.amount || 0,
  };

  res.json({
    success: true,
    data: { ...overview, overview, recentBookings, usersByRole },
  });
};

exports.getAnalytics = async (req, res) => {
  const days = parseInt(req.query.period, 10) || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [bookingsByStatus, recentUsers, topTutorsRaw, topSubjects, revenueData] = await Promise.all(
    [
      prisma.booking.groupBy({
        by: ['status'],
        _count: { status: true },
        where: { createdAt: { gte: startDate } },
      }),
      prisma.user.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true, role: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.tutorProfile.findMany({
        orderBy: { totalSessions: 'desc' },
        take: 10,
        include: {
          user: { select: { firstName: true, lastName: true, avatar: true } },
          subjects: { include: { subject: true }, take: 3 },
          bookings: {
            where: {
              status: 'COMPLETED',
              createdAt: { gte: startDate },
            },
            select: { totalAmount: true },
          },
        },
      }),
      prisma.booking.groupBy({
        by: ['subject'],
        _count: { subject: true },
        orderBy: { _count: { subject: 'desc' } },
        take: 10,
        where: { createdAt: { gte: startDate } },
      }),
      prisma.payment.findMany({
        where: { status: 'COMPLETED', createdAt: { gte: startDate } },
        select: { amount: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]
  );

  const newUsersTimelineMap = recentUsers.reduce((accumulator, item) => {
    const date = item.createdAt.toISOString().slice(0, 10);
    accumulator[date] = (accumulator[date] || 0) + 1;
    return accumulator;
  }, {});

  const revenueTimelineMap = revenueData.reduce((accumulator, item) => {
    const date = item.createdAt.toISOString().slice(0, 10);
    accumulator[date] = (accumulator[date] || 0) + parseFloat(item.amount || 0);
    return accumulator;
  }, {});

  const topTutors = topTutorsRaw.map((tutor) => ({
    ...tutor,
    revenue: tutor.bookings.reduce((sum, booking) => sum + parseFloat(booking.totalAmount || 0), 0),
  }));

  res.json({
    success: true,
    data: {
      bookingsByStatusMap: bookingsByStatus.reduce((accumulator, item) => {
        accumulator[item.status] = item._count.status;
        return accumulator;
      }, {}),
      bookingsByStatus: bookingsByStatus.map((item) => ({
        status: item.status,
        count: item._count.status,
      })),
      recentUsers,
      newUsersTimeline: Object.entries(newUsersTimelineMap).map(([date, count]) => ({
        date,
        count,
      })),
      topTutors,
      topSubjects: topSubjects.map((item) => ({
        subject: item.subject,
        count: item._count.subject,
      })),
      revenueData,
      revenueTimeline: Object.entries(revenueTimelineMap).map(([date, revenue]) => ({
        date,
        revenue,
      })),
    },
  });
};

exports.getUsers = async (req, res) => {
  const { role, status, search, page = 1, limit = 20 } = req.query;
  const pagination = parsePagination(page, limit);
  const normalizedSearch = typeof search === 'string' ? search.trim() : '';

  const where = {
    ...(role && { role }),
    ...(status && { status }),
    ...(normalizedSearch && {
      OR: [
        { email: { contains: normalizedSearch, mode: 'insensitive' } },
        { firstName: { contains: normalizedSearch, mode: 'insensitive' } },
        { lastName: { contains: normalizedSearch, mode: 'insensitive' } },
      ],
    }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        firstName: true,
        lastName: true,
        avatar: true,
        phone: true,
        timezone: true,
        isEmailVerified: true,
        createdAt: true,
        lastLoginAt: true,
        tutorProfile: {
          select: {
            id: true,
            status: true,
            rating: true,
            totalSessions: true,
            isVerified: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    },
  });
};

exports.getUser = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: {
      learnerProfile: true,
      tutorProfile: {
        include: {
          subjects: { include: { subject: true } },
          availability: true,
          bookings: {
            include: {
              learner: {
                select: { id: true, firstName: true, lastName: true, email: true },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      },
      subscription: true,
      bookingsAsLearner: {
        include: {
          tutorProfile: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, email: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  });

  if (!user) throw new AppError('User not found', 404);

  const { password: _password, ...userWithoutPassword } = user;
  res.json({ success: true, data: userWithoutPassword });
};

exports.updateUserStatus = async (req, res) => {
  const { status, reason } = req.body;
  const validStatuses = ['ACTIVE', 'SUSPENDED', 'DEACTIVATED'];

  if (!validStatuses.includes(status)) {
    throw new AppError('Invalid status', 400);
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, role: true, status: true },
  });

  if (!targetUser) throw new AppError('User not found', 404);
  if (ELEVATED_ROLES.includes(targetUser.role)) {
    throw new AppError('Cannot modify elevated admin accounts', 403);
  }

  await prisma.user.update({
    where: { id: req.params.id },
    data: { status },
  });

  await prisma.adminAction.create({
    data: {
      adminId: req.user.id,
      targetUserId: req.params.id,
      action: `USER_STATUS_${status}`,
      description: reason || `Status changed to ${status}`,
      metadata: { previousStatus: targetUser.status, nextStatus: status },
    },
  });

  // notify user
  await notify(targetUser.id, 'system', `Your status changed to ${status}`, reason || `Your status changed to ${status}`, `/dashboard`);

  res.json({ success: true, message: `User status updated to ${status}` });
};

exports.getPendingTutors = async (req, res) => {
  const { status = 'PENDING', page = 1, limit = 20 } = req.query;
  const pagination = parsePagination(page, limit);
  const where = {
    applicationSubmitted: true,
    ...(status ? { status } : {}),
  };

  const [tutors, total] = await Promise.all([
    prisma.tutorProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
            bio: true,
            createdAt: true,
          },
        },
        subjects: { include: { subject: true } },
        availability: true,
      },
      orderBy: { createdAt: 'asc' },
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.tutorProfile.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      tutors,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    },
  });
};

exports.approveTutor = async (req, res) => {
  const tutor = await prisma.tutorProfile.findFirst({
    where: { OR: [{ id: req.params.id }, { userId: req.params.id }] },
    select: { id: true, userId: true, status: true },
  });

  if (!tutor) throw new AppError('Tutor not found', 404);

  await prisma.tutorProfile.update({
    where: { id: tutor.id },
    data: { status: 'ACTIVE', applicationSubmitted: true, isVerified: true, verifiedAt: new Date() },
  });

  await prisma.adminAction.create({
    data: {
      adminId: req.user.id,
      targetUserId: tutor.userId,
      action: 'TUTOR_APPROVED',
      description: 'Tutor profile approved',
      metadata: { previousStatus: tutor.status, nextStatus: 'ACTIVE' },
    },
  });

  // notify tutor
  await notify(tutor.userId, 'system', 'Tutor profile approved', 'Tutor profile approved', `/dashboard`);


  res.json({ success: true, message: 'Tutor approved successfully' });
};

exports.rejectTutor = async (req, res) => {
  const { reason } = req.body;
  const tutor = await prisma.tutorProfile.findFirst({
    where: { OR: [{ id: req.params.id }, { userId: req.params.id }] },
    select: { id: true, userId: true, status: true },
  });

  if (!tutor) throw new AppError('Tutor not found', 404);

  await prisma.tutorProfile.update({
    where: { id: tutor.id },
    data: { status: 'SUSPENDED', applicationSubmitted: true, isVerified: false, verifiedAt: null },
  });

  await prisma.adminAction.create({
    data: {
      adminId: req.user.id,
      targetUserId: tutor.userId,
      action: 'TUTOR_REJECTED',
      description: reason || 'Tutor profile rejected',
      metadata: { previousStatus: tutor.status, nextStatus: 'SUSPENDED' },
    },
  });

  // notify tutor
  await notify(tutor.userId, 'system', 'Tutor profile rejected', reason || 'Tutor profile rejected', `/dashboard`);

  res.json({ success: true, message: 'Tutor profile rejected' });
};

exports.returnTutor = async (req, res) => {
  const { feedback } = req.body;

  if (!feedback || !feedback.trim()) {
    throw new AppError('Feedback message is required when returning a profile', 400);
  }

  const tutor = await prisma.tutorProfile.findFirst({
    where: { OR: [{ id: req.params.id }, { userId: req.params.id }] },
    select: { id: true, userId: true, status: true },
  });

  if (!tutor) throw new AppError('Tutor not found', 404);

  await prisma.tutorProfile.update({
    where: { id: tutor.id },
    data: { status: 'SUSPENDED', applicationSubmitted: true, isVerified: false, verifiedAt: null },
  });

  await prisma.adminAction.create({
    data: {
      adminId: req.user.id,
      targetUserId: tutor.userId,
      action: 'TUTOR_PROFILE_RETURNED',
      description: feedback.trim(),
      metadata: { previousStatus: tutor.status, nextStatus: 'SUSPENDED' },
    },
  });

  // notify tutor
  await notify(tutor.userId, 'system', 'Tutor profile returned', feedback.trim(), `/dashboard`);

  res.json({ success: true, message: 'Profile returned to tutor for changes' });
};

exports.getBookings = async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const pagination = parsePagination(page, limit);
  const where = status ? { status } : {};

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        learner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        tutorProfile: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        payment: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.booking.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      bookings,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    },
  });
};

exports.getAdminActions = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const pagination = parsePagination(page, limit);

  const [actions, total] = await Promise.all([
    prisma.adminAction.findMany({
      include: {
        admin: { select: { id: true, firstName: true, lastName: true } },
        targetUser: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.adminAction.count(),
  ]);

  res.json({
    success: true,
    data: {
      actions,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    },
  });
};

exports.createSubject = async (req, res) => {
  const { name, category, description } = req.body;

  const subject = await prisma.subject.create({
    data: { name, category, description },
  });

  await prisma.adminAction.create({
    data: {
      adminId: req.user.id,
      action: 'SUBJECT_CREATED',
      description: `Created subject ${subject.name}`,
      metadata: { subjectId: subject.id },
    },
  });

  res.status(201).json({ success: true, data: subject });
};

exports.updateSubject = async (req, res) => {
  const { name, category, description } = req.body;

  const subject = await prisma.subject.update({
    where: { id: req.params.id },
    data: {
      ...(name && { name }),
      ...(category && { category }),
      ...(description !== undefined && { description }),
    },
  });

  await prisma.adminAction.create({
    data: {
      adminId: req.user.id,
      action: 'SUBJECT_UPDATED',
      description: `Updated subject ${subject.name}`,
      metadata: { subjectId: subject.id },
    },
  });

  res.json({ success: true, data: subject });
};

exports.deleteSubject = async (req, res) => {
  const subject = await prisma.subject.findUnique({ where: { id: req.params.id } });

  if (!subject) throw new AppError('Subject not found', 404);

  await prisma.subject.delete({ where: { id: req.params.id } });

  await prisma.adminAction.create({
    data: {
      adminId: req.user.id,
      action: 'SUBJECT_DELETED',
      description: `Deleted subject ${subject.name}`,
      metadata: { subjectId: subject.id, subjectName: subject.name },
    },
  });

  res.json({ success: true, message: 'Subject deleted' });
};
