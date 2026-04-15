import api from './client';

export const subjectApi = {
  getAll: (params) => api.get('/subjects', { params }),
  getCategories: () => api.get('/subjects/categories'),
};
