// src/lib/api-entry.js - all APIs use real backend
// import {
//   adminApi as realAdminApi,
//   authApi as realAuthApi,
//   bookingApi as realBookingApi,
//   subjectApi as realSubjectApi,
//   tutorApi as realTutorApi,
//   userApi as realUserApi,
export {
  adminApi,
  authApi,
  bookingApi,
  subjectApi,
  tutorApi,
  userApi,
  notificationApi,
} from './api';
// import { authApi as mockAuthApi } from '../mocks/stage1.mock';
// import { bookingApi as mockBookingApi } from '../mocks/stage3.mock';
// import {
//   subjectApi as mockSubjectApi,
//   tutorApi as mockTutorApi,
// } from '../mocks/stage2.mock';
// import {
//   bookingApi as mockStage4BookingApi,
//   tutorApi as mockStage4TutorApi,
//   userApi as mockUserApi,
// } from '../mocks/stage4.mock';
// import { adminApi as mockAdminApi } from '../mocks/stage5.mock';

// const normalizeMode = (value, fallback = 'backend') => {
//   if (value === 'mock') return 'mock';
//   if (value === 'backend') return 'backend';
//   return fallback;
// };

// const STAGE1_API_MODE = normalizeMode(process.env.NEXT_PUBLIC_STAGE1_API_MODE);
// const STAGE2_API_MODE = normalizeMode(process.env.NEXT_PUBLIC_STAGE2_API_MODE, STAGE1_API_MODE);
// const STAGE3_API_MODE = normalizeMode(process.env.NEXT_PUBLIC_STAGE3_API_MODE, STAGE1_API_MODE);
// const STAGE4_API_MODE = normalizeMode(process.env.NEXT_PUBLIC_STAGE4_API_MODE, STAGE1_API_MODE);
// const STAGE5_API_MODE = normalizeMode(process.env.NEXT_PUBLIC_STAGE5_API_MODE, STAGE1_API_MODE);

// // Stage 1: auth
// export const authApi = STAGE1_API_MODE === 'mock' ? mockAuthApi : realAuthApi;

// // Stage 2: subject + tutor
// export const subjectApi = STAGE2_API_MODE === 'mock' ? mockSubjectApi : realSubjectApi;

// const stage2TutorSource = STAGE2_API_MODE === 'mock' ? mockTutorApi : realTutorApi;
// const stage4TutorSource = STAGE4_API_MODE === 'mock' ? mockStage4TutorApi : realTutorApi;
// export const tutorApi = {
//   search: stage2TutorSource.search,
//   getById: stage2TutorSource.getById,
//   getAvailability: stage2TutorSource.getAvailability,
//   getMyProfile: stage4TutorSource.getMyProfile,
//   updateApplication: stage4TutorSource.updateApplication,
//   updateProfile: stage4TutorSource.updateProfile,
//   updateAvailability: stage4TutorSource.updateAvailability,
//   addSubject: stage4TutorSource.addSubject,
//   removeSubject: stage4TutorSource.removeSubject,
// };

// // Stage 3: booking
// const stage3BookingSource = STAGE3_API_MODE === 'mock' ? mockBookingApi : realBookingApi;
// const stage4BookingSource = STAGE4_API_MODE === 'mock' ? mockStage4BookingApi : realBookingApi;

// const callWithFallback = async (primaryFn, fallbackFn, ...args) => {
//   try {
//     return await primaryFn(...args);
//   } catch (error) {
//     const status = error?.response?.status;
//     if (!fallbackFn) throw error;
//     if (status === 403 || status === 404 || status === 501) {
//       return fallbackFn(...args);
//     }
//     throw error;
//   }
// };

// export const bookingApi = {
//   create: stage3BookingSource.create,
//   getMyBookings: stage3BookingSource.getMyBookings,
//   cancel: stage3BookingSource.cancel,
//   getById: (id) => {
//     if (STAGE3_API_MODE === STAGE4_API_MODE) {
//       return stage3BookingSource.getById(id);
//     }
//     return callWithFallback(stage3BookingSource.getById, stage4BookingSource.getById, id);
//   },
//   getTutorBookings: stage4BookingSource.getTutorBookings,
//   accept: stage4BookingSource.accept,
//   decline: stage4BookingSource.decline,
//   reschedule: stage4BookingSource.reschedule,
//   complete: stage4BookingSource.complete,
// };

// // Stage 4: user profile
// export const userApi = STAGE4_API_MODE === 'mock' ? mockUserApi : realUserApi;

// // Stage 5: admin
// export const adminApi = STAGE5_API_MODE === 'mock' ? mockAdminApi : realAdminApi;
