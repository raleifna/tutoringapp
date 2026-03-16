const express = require('express');
const { updateMyProfile } = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// profile update route for the current user
router.put('/me', authenticate, updateMyProfile);

module.exports = router;
