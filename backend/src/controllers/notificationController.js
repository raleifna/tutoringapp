const { prisma } = require("../config/database");


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