import api from './api-services/client';

export { adminApi } from './api-services/admin';
export { authApi } from './api-services/auth';
export { bookingApi } from './api-services/booking';
export { messageApi } from './api-services/message';
export { notificationApi } from './api-services/notification';
export { subjectApi } from './api-services/subject';
export { tutorApi } from './api-services/tutor';
export { userApi } from './api-services/user';

export const paymentApi = {
  getSavedMethod: () => api.get('/payments/method'),
  setDefaultMethod: (paymentMethodId) =>
    api.patch('/payments/method/default', { paymentMethodId }),
  deleteSavedMethod: () => api.delete('/payments/method'),
  deleteMethod: (paymentMethodId) => api.delete(`/payments/method/${paymentMethodId}`),
  createSetupIntent: () => api.post('/payments/setup-intent'),
  completeSetupIntent: (payload) =>
    api.post(
      '/payments/complete-setup-intent',
      typeof payload === 'string' ? { setupIntentId: payload } : payload
    ),
  useSavedMethodForBooking: (bookingId) =>
    api.post(`/payments/bookings/${bookingId}/use-saved-method`),
};

export default api;
