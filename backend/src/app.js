const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

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

app.get('/api/v1/demo', (_req, res) => {
  res.json({
    success: true,
    message: 'TutorConnect backend is running.',
    endpoints: ['/health', '/api/v1/health'],
  });
});

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found.',
  });
});

module.exports = app;
