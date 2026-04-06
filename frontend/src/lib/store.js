// src/lib/store.js - Zustand Global State Store
import { create } from 'zustand';
import { authApi } from './api-entry';

const STORAGE_KEYS = {
  USER: 'user',
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
};

const getStoredValue = (key) => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key);
};

const getStoredUser = () => {
  const rawUser = getStoredValue(STORAGE_KEYS.USER);
  if (!rawUser || rawUser === 'undefined') return null;
  try {
    return JSON.parse(rawUser);
  } catch {
    return null;
  }
};

const saveAuthToStorage = ({ user, accessToken, refreshToken }) => {
  if (typeof window === 'undefined') return;

  if (user) localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  else localStorage.removeItem(STORAGE_KEYS.USER);

  if (accessToken) localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
  else localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);

  if (refreshToken) localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  else localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
};

const clearAuthStorage = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.USER);
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
};

// ==================== AUTH STORE ====================
export const useAuthStore = create((set, get) => ({
  user: getStoredUser(),
  accessToken: getStoredValue(STORAGE_KEYS.ACCESS_TOKEN),
  refreshToken: getStoredValue(STORAGE_KEYS.REFRESH_TOKEN),
  isLoading: false,

  setAuth: ({ user, accessToken, refreshToken }) => {
    saveAuthToStorage({ user, accessToken, refreshToken });
    set({ user, accessToken, refreshToken });
  },

  setUser: (user) => {
    saveAuthToStorage({
      user,
      accessToken: get().accessToken,
      refreshToken: get().refreshToken,
    });
    set({ user });
  },

  initializeAuth: async () => {
    const { accessToken, user, fetchMe, logout } = get();
    if (!accessToken) return null;

    // If user already exists in storage, UI can use it immediately.
    if (user) {
      fetchMe().catch(() => {});
      return user;
    }

    const currentUser = await fetchMe();
    if (!currentUser) await logout();
    return currentUser;
  },

  logout: async () => {
    const { refreshToken } = get();
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {
      // Ignore errors
    }
    clearAuthStorage();
    set({ user: null, accessToken: null, refreshToken: null });
  },

  fetchMe: async () => {
    try {
      set({ isLoading: true });
      const { data } = await authApi.getMe();
      saveAuthToStorage({
        user: data.user,
        accessToken: get().accessToken,
        refreshToken: get().refreshToken,
      });
      set({ user: data.user, isLoading: false });
      return data.user;
    } catch {
      set({ isLoading: false });
      return null;
    }
  },

  isAuthenticated: () => !!get().accessToken,
  hasRole: (role) => get().user?.role === role,
  isTutor: () => get().user?.role === 'TUTOR',
  isLearner: () => get().user?.role === 'LEARNER',
  isAdmin: () => get().user?.role === 'ADMIN',
}));

export const useMessageStore = create((set) => ({
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
  incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
  clearUnread: () => set({ unreadCount: 0 }),
}));
