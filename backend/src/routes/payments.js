const express = require('express');

const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/method', paymentController.getSavedPaymentMethod);
router.patch('/method/default', paymentController.setDefaultPaymentMethod);
router.delete('/method', paymentController.deleteSavedPaymentMethod);
router.delete('/method/:paymentMethodId', paymentController.deleteSavedPaymentMethod);
router.post('/setup-intent', paymentController.createSetupIntent);
router.post('/complete-setup-intent', paymentController.completeSetupIntent);
router.post('/bookings/:bookingId/use-saved-method', paymentController.useSavedMethodForBooking);

module.exports = router;
