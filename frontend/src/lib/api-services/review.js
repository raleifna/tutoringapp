import api from './client';

export const reviewApi = {
  create: (data) => api.post('/reviews', data),
  getTutorReviews: (tutorId, params) => api.get(`/reviews/tutor/${tutorId}`, { params }),
  delete: (id) => api.delete(`/reviews/${id}`),
};
