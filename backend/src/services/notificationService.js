const { prisma } = require('../config/database');

async function notify(receiverId, type, title, message, link) {
  await prisma.notification.create({
    data: {
      userId: receiverId,
      type,
      title,
      message,
      read: false,
      timestamp: new Date(),
      link,
    },
  });
}

async function notifyAdmin(type, title, message, link) {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
  });

  const notifications = admins.map((admin) => ({
    userId: admin.id,
    type,
    title,
    message,
    read: false,
    timestamp: new Date(),
    link,
  }));

  if (!notifications.length) return;

  await prisma.notification.createMany({
    data: notifications,
  });
}

module.exports = {
  notify,
  notifyAdmin,
};
