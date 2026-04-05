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
}

module.exports = new NotificationService();