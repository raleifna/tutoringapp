// src/lib/store.js - Zustand Global State Store
import { create } from 'zustand';
import { authApi } from './api-entry';
import {
  clearAuthStorage,
  getStoredUser,
  getStoredValue,
  saveAuthToStorage,
  STORAGE_KEYS,
} from './auth-storage';
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
      return nextUser;
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
