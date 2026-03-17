const express = require('express');
const { authenticate } = require('../middleware/auth');
const {
    createBooking,
    getMyBookings,
    getBookingById,
    updateBookingStatus,
} = require('../controllers/bookingController');

const router = express.Router();

router.use(authenticate);

router.post('/', createBooking);
router.get('/me', getMyBookings);
router.get('/:id', getBookingById);
router.patch('/:id/status', updateBookingStatus);

module.exports = router;
