import api from './client';

export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  getAnalytics: (params) => api.get('/admin/analytics', { params }),
  getUsers: (params) => api.get('/admin/users', { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  updateUserStatus: (id, data) => api.patch(`/admin/users/${id}/status`, data),
  getPendingTutors: (params) => api.get('/admin/tutors/pending', { params }),
  approveTutor: (id) => api.patch(`/admin/tutors/${id}/approve`),
  rejectTutor: (id, reason) =>
    api.patch(`/admin/tutors/${id}/reject`, typeof reason === 'object' ? reason : { reason }),
  returnTutor: (id, feedback) =>
    api.patch(`/admin/tutors/${id}/return`, typeof feedback === 'object' ? feedback : { feedback }),
  getBookings: (params) => api.get('/admin/bookings', { params }),
  getActions: (params) => api.get('/admin/actions', { params }),
  createSubject: (data) => api.post('/admin/subjects', data),
  updateSubject: (id, data) => api.put(`/admin/subjects/${id}`, data),
  deleteSubject: (id) => api.delete(`/admin/subjects/${id}`),
};
