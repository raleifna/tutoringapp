import api from './api-services/client';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || '/api/v1').replace(/\/$/, '');

const api = axios.create({
    baseURL: API_URL,
    headers: { 
        'Content-Type': 'application/json' 
    },
    timeout: 30000,
});

// attach token if exists
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// handle expired token
api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // Skip refresh logic for auth endpoints — 401 there means invalid credentials,
        // not an expired session. Let the caller's catch block handle it directly.
        const requestUrl = originalRequest?.url || '';
        const isAuthEndpoint = /\/auth\/(login|register|verify-email|resend-verification|refresh-token)/.test(requestUrl);

        if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
            originalRequest._retry = true;
    
            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) {
                localStorage.clear();
                window.location.href = '/login';
                return Promise.reject(error);
            }
    
            try {
                const response = await axios.post(`${API_URL}/auth/refresh-token`, {
                    refreshToken
                });
                const accessToken = response.data.accessToken;
                const newRefreshToken = response.data.refreshToken;

                localStorage.setItem('accessToken', accessToken);
                localStorage.setItem('refreshToken', newRefreshToken);

                originalRequest.headers.Authorization = `Bearer ${accessToken}`;

                return api(originalRequest);
            } catch {
                localStorage.clear();
                window.location.href = '/login';
                return Promise.reject(error);
            }
        }
    
        return Promise.reject(error);
    }
);

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
