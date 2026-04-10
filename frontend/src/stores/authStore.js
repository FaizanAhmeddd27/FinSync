import { create } from 'zustand';
import { authAPI } from '@/lib/api';

let _initializePromise = null;

const useAuthStore = create((set, get) => ({
  user: null,
  accounts: [],
  isAuthenticated: false,
  isLoading: true,
  unreadNotifications: 0,

  initialize: async () => {
    if (_initializePromise) return _initializePromise;

    _initializePromise = (async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const oauthToken = urlParams.get('accessToken');
        const oauthRefresh = urlParams.get('refreshToken');

        if (oauthToken && oauthRefresh) {
          localStorage.setItem('accessToken', oauthToken);
          localStorage.setItem('refreshToken', oauthRefresh);
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        const token = localStorage.getItem('accessToken');
        if (!token) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }
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
    })();

    try {
      await _initializePromise;
    } finally {
      _initializePromise = null;
    }
  },

  login: async (credentials) => {
    const { data } = await authAPI.login(credentials);

    if (data.success && data.data?.tokens) {
      localStorage.setItem('accessToken', data.data.tokens.accessToken);
      localStorage.setItem('refreshToken', data.data.tokens.refreshToken);
      set({
        user: data.data.user,
        isAuthenticated: true,
      });
      return { success: true };
    }

    if (data.success && data.data?.requiresOTP) {
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
  
  updateProfile: async (formData) => {
    const { data } = await authAPI.updateProfile(formData);
    if (data.success) {
      set({ user: data.data.user });
    }
    return data;
  },

  setAccounts: (accounts) => set({ accounts }),
  setUnreadNotifications: (count) => set({ unreadNotifications: count }),
}));

export default useAuthStore;