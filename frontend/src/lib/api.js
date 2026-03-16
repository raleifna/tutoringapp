// axios instance
import axios from 'axios';

const API_URL = '/api/v1';

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
    
        if (error.response?.status === 401 && !originalRequest._retry) {
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
                const accessToken = response.data.data.accessToken;
                const newRefreshToken = response.data.data.refreshToken;

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

export default api;

// auth APIs
export const authApi = {
    register: (data) => {
        if (data instanceof FormData) {
            return api.post('/auth/register', data, { 
                headers: { 
                    'Content-Type': 'multipart/form-data' 
                },
            });
        }
        return api.post('/auth/register', data);
    },

    login: (data) => {
        return api.post('/auth/login', data);
    },
    logout: (refreshToken) => {
        return api.post('/auth/logout', { refreshToken });
    },

    getMe: () => {
        return api.get('/auth/me');
    },

    changePassword: (data) => {
        return api.post('/auth/change-password', data);
    },
    verifyEmail: (token) => {
        return api.get(`/auth/verify-email?token=${token}`);
    },
    resendVerification: (data) => {
        return api.post('/auth/resend-verification', data);
    },
};
  