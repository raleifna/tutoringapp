import api from './client';

export const userApi = {
  updateProfile: (data) => api.put('/users/me', data),
  uploadAvatar: (formData) =>
    api.post('/users/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
};
