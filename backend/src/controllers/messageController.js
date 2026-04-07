const { prisma } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { getSocketIO } = require('../services/socketService');

exports.getConversations = async (req, res) => {
  const conversations = await prisma.conversation.findMany({
    where: {
      participants: { some: { userId: req.user.id } },
    },
    include: {
      participants: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, avatar: true, role: true },
          },
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          sender: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const conversationsWithUnread = await Promise.all(
    conversations.map(async (conversation) => {
      const myParticipant = conversation.participants.find((item) => item.userId === req.user.id);
      const where = {
        conversationId: conversation.id,
        senderId: { not: req.user.id },
        ...(myParticipant?.lastReadAt ? { createdAt: { gt: myParticipant.lastReadAt } } : {}),
      };

      const unreadCount = await prisma.message.count({ where });

      return {
        ...conversation,
        lastMessage: conversation.messages[0] || null,
        unreadCount,
      };
    })
  );

  res.json({ success: true, data: { conversations: conversationsWithUnread } });
};

exports.createOrGetConversation = async (req, res) => {
  const userId = req.body.userId || req.body.participantId;

  if (!userId) throw new AppError('User ID required', 400);
  if (userId === req.user.id) throw new AppError('Cannot message yourself', 400);

  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) throw new AppError('User not found', 404);

  const existing = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { userId: req.user.id } } },
        { participants: { some: { userId } } },
      ],
    },
    include: {
      participants: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } },
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          sender: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  if (existing) {
    return res.json({
      success: true,
      data: {
        ...existing,
        lastMessage: existing.messages[0] || null,
      },
    });
  }

  const conversation = await prisma.conversation.create({
    data: {
      participants: {
        create: [{ userId: req.user.id }, { userId }],
      },
    },
    include: {
      participants: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } },
        },
      },
      messages: true,
    },
  });

  res.status(201).json({ success: true, data: conversation });
};

exports.getConversationMessages = async (req, res) => {
  const { conversationId } = req.params;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: req.user.id } },
  });

  if (!participant) throw new AppError('Conversation not found', 404);

  const skip = (page - 1) * limit;
  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.message.count({ where: { conversationId } }),
  ]);

  res.json({
    success: true,
    data: {
      messages: messages.reverse(),
      pagination: { page, limit, total },
    },
  });
};

exports.sendMessage = async (req, res) => {
  const { conversationId } = req.params;
  const content = String(req.body.content || '').trim();

  if (!content) throw new AppError('Message content required', 400);

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: req.user.id } },
  });

  if (!participant) throw new AppError('Conversation not found', 404);

  const otherParticipant = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId: { not: req.user.id } },
  });

  if (!otherParticipant) throw new AppError('Conversation recipient not found', 404);

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId: req.user.id,
      receiverId: otherParticipant.userId,
      content,
      status: 'SENT',
    },
    include: {
      sender: { select: { id: true, firstName: true, lastName: true, avatar: true } },
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  const io = getSocketIO();
  if (io) {
    io.to(`user:${otherParticipant.userId}`).emit('new_message', message);
    io.to(`conversation:${conversationId}`).emit('new_message', message);
  }

  res.status(201).json({ success: true, data: message });
};

exports.markAsRead = async (req, res) => {
  const { conversationId } = req.params;

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: req.user.id } },
  });

  if (!participant) throw new AppError('Conversation not found', 404);

  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId: req.user.id } },
    data: { lastReadAt: new Date() },
  });

  await prisma.message.updateMany({
    where: {
      conversationId,
      receiverId: req.user.id,
      status: { in: ['SENT', 'DELIVERED'] },
    },
    data: { status: 'READ' },
  });

  const io = getSocketIO();
  if (io) {
    io.to(`conversation:${conversationId}`).emit('messages_read', {
      conversationId,
      userId: req.user.id,
    });
  }

  res.json({ success: true, message: 'Messages marked as read' });
};

exports.getUnreadCount = async (req, res) => {
  const count = await prisma.message.count({
    where: {
      receiverId: req.user.id,
      status: { in: ['SENT', 'DELIVERED'] },
    },
  });

  res.json({ success: true, data: { count } });
};
