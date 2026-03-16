// src/lib/api-entry.js - switch between backend API and mock API
import { authApi as realAuthApi } from './api';
import { authApi as mockAuthApi } from '../mocks/auth.mock';

export const API_MODE = process.env.NEXT_PUBLIC_API_MODE === 'mock' ? 'mock' : 'backend';

export const authApi = API_MODE === 'mock' ? mockAuthApi : realAuthApi;
