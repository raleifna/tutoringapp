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
import {
  applyIpContextFallback,
  fetchClientIpContext,
  isPrivateIpAddress,
  preserveClientIpContext,
} from './ip-location';

// ==================== AUTH STORE ====================
export const useAuthStore = create((set, get) => ({
  user: getStoredUser(),
  accessToken: getStoredValue(STORAGE_KEYS.ACCESS_TOKEN),
  refreshToken: getStoredValue(STORAGE_KEYS.REFRESH_TOKEN),
  isLoading: false,
  isResolvingIpContext: false,

  setAuth: ({ user, accessToken, refreshToken }) => {
    const nextUser = applyIpContextFallback(user);
    saveAuthToStorage({ user: nextUser, accessToken, refreshToken });
    set({ user: nextUser, accessToken, refreshToken });
  },

  setUser: (user) => {
    const nextUser = applyIpContextFallback(user);
    saveAuthToStorage({
      user: nextUser,
      accessToken: get().accessToken,
      refreshToken: get().refreshToken,
    });
    set({ user: nextUser });
  },

  refreshClientIpContext: async () => {
    const currentUser = get().user;
    if (!currentUser || typeof window === 'undefined') return currentUser;
    if (get().isResolvingIpContext) return currentUser;

    set({ isResolvingIpContext: true });

    let nextUser = currentUser;
    try {
      const ipContext = await fetchClientIpContext();
      nextUser = ipContext
        ? { ...currentUser, ...ipContext, ipLocationLookupFailed: false }
        : applyIpContextFallback(currentUser);
    } catch {
      nextUser = { ...applyIpContextFallback(currentUser), ipLocationLookupFailed: true };
    }

    saveAuthToStorage({
      user: nextUser,
      accessToken: get().accessToken,
      refreshToken: get().refreshToken,
    });
    set({ user: nextUser, isResolvingIpContext: false });
    return nextUser;
  },

  ensureClientIpContext: async () => {
    const currentUser = get().user;
    if (!currentUser) return currentUser;

    const hasClientLocation =
      currentUser.ipLocationSource === 'client' &&
      !!currentUser.ipLocationLabel &&
      !isPrivateIpAddress(currentUser.ipAddress);

    if (hasClientLocation || currentUser.ipLocationLookupFailed) {
      return currentUser;
    }

    return get().refreshClientIpContext();
  },

  initializeAuth: async () => {
    const { accessToken, user, fetchMe, logout, ensureClientIpContext } = get();
    if (!accessToken) return null;

    // If user already exists in storage, UI can use it immediately.
    if (user) {
      fetchMe()
        .then((currentUser) => {
          if (currentUser) ensureClientIpContext().catch(() => {});
        })
        .catch(() => {});
      return user;
    }

    const currentUser = await fetchMe();
    if (!currentUser) await logout();
    else ensureClientIpContext().catch(() => {});
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
      const nextUser = preserveClientIpContext(data.user, get().user);
      saveAuthToStorage({
        user: nextUser,
        accessToken: get().accessToken,
        refreshToken: get().refreshToken,
      });
      set({ user: nextUser, isLoading: false });
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
