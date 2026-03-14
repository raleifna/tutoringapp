// server.js - Entry Point
require('dotenv').config();
require('express-async-errors');

const app = require('./src/app');
const { prisma } = require('./src/config/database');
const logger = require('./src/config/logger');

const PORT = process.env.PORT || 5050;
let server;

// Start server
const start = async () => {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');

    server = app.listen(PORT, () => {
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
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
    return;
  }
  process.exit(0);
});