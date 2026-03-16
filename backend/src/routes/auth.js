const express = require('express');

router.post(
  '/register',
  upload.array('verificationFiles', 5),
  registerRules,
  validate,
  authController.register
);
router.post('/login', loginRules, validate, authController.login);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);
router.get('/verify-email', authController.verifyEmail); // ?token=xxx
router.post('/resend-verification', authController.resendVerification); // { email }
    