const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { notFound, errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');

const app = express();

const normalizeOrigin = (value = '') => value.trim().replace(/\/+$/, '');
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);

app.set('trust proxy', 1);
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(normalizeOrigin(origin))) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked: ${origin}`));
    },
  })
);
app.use(express.json());
app.use(morgan('dev'));

const createHealthPayload = () => ({
  success: true,
  name: 'TutorConnect API',
  timestamp: new Date().toISOString(),
});

app.get('/health', (_req, res) => {
  res.json(createHealthPayload());
});

app.get('/api/v1/health', (_req, res) => {
  res.json(createHealthPayload());
});

// stage 1: only auth and users routes are enabled
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
