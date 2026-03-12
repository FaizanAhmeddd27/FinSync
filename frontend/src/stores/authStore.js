import { create } from 'zustand';
import { authAPI } from '@/lib/api';

const useAuthStore = create((set, get) => ({
  user: null,
  accounts: [],
  isAuthenticated: false,
  isLoading: true,
  unreadNotifications: 0,

  initialize: async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }
    try {
      const { data } = await authAPI.getMe();
      if (data.success) {
        set({
          user: data.data.user,
          accounts: data.data.accounts || [],
          isAuthenticated: true,
          unreadNotifications: data.data.unreadNotifications || 0,
          isLoading: false,
        });
      }
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      set({ isLoading: false, isAuthenticated: false, user: null });
    }
  },

  login: async (credentials) => {
    const { data } = await authAPI.login(credentials);

    if (data.success && data.data?.tokens) {
      // Direct login — tokens available
      localStorage.setItem('accessToken', data.data.tokens.accessToken);
      localStorage.setItem('refreshToken', data.data.tokens.refreshToken);
      set({
        user: data.data.user,
        isAuthenticated: true,
      });
      return { success: true };
    }

    if (data.success && data.data?.requiresOTP) {
      // OTP required
      return {
        success: true,
        requiresOTP: true,
        data: data.data,
      };
    }

    return data;
  },

  register: async (userData) => {
    const { data } = await authAPI.register(userData);
    return data;
  },

  verifyOTP: async (otpData) => {
    const { data } = await authAPI.verifyOTP(otpData);
    if (data.success && data.data?.tokens) {
      localStorage.setItem('accessToken', data.data.tokens.accessToken);
      localStorage.setItem('refreshToken', data.data.tokens.refreshToken);
      set({
        user: data.data.user,
        isAuthenticated: true,
      });
    }
    return data;
  },

  logout: async () => {
    try {
      await authAPI.logout();
    } catch { /* ignore */ }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({
      user: null,
      isAuthenticated: false,
      accounts: [],
      unreadNotifications: 0,
    });
  },

  setUser: (user) => set({ user }),
  setAccounts: (accounts) => set({ accounts }),
  setUnreadNotifications: (count) => set({ unreadNotifications: count }),
}));

export default useAuthStore;