const { AppError } = require('./errorHandler');

const ELEVATED_ROLES = ['SYSTEM_ADMIN', 'ADMIN'];

/**
 * Authorize specific roles.
 * SYSTEM_ADMIN always passes (super-admin).
 * @param {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    if (req.user.role === 'SYSTEM_ADMIN') return next();

    if (!roles.includes(req.user.role)) {
      throw new AppError(
        `Access denied. Required roles: ${roles.join(', ')}. Your role: ${req.user.role}`,
        403
      );
    }

    next();
  };
};

/**
 * Ensure user can only access their own resources (or admin/system-admin can access all)
 * @param {string} paramName - The param name with user ID (default: 'userId')
 */
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

module.exports = { authorize, authorizeOwner };
