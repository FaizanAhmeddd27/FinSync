import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import useAuthStore from '@/stores/authStore';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ChatWidget from '@/components/chatbot/ChatWidget';
import OAuthCallback from '@/pages/OAuthCallback';

// Public Pages
const Landing = lazy(() => import('@/pages/Landing'));
const Login = lazy(() => import('@/pages/Auth/Login'));
const Register = lazy(() => import('@/pages/Auth/Register'));
const ForgotPassword = lazy(() => import('@/pages/Auth/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/Auth/ResetPassword'));

// Protected User Pages
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Accounts = lazy(() => import('@/pages/Accounts'));
const Transfers = lazy(() => import('@/pages/Transfers'));
const Transactions = lazy(() => import('@/pages/Transactions'));
const Statements = lazy(() => import('@/pages/Statements'));
const Budget = lazy(() => import('@/pages/Budget'));
const Investments = lazy(() => import('@/pages/Investments'));
const FraudAlerts = lazy(() => import('@/pages/Fraud'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const ChatbotPage = lazy(() => import('@/pages/Chatbot'));
const Settings = lazy(() => import('@/pages/Settings'));

// Protected Admin Pages
const AdminDashboard = lazy(() => import('@/pages/Admin/Dashboard'));
const UserManagement = lazy(() => import('@/pages/Admin/Users'));
const SystemHealth = lazy(() => import('@/pages/Admin/SystemHealth'));

function App() {
  const { initialize, isAuthenticated } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/callback" element={<OAuthCallback />} />

        {/* Protected Dashboard Routes */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
              {/* Chat Widget available on all dashboard pages */}
              <ChatWidget />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/transfers" element={<Transfers />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/statements" element={<Statements />} />
          <Route path="/budget" element={<Budget />} />
          <Route path="/investments" element={<Investments />} />
          <Route path="/fraud-alerts" element={<FraudAlerts />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/chatbot" element={<ChatbotPage />} />
          <Route path="/settings" element={<Settings />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute requireAdmin><UserManagement /></ProtectedRoute>} />
          <Route path="/admin/health" element={<ProtectedRoute requireAdmin><SystemHealth /></ProtectedRoute>} />
        </Route>

        {/* 404 Route */}
        <Route
          path="*"
          element={
            <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
              <h1 className="text-9xl font-bold text-primary/20">404</h1>
              <h2 className="text-2xl font-bold mt-4">Page Not Found</h2>
              <p className="text-muted-foreground mt-2 mb-8">The page you are looking for doesn't exist or has been moved.</p>
              <a href="/" className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
                Return Home
              </a>
            </div>
          }
        />
      </Routes>
    </Suspense>
  );
}

export default App;