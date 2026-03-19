const express = require('express');
const {
    register,
    login,
    refreshToken,
    logout,
    getMe,
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

router.post('/register', upload.array('verificationFiles', 5), register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

// current user info should require login
router.get('/me', authenticate, getMe);

module.exports = router;
