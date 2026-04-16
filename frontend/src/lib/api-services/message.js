import api from './client';

export const messageApi = {
  getConversations: () => api.get('/messages/conversations'),
  createConversation: (userId) => api.post('/messages/conversations', { userId }),
  getMessages: (conversationId, params) =>
    api.get(`/messages/conversations/${conversationId}`, { params }),
  sendMessage: (conversationId, data) => api.post(`/messages/conversations/${conversationId}`, data),
  markAsRead: (conversationId) => api.patch(`/messages/conversations/${conversationId}/read`),
  getUnreadCount: () => api.get('/messages/unread-count'),
};
