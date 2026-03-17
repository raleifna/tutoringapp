const express = require('express');
const tutorController = require('../controllers/tutorController');
const router = express.Router();
router.get('/',tutorController.searchTutors);
router.get('/:id',tutorController.getTutorProfile);
router.get('/:id/availability',tutorController.getTutorAvailability);
router.get('/me/profile', authorize('TUTOR'), tutorController.getMyProfile);
router.put(
  '/me/application',
  authorize('TUTOR'),
  upload.array('verificationFiles', 5),
  tutorController.updateApplication
);
router.put('/me/profile', tutorController.updateProfile);
router.put('/me/availability',tutorController.updateAvailability);
router.post('/me/subjects', tutorController.addSubject);
router.delete('/me/subjects/:subjectId', tutorController.removeSubject);

module.exports = router;
