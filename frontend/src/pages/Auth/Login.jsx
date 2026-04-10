import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Lock, Landmark, ArrowRight, Github,
  AlertCircle, CheckCircle2, Loader2,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import OTPInput from '@/components/ui/OTPInput';
import ThemeToggle from '@/components/common/ThemeToggle';
import { FlickeringGrid } from '@/components/animations/FlickeringGrid';
import { GlowingOrb } from '@/components/animations/FloatingElements';
import FadeInView from '@/components/animations/FadeInView';
import { useTheme } from '@/context/ThemeContext';
import useAuthStore from '@/stores/authStore';
import { authAPI } from '@/lib/api';
import { toast } from 'sonner';
import StackedFinanceCards from '@/components/ui/StackedFinanceCards';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Google SVG Icon
function GoogleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const { login, verifyOTP } = useAuthStore();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // OTP state
  const [showOTP, setShowOTP] = useState(false);
  const [otpType, setOtpType] = useState('');
  const [userId, setUserId] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Success state
  const [showSuccess, setShowSuccess] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  // Handle Login Submit
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login({ email: email.trim().toLowerCase(), password });

      if (result.requiresOTP) {
        setUserId(result.data?.userId || result.userId);
        setOtpType(result.data?.otpType || result.otpType);
        setShowOTP(true);
        startResendCooldown();
        toast.info('Verification code sent to your email.');
      } else if (result.success) {
        setShowSuccess(true);
        toast.success('Login successful! Welcome back.');
        setTimeout(() => navigate(from, { replace: true }), 1200);
      }
    } catch (err) {
      const msg =
        err.response?.data?.message || 'Login failed. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP Verification
  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setOtpError('Please enter all 6 digits');
      return;
    }

    setOtpError('');
    setOtpLoading(true);

    try {
      const result = await verifyOTP({
        userId,
        otp,
        type: otpType,
      });

      if (result.success) {
        setShowSuccess(true);
        toast.success('Verified! Redirecting to dashboard...');
        setTimeout(() => navigate(from, { replace: true }), 1200);
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Invalid OTP';
      setOtpError(errMsg);
      toast.error(errMsg);
    } finally {
      setOtpLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    setResendLoading(true);
    try {
      await authAPI.resendOTP({ userId, type: otpType });
      startResendCooldown();
      toast.success('OTP resent successfully!');
    } catch (err) {
      setOtpError('Failed to resend OTP');
      toast.error('Failed to resend OTP.');
    } finally {
      setResendLoading(false);
    }
  };

  const startResendCooldown = () => {
    setResendCooldown(60);
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // OAuth handlers
  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/auth/google`;
  };

  const handleGithubLogin = () => {
    window.location.href = `${API_URL}/auth/github`;
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Left Side — Branding (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center bg-card">
        {/* Background Grid */}
        <div className="absolute inset-0">
          <FlickeringGrid
            color={theme === 'dark' ? 'rgb(28, 156, 240)' : 'rgb(30, 157, 241)'}
            maxOpacity={theme === 'dark' ? 0.15 : 0.08}
            flickerChance={0.08}
            squareSize={4}
            gridGap={6}
            className="[mask-image:radial-gradient(600px_circle_at_center,white,transparent)]"
          />
        </div>

        <GlowingOrb color="#1c9cf0" size={400} className="top-20 left-20" />
        <GlowingOrb color="#00b87a" size={300} className="bottom-20 right-20" />

        <div className="relative z-10 text-center max-w-md px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="mx-auto h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 animate-pulse-glow">
              <Landmark className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-4xl font-bold">
              <span className="text-primary">Fin</span>Sync
            </h1>
            <p className="text-muted-foreground mt-2">Advanced Digital Banking</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full"
          >
            <StackedFinanceCards />
          </motion.div>
        </div>
      </div>

      {/* Right Side — Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-12 relative">
        <GlowingOrb
          color="#1c9cf0"
          size={300}
          className="top-10 right-10 lg:hidden"
        />

        {/* Theme Toggle */}
        <div className="absolute top-4 right-4 z-20">
          <ThemeToggle />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md relative z-10"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Landmark className="h-5 w-5 text-primary" />
              </div>
              <span className="text-2xl font-bold">
                <span className="text-primary">Fin</span>Sync
              </span>
            </Link>
          </div>

          <AnimatePresence mode="wait">
            {/* =================== SUCCESS STATE =================== */}
            {showSuccess && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-12"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="mx-auto h-20 w-20 rounded-full bg-success/10 flex items-center justify-center mb-6"
                >
                  <CheckCircle2 className="h-10 w-10 text-success" />
                </motion.div>
                <h2 className="text-2xl font-bold mb-2">Welcome Back!</h2>
                <p className="text-muted-foreground">Redirecting to dashboard...</p>
                <Loader2 className="h-5 w-5 text-primary animate-spin mx-auto mt-4" />
              </motion.div>
            )}

            {/* =================== OTP STATE =================== */}
            {!showSuccess && showOTP && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring' }}
                    className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4"
                  >
                    <Mail className="h-8 w-8 text-primary" />
                  </motion.div>
                  <h2 className="text-2xl font-bold">Verify Your Identity</h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    {otpType === 'email_verification'
                      ? 'Enter the 6-digit code sent to your email to verify your account.'
                      : 'Enter the 6-digit code sent to your email for two-factor authentication.'}
                  </p>
                  <p className="text-xs text-primary mt-1">{email}</p>
                </div>

                <OTPInput
                  length={6}
                  value={otp}
                  onChange={setOtp}
                  error={otpError}
                  disabled={otpLoading}
                />

                <Button
                  onClick={handleVerifyOTP}
                  isLoading={otpLoading}
                  className="w-full"
                  variant="glow"
                  size="lg"
                  disabled={otp.length !== 6}
                >
                  Verify & Sign In
                </Button>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Didn't receive the code?{' '}
                    {resendCooldown > 0 ? (
                      <span className="text-primary">
                        Resend in {resendCooldown}s
                      </span>
                    ) : (
                      <button
                        onClick={handleResendOTP}
                        disabled={resendLoading}
                        className="text-primary hover:underline font-medium cursor-pointer"
                      >
                        {resendLoading ? 'Sending...' : 'Resend OTP'}
                      </button>
                    )}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setShowOTP(false);
                    setOtp('');
                    setOtpError('');
                  }}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  ← Back to login
                </button>
              </motion.div>
            )}

            {/* =================== LOGIN FORM =================== */}
            {!showSuccess && !showOTP && (
              <motion.div
                key="login"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: -30 }}
              >
                <div className="text-center lg:text-left mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold">Welcome back</h2>
                  <p className="text-muted-foreground mt-1">
                    Sign in to your FinSync account
                  </p>
                </div>

                {/* Error Alert */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2"
                    >
                      <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                      <p className="text-sm text-destructive">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* OAuth Buttons */}
                <div className="space-y-3 mb-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 gap-3"
                    onClick={handleGoogleLogin}
                  >
                    <GoogleIcon className="h-5 w-5" />
                    Continue with Google
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 gap-3"
                    onClick={handleGithubLogin}
                  >
                    <Github className="h-5 w-5" />
                    Continue with GitHub
                  </Button>
                </div>

                {/* Divider */}
                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-background px-4 text-xs text-muted-foreground uppercase tracking-wider">
                      or sign in with email
                    </span>
                  </div>
                </div>

                {/* Login Form */}
                <form onSubmit={handleLogin} className="space-y-4">
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="you@example.com"
                    icon={Mail}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />

                  <Input
                    label="Password"
                    type="password"
                    placeholder="••••••••"
                    icon={Lock}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-muted-foreground">Remember me</span>
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <Button
                    type="submit"
                    variant="glow"
                    size="lg"
                    className="w-full group"
                    isLoading={isLoading}
                  >
                    Sign In
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </form>

                {/* Register Link */}
                <p className="text-center text-sm text-muted-foreground mt-6">
                  Don't have an account?{' '}
                  <Link
                    to="/register"
                    className="text-primary font-medium hover:underline"
                  >
                    Create one free
                  </Link>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}