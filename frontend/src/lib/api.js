import api from './api-services/client';

export { adminApi } from './api-services/admin';
export { authApi } from './api-services/auth';
export { bookingApi } from './api-services/booking';
export { messageApi } from './api-services/message';
export { notificationApi } from './api-services/notification';
export { subjectApi } from './api-services/subject';
export { tutorApi } from './api-services/tutor';
export { userApi } from './api-services/user';

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
    updateCurrentWeekAvailability: (availability) => {
        return api.put('/tutors/me/availability/current-week', { availability });
    },
    clearCurrentWeekAvailability: () => {
        return api.delete('/tutors/me/availability/current-week');
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
    pay: (id) => {
        return api.patch(`/bookings/${id}/payment/pay`);
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

export const messageApi = {
    getConversations: () => {
        return api.get('/messages/conversations');
    },
    createConversation: (userId) => {
        return api.post('/messages/conversations', { userId });
    },
    getMessages: (conversationId, params) => {
        return api.get(`/messages/conversations/${conversationId}`, { params });
    },
    sendMessage: (conversationId, data) => {
        return api.post(`/messages/conversations/${conversationId}`, data);
    },
    markAsRead: (conversationId) => {
        return api.patch(`/messages/conversations/${conversationId}/read`);
    },
    getUnreadCount: () => {
        return api.get('/messages/unread-count');
    },
};

// admin APIs
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

// notification APIs
export const notificationApi = {
    search: (params) => {
        return api.get('/notifications', { params });
    },
    markAsRead: (ids) => {
        return api.put(`/notifications/read?ids=${ids}`);
    },
    addTestsData: () => {
        return api.post('/notifications/test');
    },
};
