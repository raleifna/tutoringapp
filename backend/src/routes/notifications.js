const express = require('express');
const { searchNotifications } = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, searchNotifications);

module.exports = router;
