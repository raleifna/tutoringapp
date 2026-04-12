const express = require('express');

const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.post('/setup-intent', paymentController.createSetupIntent);
router.post('/complete-setup-intent', paymentController.completeSetupIntent);

module.exports = router;
