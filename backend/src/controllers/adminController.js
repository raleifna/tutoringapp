const { prisma } = require('../config/database');

const ELEVATED_ROLES = ['ADMIN', 'SYSTEM_ADMIN'];


exports.getDashboard = async (req, res) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalUsers,
    newUsersThisMonth,
    totalTutors,
    pendingTutors,
    totalBookings,
    bookingsThisMonth,
    completedBookings,
    totalRevenue,
    usersByRole,
    recentBookings,
  ] = await Promise.all([
    prisma.user.count({ where: { role: { notIn: ELEVATED_ROLES } } }),
    prisma.user.count({
      where: {
        role: { notIn: ELEVATED_ROLES },
        createdAt: { gte: monthStart },
      },
    }),
    prisma.tutorProfile.count(),
    prisma.tutorProfile.count({ where: { status: 'PENDING' } }),
    prisma.booking.count(),
    prisma.booking.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.booking.count({ where: { status: 'COMPLETED' } }),
    prisma.payment.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { amount: true },
    }),
    prisma.user.groupBy({
      by: ['role'],
      _count: { role: true },
      where: { role: { notIn: ELEVATED_ROLES } },
    }),
    prisma.booking.findMany({
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
    }),
  ]);

  const overview = {
    totalUsers,
    newUsersThisMonth,
    totalTutors,
    pendingTutors,
    totalBookings,
    bookingsThisMonth,
    completedBookings,
    totalRevenue: totalRevenue._sum.amount || 0,
  };

  res.json({
    success: true,
    data: {
      ...overview,
      overview,
      recentBookings,
      usersByRole: usersByRole.reduce((accumulator, item) => {
        accumulator[item.role] = item._count.role;
        return accumulator;
      }, {}),
    },
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
