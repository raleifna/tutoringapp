const { Server } = require('socket.io');
const { prisma } = require('../config/database');
const logger = require('../config/logger');

let io = null;

const getAllowedOrigins = () => {
  const normalizeOrigin = (value = '') => value.trim().replace(/\/+$/, '');
  const configuredOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

  if (process.env.FRONTEND_URL) {
    configuredOrigins.push(normalizeOrigin(process.env.FRONTEND_URL));
  }

  if (configuredOrigins.length === 0) {
    configuredOrigins.push('http://localhost:3000');
  }

  return Array.from(new Set(configuredOrigins));
};

const getUserFromSocketToken = async (token) => {
  if (!token || typeof token !== 'string' || !token.startsWith('demo-token-')) {
    return null;
  }

  const userId = token.replace('demo-token-', '');

  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, firstName: true, lastName: true, role: true },
  });
};

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: getAllowedOrigins(),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      const user = await getUserFromSocketToken(token);

      if (!user) {
        return next(new Error('Invalid token'));
      }

      socket.userId = user.id;
      socket.user = user;
      return next();
    } catch (error) {
      return next(new Error('Socket authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} | User: ${socket.userId}`);
    socket.join(`user:${socket.userId}`);

    socket.on('join_conversation', async (conversationId) => {
      try {
        const participant = await prisma.conversationParticipant.findUnique({
          where: {
            conversationId_userId: { conversationId, userId: socket.userId },
          },
        });

        if (participant) {
          socket.join(`conversation:${conversationId}`);
        }
      } catch (error) {
        logger.error('Failed to join conversation room:', error);
      }
    });

    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on('typing', ({ conversationId, isTyping }) => {
      socket.to(`conversation:${conversationId}`).emit('user_typing', {
        conversationId,
        userId: socket.userId,
        userName: `${socket.user.firstName} ${socket.user.lastName}`.trim(),
        isTyping: Boolean(isTyping),
      });
    });

    socket.on('mark_read', ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit('messages_read', {
        conversationId,
        userId: socket.userId,
      });
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id} | User: ${socket.userId}`);
    });
  });

  logger.info('Socket.io initialized');
  return io;
};

const getSocketIO = () => io;

module.exports = { initSocket, getSocketIO };
