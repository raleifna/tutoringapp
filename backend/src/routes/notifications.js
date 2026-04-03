const express = require('express');
const { searchNotifications, markAsRead, addTestsData } = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, searchNotifications);
router.put('/read', authenticate, markAsRead);
router.post('/test', authenticate, addTestsData);

module.exports = router;
