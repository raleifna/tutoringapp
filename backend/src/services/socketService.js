const { Server } = require('socket.io');
const { prisma } = require('../config/database');
const logger = require('../config/logger');
const { verifyAccessToken } = require('../utils/tokens');
const {
  getAllowedOrigins: getConfiguredOrigins,
  isAllowedOrigin,
  normalizeOrigin,
} = require('../utils/cors');

let io = null;

const getAllowedOrigins = () => {
  const configuredOrigins = getConfiguredOrigins();

  if (process.env.FRONTEND_URL) {
    configuredOrigins.push(normalizeOrigin(process.env.FRONTEND_URL));
  }

  if (configuredOrigins.length === 0) {
    configuredOrigins.push('http://localhost:3000');
  }

  return Array.from(new Set(configuredOrigins));
};

const normalizeSocketToken = (token) => {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const trimmedToken = token.trim();
  if (!trimmedToken) {
    return null;
  }

  return trimmedToken.startsWith('Bearer ')
    ? trimmedToken.slice('Bearer '.length).trim()
    : trimmedToken;
};

const getUserFromSocketToken = async (token) => {
  const normalizedToken = normalizeSocketToken(token);
  if (!normalizedToken) {
    return null;
  }

  let payload;

  try {
    payload = verifyAccessToken(normalizedToken);
  } catch (_error) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: payload.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
    },
  });
};

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => callback(null, isAllowedOrigin(origin, getAllowedOrigins())),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
  });

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization ||
        socket.handshake.query?.token;
      const user = await getUserFromSocketToken(token);

      if (!user) {
        return next(new Error('Invalid token'));
      }

      socket.userId = user.id;
      socket.user = user;
      return next();
    } catch (error) {
      logger.error('Socket authentication failed:', error);
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

module.exports = { initSocket, getSocketIO, getUserFromSocketToken };
