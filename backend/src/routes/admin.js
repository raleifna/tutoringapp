const express = require('express');
// const { body } = require('express-validator');

// const adminController = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
// const { validate } = require('../middleware/validate');

const router = express.Router();

router.use(authenticate, authorize('ADMIN', 'SYSTEM_ADMIN'));

module.exports = router;
