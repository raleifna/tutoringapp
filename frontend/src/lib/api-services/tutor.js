import api from './client';

export const tutorApi = {
  search: (params) => api.get('/tutors', { params }),
  getById: (id) => api.get(`/tutors/${id}`),
  getAvailability: (id) => api.get(`/tutors/${id}/availability`),
  getMyProfile: () => api.get('/tutors/me/profile'),
  updateApplication: (formData) =>
    api.put('/tutors/me/application', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
  updateProfile: (data) => api.put('/tutors/me/profile', data),
  updateAvailability: (availability) => api.put('/tutors/me/availability', { availability }),
  updateCurrentWeekAvailability: (availability) =>
    api.put('/tutors/me/availability/current-week', { availability }),
  clearCurrentWeekAvailability: () => api.delete('/tutors/me/availability/current-week'),
  addSubject: (subjectId, data) => api.post('/tutors/me/subjects', { subjectId, ...data }),
  removeSubject: (subjectId) => api.delete(`/tutors/me/subjects/${subjectId}`),
};
