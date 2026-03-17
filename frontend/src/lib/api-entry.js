// src/lib/api-entry.js - switch between backend API and mock API
import {
  authApi as realAuthApi,
  subjectApi as realSubjectApi,
  tutorApi as realTutorApi,
} from './api';
import { authApi as mockAuthApi } from '../mocks/auth.mock';
import {
  subjectApi as mockSubjectApi,
  tutorApi as mockTutorApi,
} from '../mocks/stage2.mock';

const normalizeMode = (value) => (value === 'mock' ? 'mock' : 'backend');
const STAGE1_API_MODE = normalizeMode(process.env.NEXT_PUBLIC_STAGE1_API_MODE);

// Current implemented pages use these 3 APIs.
export const authApi = STAGE1_API_MODE === 'mock' ? mockAuthApi : realAuthApi;
export const subjectApi = STAGE1_API_MODE === 'mock' ? mockSubjectApi : realSubjectApi;
export const tutorApi = STAGE1_API_MODE === 'mock' ? mockTutorApi : realTutorApi;
