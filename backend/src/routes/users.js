const express = require('express');
const { updateMyProfile } = require('../controllers/userController');

const router = express.Router();

// profile update route for the current user
router.put('/me', updateMyProfile);

module.exports = router;
