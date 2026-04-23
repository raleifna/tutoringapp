const { AppError } = require('./errorHandler');

const ELEVATED_ROLES = ['SYSTEM_ADMIN', 'ADMIN'];

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    if (req.user.role === 'SYSTEM_ADMIN') return next();

    if (!roles.includes(req.user.role)) {
      throw new AppError('Access denied', 403);
    }

    next();
  };
};

const authorizeOwner = (paramName = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const targetId = req.params[paramName] || req.body[paramName];

    if (ELEVATED_ROLES.includes(req.user.role)) {
      return next();
    }

    if (targetId && targetId !== req.user.id) {
      throw new AppError('Access denied: You can only access your own resources', 403);
    }

    next();
  };
};

const authorizeActiveTutor = (req, res, next) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  if (req.user.role !== 'TUTOR') {
    throw new AppError('Access denied', 403);
  }

  const tutorProfile = req.user.tutorProfile;
  const tutorStatus = String(tutorProfile?.status || '').toUpperCase();

  if (tutorStatus !== 'ACTIVE') {
    throw new AppError('Your tutor account must be approved before using this feature.', 403);
  }

  next();
};

module.exports = { authorize, authorizeOwner, authorizeActiveTutor };
