const { validationResult } = require('express-validator');
const { ValidationError } = require('./errorHandler');

const validate = (req, _res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(
      errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      }))
    );
  }

  next();
};

module.exports = { validate };
