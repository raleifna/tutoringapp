const express = require('express');
const { body } = require('express-validator');
const reviewController = require('../controllers/reviewController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');

const router = express.Router();

router.get('/tutor/:id', optionalAuth, reviewController.getTutorReviews);

router.post(
  '/',
  authenticate,
  authorize('LEARNER'),
  body('bookingId').trim().notEmpty().withMessage('Booking is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional({ nullable: true }).isString().isLength({ max: 1000 }).withMessage('Comment is too long'),
  validate,
  reviewController.createReview
);

router.delete('/:id', authenticate, reviewController.deleteReview);

module.exports = router;
