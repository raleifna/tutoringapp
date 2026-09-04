const express = require('express');
const { body } = require('express-validator');
const messageController = require('../controllers/messageController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

router.use(authenticate);

router.get('/conversations', messageController.getConversations);
router.post('/conversations', messageController.createOrGetConversation);
router.get('/conversations/:conversationId', messageController.getConversationMessages);
router.post(
  '/conversations/:conversationId',
  [body('content').trim().notEmpty().withMessage('Message content required')],
  validate,
  messageController.sendMessage
);
router.post('/conversations/:conversationId/ai-reply', messageController.generateAiReply);
router.patch('/conversations/:conversationId/read', messageController.markAsRead);
router.get('/unread-count', messageController.getUnreadCount);

module.exports = router;
