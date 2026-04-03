
const { prisma } = require('../config/database');


exports.searchNotifications = async (req, res) => {
  const {
    page = 1,
    limit = 10,
    type,
    status,
  } = req.query;

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const take = parseInt(limit, 10);

  let read = undefined;
  if (status === 'read') {
    read = true;
  } else if (status === 'unread') {
    read = false;
  }

  const where = {
    userId: req.user.id,
    ...(type ? { type } : {}),
    ...(read !== undefined ? { read } : {}),
  };

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip,
      take,
    }),
    prisma.notification.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      notifications,
      pagination: {
        page: parseInt(page, 10),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    },
  });
};

exports.markAsRead = async (req, res) => {
  const { ids } = req.query;
  if (!ids) {
    return res.status(400).json({
      success: false,
      message: 'No notification IDs provided',
    });
  }
  // batch update notifications to mark as read
  await prisma.notification.updateMany({
    where: {
      ...(ids === 'all' ? {} : { id: { in: ids.split(',').map((id) => parseInt(id, 10)) } }),
      userId: req.user.id,
    },
    data: {
      read: true,
    },
  });

  res.json({
    success: true,
    message: 'Notifications marked as read',
  });
}

exports.addTestsData = async (req, res) => {
  // generate 20 test notifications
  const notifications = [];
  const types = ['system', 'message', 'booking', 'payment'];

  for (let i = 1; i <= 20; i++) {
    // generate random timestamp within the last 30 days
    const day = Math.floor(Math.random() * 28) + 1;

    notifications.push({
      userId: req.user.id,
      type: types[i % types.length],
      title: `Test Notification #${i}`,
      message: `This is test notification #${i}`,
      read: false,
      timestamp: new Date(Date.now() - day * 24 * 60 * 60 * 1000),
      link: `/notifications`
    });
  }

  await prisma.notification.createMany({
    data: notifications
  });

  res.json({
    success: true,
    message: 'Test notifications added',
  });
}
