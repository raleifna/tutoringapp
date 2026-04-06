const express = require('express');

const tutorController = require('../controllers/tutorController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { upload } = require('../middleware/upload');

const router = express.Router();

router.get('/', optionalAuth, tutorController.searchTutors);
router.get('/:id', optionalAuth, tutorController.getTutorProfile);
router.get('/:id/availability', tutorController.getTutorAvailability);

router.use(authenticate);

router.get('/me/profile', authorize('TUTOR'), tutorController.getMyProfile);
router.put(
  '/me/application',
  authorize('TUTOR'),
  upload.array('verificationFiles', 5),
  tutorController.updateApplication
);
router.put('/me/profile', authorize('TUTOR'), tutorController.updateProfile);
router.put('/me/availability', authorize('TUTOR'), tutorController.updateAvailability);
router.put(
  '/me/availability/current-week',
  authorize('TUTOR'),
  tutorController.updateCurrentWeekAvailability
);
router.delete(
  '/me/availability/current-week',
  authorize('TUTOR'),
  tutorController.clearCurrentWeekAvailability
);
router.post('/me/subjects', authorize('TUTOR'), tutorController.addSubject);
router.delete('/me/subjects/:subjectId', authorize('TUTOR'), tutorController.removeSubject);

module.exports = router;
