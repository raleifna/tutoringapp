const normalizeOrigin = (value = '') => value.trim().replace(/\/+$/, '');

const getAllowedOrigins = () =>
  (process.env.CORS_ORIGIN || '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

const isTryCloudflareOrigin = (origin) =>
  /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/i.test(origin);

const isAllowedOrigin = (origin, allowedOrigins = getAllowedOrigins()) => {
  if (!origin) return true;

  const normalizedOrigin = normalizeOrigin(origin);
  if (allowedOrigins.length === 0 || allowedOrigins.includes(normalizedOrigin)) {
    return true;
  }

  return (
    process.env.ALLOW_TRYCLOUDFLARE_CORS === 'true' &&
    isTryCloudflareOrigin(normalizedOrigin)
  );
};

module.exports = {
  getAllowedOrigins,
  isAllowedOrigin,
  normalizeOrigin,
};
