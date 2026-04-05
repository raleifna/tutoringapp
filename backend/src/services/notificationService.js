// services/notificationService.js

const { prisma } = require('../config/database');

class NotificationService {

  // create notification
  async notify(receiverId, type, title, message, link) {
    await prisma.notifications.create({
      userId: receiverId,
      type,
      title,
      message,
      read: false,
      timestamp: new Date(),
      link
    });
  }

  async notifyAdmin(type, title, message, link) {
    const admins = await db.users.find({ role: 'admin' });
    const notifications = admins.map(admin => ({
      userId: admin.id,
      type,
      title,
      message,
      read: false,
      timestamp: new Date(),
      link
    }));
    await db.notifications.insertMany(notifications);
  }
}

module.exports = new NotificationService();