import api from './client';

export const notificationApi = {
  search: (params) => api.get('/notifications', { params }),
  markAsRead: (ids) => api.put(`/notifications/read?ids=${ids}`),
  addTestsData: () => api.post('/notifications/test'),
};
