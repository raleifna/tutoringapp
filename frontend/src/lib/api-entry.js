// src/lib/api-entry.js - switch between backend API and mock API
import { authApi as realAuthApi } from './api';
import { authApi as mockAuthApi } from '../mocks/auth.mock';

const normalizeMode = (value) => (value === 'mock' ? 'mock' : 'backend');
const STAGE1_API_MODE = normalizeMode(process.env.NEXT_PUBLIC_STAGE1_API_MODE);

// Stage 1 pages/store currently use auth APIs.
export const authApi = STAGE1_API_MODE === 'mock' ? mockAuthApi : realAuthApi;
