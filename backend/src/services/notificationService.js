const { prisma } = require('../config/database');

export async function notify(receiverId, type, title, message, link) {
    await prisma.notification.create({
      data: {
        userId: receiverId,
        type,
        title,
        message,
        read: false,
        timestamp: new Date(),
        link
      }
    });
}
export async function notifyAdmin(type, title, message, link) {
    const admins = await prisma.user.findMany({ role: 'admin' });
    const notifications = admins.map(admin => ({
      userId: admin.id,
      type,
      title,
      message,
      read: false,
      timestamp: new Date(),
      link
    }));
    await prisma.notification.createMany({
      data: notifications
    });
  }

