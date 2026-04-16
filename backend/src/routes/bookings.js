const express = require('express');
const { body } = require('express-validator');

const bookingController = require('../controllers/bookingController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');

const router = express.Router();

router.use(authenticate);

const bookingRules = [
  body('tutorId').notEmpty().withMessage('Tutor ID required'),
  body('subject').custom((value, { req }) => {
    const subject = typeof value === 'string' ? value.trim() : '';
    const subjectId = typeof req.body.subjectId === 'string' ? req.body.subjectId.trim() : '';

    if (!subject && !subjectId) {
      throw new Error('Subject required');
    }

    return true;
  }),
  body('subjectId').custom((value) => {
    if (value === undefined || value === null || value === '') return true;
    if (typeof value !== 'string') throw new Error('Subject ID must be a string');
    return true;
  }),
  body('scheduledAt').isISO8601().withMessage('Valid date-time required'),
  body('duration').isInt({ min: 30, max: 480 }).withMessage('Duration must be 30-480 minutes'),
  body('sessionType').isIn(['ONLINE', 'IN_PERSON', 'HYBRID']).withMessage('Invalid session type'),
  body('recurringType')
    .optional()
    .isIn(['ONE_OFF', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY'])
    .withMessage('Invalid recurring type'),
  body('recurringGroupId')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage('Invalid recurring group ID'),
  body('meetingTool')
    .optional()
    .isIn(['GOOGLE_MEET', 'ZOOM', 'MICROSOFT_TEAMS', 'SKYPE', 'OTHER'])
    .withMessage('Invalid meeting tool'),
];

router.post('/', authorize('LEARNER'), bookingRules, validate, bookingController.createBooking);
router.get('/my-bookings', bookingController.getMyBookings);
router.get('/tutor/requests', authorize('TUTOR'), bookingController.getTutorBookings);
router.get('/:id', bookingController.getBooking);
router.patch('/:id/payment/pay', authorize('LEARNER'), bookingController.payForBooking);
router.post('/:id/cancel', bookingController.cancelBooking);
router.patch('/:id/accept', authorize('TUTOR'), bookingController.acceptBooking);
router.patch('/:id/decline', authorize('TUTOR'), bookingController.declineBooking);
router.patch('/:id/complete', authorize('TUTOR'), bookingController.completeBooking);

module.exports = router;
