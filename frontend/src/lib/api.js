// axios instance
import axios from 'axios';

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

// tutor APIs
export const tutorApi = {
    search: (params) => {
        return api.get('/tutors', { params });
    },
    getById: (id) => {
        return api.get(`/tutors/${id}`);
    },
    getAvailability: (id) => {
        return api.get(`/tutors/${id}/availability`);
    },
    getMyProfile: () => {
        return api.get('/tutors/me/profile');
    },
    updateApplication: (formData) => {
        return api.put('/tutors/me/application', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            },
        });
    },
    updateProfile: (data) => {
        return api.put('/tutors/me/profile', data);
    },
    updateAvailability: (availability) => {
        return api.put('/tutors/me/availability', { availability });
    },
    addSubject: (subjectId, data) => {
        return api.post('/tutors/me/subjects', { subjectId, ...data });
    },
    removeSubject: (subjectId) => {
        return api.delete(`/tutors/me/subjects/${subjectId}`);
    },
};

// booking APIs
export const bookingApi = {
    create: (data) => {
        return api.post('/bookings', data);
    },
    getMyBookings: (params) => {
        return api.get('/bookings/my-bookings', { params });
    },
    getTutorBookings: (params) => {
        return api.get('/bookings/tutor/requests', { params });
    },
    getById: (id) => {
        return api.get(`/bookings/${id}`);
    },
    cancel: (id, reason) => {
        return api.post(`/bookings/${id}/cancel`, { reason });
    },
    accept: (id, data) => {
        return api.patch(`/bookings/${id}/accept`, data);
    },
    decline: (id, reason) => {
        return api.patch(`/bookings/${id}/decline`, { reason });
    },
    reschedule: (id, data) => {
        return api.patch(`/bookings/${id}/reschedule`, data);
    },
    complete: (id) => {
        return api.patch(`/bookings/${id}/complete`);
    },
};

// subject APIs
export const subjectApi = {
    getAll: (params) => {
        return api.get('/subjects', { params });
    },
    getCategories: () => {
        return api.get('/subjects/categories');
    },
};

// user APIs
export const userApi = {
    updateProfile: (data) => {
        return api.put('/users/me', data);
    },
    uploadAvatar: (formData) => {
        return api.post('/users/me/avatar', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            },
        });
    },
};
  
