const express = require('express');
const { body } = require('express-validator');
const adminController = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');

const router = express.Router();

router.use(authenticate, authorize('ADMIN', 'SYSTEM_ADMIN'));

router.get('/dashboard', adminController.getDashboard);
router.get('/analytics', adminController.getAnalytics);

router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUser);
router.patch(
  '/users/:id/status',
  body('status').isIn(['ACTIVE', 'SUSPENDED', 'DEACTIVATED']).withMessage('Invalid status'),
  body('reason').optional().isString(),
  validate,
  adminController.updateUserStatus
);

router.get('/tutors/pending', adminController.getPendingTutors);
router.patch('/tutors/:id/approve', adminController.approveTutor);
router.patch(
  '/tutors/:id/reject',
  body('reason').optional().isString(),
  validate,
  adminController.rejectTutor
);
router.patch(
  '/tutors/:id/return',
  body('feedback').trim().notEmpty().withMessage('Feedback is required'),
  validate,
  adminController.returnTutor
);

router.get('/bookings', adminController.getBookings);
router.get('/actions', adminController.getAdminActions);
router.post(
  '/subjects',
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('description').optional().isString(),
  validate,
  adminController.createSubject
);
router.put(
  '/subjects/:id',
  body('name').optional().isString(),
  body('category').optional().isString(),
  body('description').optional({ nullable: true }).isString(),
  validate,
  adminController.updateSubject
);
router.delete('/subjects/:id', adminController.deleteSubject);

module.exports = router;
