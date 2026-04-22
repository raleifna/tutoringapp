const express = require('express');
const {
    register,
    login,
    verifyEmail,
    resendVerification,
    refreshToken,
    logout,
    getMe,
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

// current user info should require login
router.get('/me', authenticate, getMe);

module.exports = router;
