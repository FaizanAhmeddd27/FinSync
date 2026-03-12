import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(
          `${API_URL}/auth/refresh-token`,
          { refreshToken },
          { withCredentials: true }
        );

        if (data.success) {
          localStorage.setItem('accessToken', data.data.accessToken);
          localStorage.setItem('refreshToken', data.data.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// API endpoint helpers
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  verifyOTP: (data) => api.post('/auth/verify-otp', data),
  resendOTP: (data) => api.post('/auth/resend-otp', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  toggle2FA: () => api.patch('/auth/toggle-2fa'),
  refreshToken: () => api.post('/auth/refresh-token'),
};

export const dashboardAPI = {
  get: () => api.get('/dashboard'),
};

export const accountAPI = {
  getAll: () => api.get('/accounts'),
  getById: (id) => api.get(`/accounts/${id}`),
  create: (data) => api.post('/accounts', data),
  update: (id, data) => api.patch(`/accounts/${id}`, data),
  close: (id) => api.delete(`/accounts/${id}`),
  getBalanceHistory: (id, days = 30) =>
    api.get(`/accounts/${id}/balance-history?days=${days}`),
  getSuggestion: () => api.get('/accounts/suggestion'),
};

export const transferAPI = {
  verifyRecipient: (data) => api.post('/transfers/verify-recipient', data),
  initiate: (data) => api.post('/transfers/initiate', data),
  confirm: (data) => api.post('/transfers/confirm', data),
  cancel: (id) => api.patch(`/transfers/${id}/cancel`),
  getHistory: (params) => api.get('/transfers/history', { params }),
  schedule: (data) => api.post('/transfers/schedule', data),
};

export const transactionAPI = {
  getAll: (params) => api.get('/transactions', { params }),
  getById: (id) => api.get(`/transactions/${id}`),
  getStats: (period) => api.get(`/transactions/stats?period=${period}`),
  getRecent: (limit = 5) => api.get(`/transactions/recent?limit=${limit}`),
  exportCSV: (params) => api.get('/transactions/export/csv', { params, responseType: 'blob' }),
};

export const statementAPI = {
  getMonthly: (accountId, month) =>
    api.get(`/statements/${accountId}?month=${month}`),
  downloadPDF: (accountId, month) =>
    api.get(`/statements/${accountId}/download?month=${month}`, { responseType: 'blob' }),
  getMonths: (accountId) => api.get(`/statements/${accountId}/months`),
};

export const fraudAPI = {
  getAlerts: (params) => api.get('/fraud', { params }),
  getById: (id) => api.get(`/fraud/${id}`),
  clear: (id) => api.patch(`/fraud/${id}/clear`),
  block: (id) => api.patch(`/fraud/${id}/block`),
};

export const notificationAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  getStats: () => api.get('/notifications/stats'),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/mark-all-read'),
  delete: (id) => api.delete(`/notifications/${id}`),
  clearRead: () => api.delete('/notifications/clear-read'),
};

export const budgetAPI = {
  getCategories: () => api.get('/budget/categories'),
  createCategory: (data) => api.post('/budget/categories', data),
  updateCategory: (id, data) => api.patch(`/budget/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/budget/categories/${id}`),
  getOverview: (month) => api.get(`/budget/overview?month=${month || ''}`),
  getInsights: () => api.get('/budget/insights'),
};

export const investmentAPI = {
  getAll: () => api.get('/investments'),
  getById: (id) => api.get(`/investments/${id}`),
  add: (data) => api.post('/investments', data),
  update: (id, data) => api.patch(`/investments/${id}`, data),
  delete: (id) => api.delete(`/investments/${id}`),
  getPerformance: () => api.get('/investments/performance'),
};

export const chatbotAPI = {
  sendMessage: (data) => api.post('/chatbot/message', data),
  getSessions: () => api.get('/chatbot/sessions'),
  getSession: (id) => api.get(`/chatbot/sessions/${id}`),
  deleteSession: (id) => api.delete(`/chatbot/sessions/${id}`),
  getSuggestions: () => api.get('/chatbot/suggestions'),
};

export const currencyAPI = {
  getRates: (base) => api.get(`/currency/rates?base=${base || 'USD'}`),
  convert: (amount, from, to) =>
    api.get(`/currency/convert?amount=${amount}&from=${from}&to=${to}`),
  getSupported: () => api.get('/currency/supported'),
};

export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getAnalytics: (period) => api.get(`/admin/analytics?period=${period || 30}`),
  getHealth: () => api.get('/admin/health'),
  getUsers: (params) => api.get('/admin/users', { params }),
  getUserDetail: (id) => api.get(`/admin/users/${id}`),
  updateUser: (id, data) => api.patch(`/admin/users/${id}`, data),
  manageAccount: (id, data) => api.patch(`/admin/accounts/${id}/manage`, data),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
};