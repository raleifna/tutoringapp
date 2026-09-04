const { prisma } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { generateReply } = require('../services/aiReplyService');
const { getSocketIO } = require('../services/socketService');

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const getUserName = (user) => `${user?.firstName || ''} ${user?.lastName || ''}`.trim();

const getStartOfCurrentUtcWeek = () => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = start.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setUTCDate(start.getUTCDate() + diff);
  return start;
};

const serializeAvailability = (slots = []) =>
  slots.map((slot) => ({
    day: dayNames[slot.dayOfWeek] || `Day ${slot.dayOfWeek}`,
    dayOfWeek: slot.dayOfWeek,
    startTime: slot.startTime,
    endTime: slot.endTime,
    timezone: slot.timezone,
  }));

const buildAiReplyContext = async ({ conversation, currentUserId }) => {
  const users = (conversation?.participants || []).map((item) => item.user).filter(Boolean);
  const currentUser = users.find((item) => item.id === currentUserId);
  const partner = users.find((item) => item.id !== currentUserId);
  const tutorUser = users.find((item) => item.role === 'TUTOR');
  const learnerUser = users.find((item) => item.role === 'LEARNER');

  let tutorContext = null;
  let learnerProfile = null;
  let bookings = [];

  if (learnerUser?.id) {
    learnerProfile = await prisma.learnerProfile.findUnique({
      where: { userId: learnerUser.id },
      select: {
        gradeLevel: true,
        learningGoals: true,
        subjects: true,
      },
    });
  }

  if (tutorUser?.id) {
    const weekStart = getStartOfCurrentUtcWeek();
    const nextWeekStart = new Date(weekStart);
    nextWeekStart.setUTCDate(nextWeekStart.getUTCDate() + 7);
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: tutorUser.id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true, timezone: true } },
        subjects: {
          include: { subject: true },
        },
        availability: {
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        },
        availabilityOverrides: {
          where: { weekStart: { gte: weekStart, lt: nextWeekStart } },
          include: {
            slots: {
              orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
            },
          },
          take: 1,
        },
      },
    });

    if (tutorProfile) {
      tutorContext = {
        id: tutorProfile.id,
        userId: tutorProfile.userId,
        name: getUserName(tutorProfile.user),
        timezone: tutorProfile.user?.timezone,
        headline: tutorProfile.headline,
        hourlyRate: Number(tutorProfile.hourlyRate || 0),
        currency: tutorProfile.currency,
        sessionTypes: tutorProfile.sessionTypes,
        subjects: (tutorProfile.subjects || []).map((item) => ({
          name: item.subject?.name,
          category: item.subject?.category,
          level: item.level,
          description: item.description,
        })),
        availability: serializeAvailability(tutorProfile.availability || []),
        currentWeekAvailability: serializeAvailability(
          tutorProfile.availabilityOverrides?.[0]?.slots || []
        ),
      };

      if (learnerUser?.id) {
        bookings = await prisma.booking.findMany({
          where: {
            learnerId: learnerUser.id,
            tutorId: tutorProfile.id,
          },
          orderBy: { scheduledAt: 'desc' },
          take: 8,
          select: {
            id: true,
            subject: true,
            status: true,
            scheduledAt: true,
            duration: true,
            sessionType: true,
            recurringType: true,
            learnerTimezone: true,
            tutorTimezone: true,
          },
        });
      }
    }
  }

  return {
    currentUser: currentUser
      ? {
          id: currentUser.id,
          name: getUserName(currentUser),
          role: currentUser.role,
          timezone: currentUser.timezone,
        }
      : null,
    partner: partner
      ? {
          id: partner.id,
          name: getUserName(partner),
          role: partner.role,
          timezone: partner.timezone,
        }
      : null,
    tutor: tutorContext,
    learner: learnerUser
      ? {
          id: learnerUser.id,
          name: getUserName(learnerUser),
          role: learnerUser.role,
          timezone: learnerUser.timezone,
          gradeLevel: learnerProfile?.gradeLevel,
          learningGoals: learnerProfile?.learningGoals,
          subjects: learnerProfile?.subjects || [],
        }
      : null,
    bookings: bookings.map((booking) => ({
      ...booking,
      scheduledAt: booking.scheduledAt?.toISOString?.() || booking.scheduledAt,
    })),
  };
};

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

exports.generateAiReply = async (req, res) => {
  const { conversationId } = req.params;

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: req.user.id } },
  });

  if (!participant) throw new AppError('Conversation not found', 404);

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, role: true, timezone: true } },
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 24,
        include: {
          sender: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  const messages = (conversation?.messages || []).reverse();
  const partner = conversation?.participants?.find((item) => item.userId !== req.user.id)?.user;
  const partnerName = `${partner?.firstName || ''} ${partner?.lastName || ''}`.trim();
  const context = await buildAiReplyContext({ conversation, currentUserId: req.user.id });

  try {
    const suggestion = await generateReply({
      messages,
      currentUserId: req.user.id,
      partnerName,
      context,
    });

    res.json({ success: true, data: suggestion });
  } catch (error) {
    throw new AppError(error.message || 'Failed to generate AI reply', error.statusCode || 502);
  }
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
