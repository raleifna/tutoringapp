import api from './client';

export const bookingApi = {
  create: (data) => api.post('/bookings', data),
  getMyBookings: (params) => api.get('/bookings/my-bookings', { params }),
  getTutorBookings: (params) => api.get('/bookings/tutor/requests', { params }),
  getById: (id) => api.get(`/bookings/${id}`),
  pay: (id) => api.patch(`/bookings/${id}/payment/pay`),
  cancel: (id, reason) => api.post(`/bookings/${id}/cancel`, { reason }),
  accept: (id, data) => api.patch(`/bookings/${id}/accept`, data),
  decline: (id, reason) => api.patch(`/bookings/${id}/decline`, { reason }),
  reschedule: (id, data) => api.patch(`/bookings/${id}/reschedule`, data),
  complete: (id) => api.patch(`/bookings/${id}/complete`),
};
