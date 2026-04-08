// server.js - Entry Point
require('dotenv').config();
require('express-async-errors');

const http = require('http');

const app = require('./src/app');
const { initSocket } = require('./src/services/socketService');
const { prisma } = require('./src/config/database');
const logger = require('./src/config/logger');

const PORT = process.env.PORT || 5050;
const server = http.createServer(app);

initSocket(server);

// Start server
const start = async () => {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');

    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
      logger.info(`API Docs: http://localhost:${PORT}/api/v1/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  await prisma.$disconnect();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

start();
