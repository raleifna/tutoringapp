// src/lib/api-entry.js - switch between backend API and mock API
import {
  authApi as realAuthApi,
  bookingApi as realBookingApi,
  subjectApi as realSubjectApi,
  tutorApi as realTutorApi,
} from './api';
import { authApi as mockAuthApi } from '../mocks/stage1.mock';
import { bookingApi as mockBookingApi } from '../mocks/stage3.mock';
import {
  subjectApi as mockSubjectApi,
  tutorApi as mockTutorApi,
} from '../mocks/stage2.mock';

const normalizeMode = (value, fallback = 'backend') => {
  if (value === 'mock') return 'mock';
  if (value === 'backend') return 'backend';
  return fallback;
};

const STAGE1_API_MODE = normalizeMode(process.env.NEXT_PUBLIC_STAGE1_API_MODE);
const STAGE2_API_MODE = normalizeMode(process.env.NEXT_PUBLIC_STAGE2_API_MODE, STAGE1_API_MODE);
const STAGE3_API_MODE = normalizeMode(process.env.NEXT_PUBLIC_STAGE3_API_MODE, STAGE1_API_MODE);

// Stage 1: auth
export const authApi = STAGE1_API_MODE === 'mock' ? mockAuthApi : realAuthApi;

// Stage 2: subject + tutor
export const subjectApi = STAGE2_API_MODE === 'mock' ? mockSubjectApi : realSubjectApi;
export const tutorApi = STAGE2_API_MODE === 'mock' ? mockTutorApi : realTutorApi;

// Stage 3: booking
export const bookingApi = STAGE3_API_MODE === 'mock' ? mockBookingApi : realBookingApi;
