import api from './client';

export const authApi = {
  register: (data) => {
    if (data instanceof FormData) {
      return api.post('/auth/register', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    }

    return api.post('/auth/register', data);
  },
  login: (data) => api.post('/auth/login', data),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
  verifyEmail: (token) => api.get(`/auth/verify-email?token=${token}`),
  resendVerification: (data) => api.post('/auth/resend-verification', data),
};
