import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Lock, User, Phone, Calendar, Globe,
  Landmark, ArrowRight, ArrowLeft, Github,
  AlertCircle, CheckCircle2, Loader2, Shield,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import OTPInput from '@/components/ui/OTPInput';
import ThemeToggle from '@/components/common/ThemeToggle';
import { FlickeringGrid } from '@/components/animations/FlickeringGrid';
import { GlowingOrb } from '@/components/animations/FloatingElements';
import { useTheme } from '@/context/ThemeContext';
import useAuthStore from '@/stores/authStore';
import { authAPI } from '@/lib/api';
import { toast } from 'sonner';
import StackedFinanceCards from '@/components/ui/StackedFinanceCards';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
  { code: 'INR', name: 'Indian Rupee', flag: '🇮🇳' },
  { code: 'PKR', name: 'Pakistani Rupee', flag: '🇵🇰' },
  { code: 'AED', name: 'UAE Dirham', flag: '🇦🇪' },
  { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺' },
];

// Google SVG Icon
function GoogleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

// Progress Step Component
function ProgressBar({ currentStep, totalSteps }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div key={i} className="flex items-center flex-1">
          <motion.div
            className={`h-2 flex-1 rounded-full transition-colors duration-500 ${
              i < currentStep
                ? 'bg-primary'
                : i === currentStep
                ? 'bg-primary/50'
                : 'bg-border'
            }`}
            initial={false}
            animate={{
              scaleX: i <= currentStep ? 1 : 0.7,
              opacity: i <= currentStep ? 1 : 0.4,
            }}
            transition={{ duration: 0.3 }}
          />
        </div>
      ))}
    </div>
  );
}

// Step labels
const stepLabels = ['Personal Info', 'Security', 'Preferences', 'Verify Email'];

export default function Register() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { register, verifyOTP } = useAuthStore();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Form data
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    dob: '',
    preferred_currency: 'USD',
    language: 'en',
  });

  // State
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    setError('');
  };

  // Validate current step
  const validateStep = () => {
    const errors = {};

    if (step === 0) {
      if (!form.name.trim()) errors.name = 'Name is required';
      if (form.name.trim().length < 2) errors.name = 'Name must be at least 2 characters';
      if (!form.email.trim()) errors.email = 'Email is required';
      if (!/\S+@\S+\.\S+/.test(form.email)) errors.email = 'Enter a valid email';
      if (form.phone && !/^\+?[\d\s-]{7,15}$/.test(form.phone))
        errors.phone = 'Enter a valid phone number';
    }

    if (step === 1) {
      if (!form.password) errors.password = 'Password is required';
      if (form.password.length < 8) errors.password = 'Password must be at least 8 characters';
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password))
        errors.password = 'Must include uppercase, lowercase, and a number';
      if (form.password !== form.confirmPassword)
        errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Go to next step
  const nextStep = () => {
    if (!validateStep()) return;
    setDirection(1);
    setStep((prev) => Math.min(prev + 1, 3));
  };

  // Go to previous step
  const prevStep = () => {
    setDirection(-1);
    setStep((prev) => Math.max(prev - 1, 0));
  };

  // Submit registration (step 2 → 3)
  const handleRegister = async () => {
    if (!validateStep()) return;
    setIsLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('name', form.name.trim());
      formData.append('email', form.email.trim().toLowerCase());
      formData.append('password', form.password);
      if (form.phone) formData.append('phone', form.phone);
      if (form.dob) formData.append('dob', form.dob);
      formData.append('preferred_currency', form.preferred_currency);
      formData.append('language', form.language);
      
      if (form.avatar) {
        formData.append('avatar', form.avatar);
      }

      const result = await register(formData);

      if (result.success) {
        setUserId(result.data?.userId || result.userId);
        setDirection(1);
        setStep(3);
        startResendCooldown();
        toast.success('Account created! Please verify your email.');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Registration failed';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Verify Email OTP
  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setOtpError('Please enter all 6 digits');
      return;
    }
    setOtpLoading(true);
    setOtpError('');

    try {
      const result = await verifyOTP({
        userId,
        otp,
        type: 'email_verification',
      });

      if (result.success) {
        setShowSuccess(true);
        toast.success('Email verified! Setting up your dashboard...');
        setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Invalid OTP';
      setOtpError(errMsg);
      toast.error(errMsg);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    try {
      await authAPI.resendOTP({ userId, type: 'email_verification' });
      startResendCooldown();
      toast.success('OTP resent successfully!');
    } catch {
      setOtpError('Failed to resend');
      toast.error('Failed to resend OTP.');
    }
  };

  const startResendCooldown = () => {
    setResendCooldown(60);
    const t = setInterval(() => {
      setResendCooldown((p) => {
        if (p <= 1) { clearInterval(t); return 0; }
        return p - 1;
      });
    }, 1000);
  };

  const handleGoogleRegister = () => {
    window.location.href = `${API_URL}/auth/google`;
  };

  const handleGithubRegister = () => {
    window.location.href = `${API_URL}/auth/github`;
  };

  // Password strength indicator
  const getPasswordStrength = (pw) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^a-zA-Z\d]/.test(pw)) score++;
    return score;
  };

  const pwStrength = getPasswordStrength(form.password);
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
  const strengthColors = ['', '#f4212e', '#f7b928', '#f7b928', '#00b87a', '#00b87a'];

  // Slide variants
  const slideVariants = {
    enter: (d) => ({ x: d > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d) => ({ x: d > 0 ? -80 : 80, opacity: 0 }),
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Left Side — Branding (desktop) */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center bg-card">
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
          >
            <div className="mx-auto h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 animate-pulse-glow">
              <Landmark className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-4xl font-bold">
              <span className="text-primary">Fin</span>Sync
            </h1>
            <p className="text-muted-foreground mt-2">
              Join the future of digital banking
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-10"
          >
            <StackedFinanceCards />
          </motion.div>
        </div>
      </div>

      {/* Right Side — Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-12 relative">
        <GlowingOrb color="#1c9cf0" size={300} className="top-10 right-10 lg:hidden" />
        <div className="absolute top-4 right-4 z-20"><ThemeToggle /></div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md relative z-10"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-6">
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
            {/* =================== SUCCESS =================== */}
            {showSuccess && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
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
                <h2 className="text-2xl font-bold mb-2">Account Created! 🎉</h2>
                <p className="text-muted-foreground">Setting up your dashboard...</p>
                <Loader2 className="h-5 w-5 text-primary animate-spin mx-auto mt-4" />
              </motion.div>
            )}

            {/* =================== FORM STEPS =================== */}
            {!showSuccess && (
              <motion.div key="form">
                <div className="text-center lg:text-left mb-2">
                  <h2 className="text-2xl sm:text-3xl font-bold">Create your account</h2>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Step {step + 1} of {stepLabels.length} — {stepLabels[step]}
                  </p>
                </div>

                <ProgressBar currentStep={step} totalSteps={4} />

                {/* Error */}
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

                <AnimatePresence mode="wait" custom={direction}>
                  {/* ========== STEP 0: Personal Info ========== */}
                  {step === 0 && (
                    <motion.div
                      key="step0"
                      custom={direction}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      {/* OAuth */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <Button type="button" variant="outline" className="h-11 gap-2 text-xs" onClick={handleGoogleRegister}>
                          <GoogleIcon className="h-4 w-4" /> Google
                        </Button>
                        <Button type="button" variant="outline" className="h-11 gap-2 text-xs" onClick={handleGithubRegister}>
                          <Github className="h-4 w-4" /> GitHub
                        </Button>
                      </div>

                      <div className="relative mb-2">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center">
                          <span className="bg-background px-3 text-xs text-muted-foreground">or register with email</span>
                        </div>
                      </div>

                      {/* Avatar Upload */}
                      <div className="flex flex-col items-center gap-3 mb-6">
                        <div className="relative group">
                          <div className="h-24 w-24 rounded-full border-2 border-dashed border-primary/30 flex items-center justify-center overflow-hidden bg-muted relative">
                            {form.avatarPreview ? (
                              <img src={form.avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                            ) : (
                              <User className="h-10 w-10 text-muted-foreground" />
                            )}
                            <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                              <span className="text-white text-[10px] font-medium">Upload Image</span>
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    updateForm('avatar', file);
                                    updateForm('avatarPreview', URL.createObjectURL(file));
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">Click to upload your profile picture</p>
                      </div>

                      <Input
                        label="Full Name"
                        type="text"
                        placeholder="John Doe"
                        icon={User}
                        value={form.name}
                        onChange={(e) => updateForm('name', e.target.value)}
                        error={fieldErrors.name}
                        required
                      />
                      <Input
                        label="Email Address"
                        type="email"
                        placeholder="you@example.com"
                        icon={Mail}
                        value={form.email}
                        onChange={(e) => updateForm('email', e.target.value)}
                        error={fieldErrors.email}
                        required
                      />
                      <Input
                        label="Phone Number (optional)"
                        type="tel"
                        placeholder="+1 234 567 8900"
                        icon={Phone}
                        value={form.phone}
                        onChange={(e) => updateForm('phone', e.target.value)}
                        error={fieldErrors.phone}
                      />

                      <Button
                        type="button"
                        variant="glow"
                        size="lg"
                        className="w-full group"
                        onClick={nextStep}
                      >
                        Continue
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </motion.div>
                  )}

                  {/* ========== STEP 1: Security ========== */}
                  {step === 1 && (
                    <motion.div
                      key="step1"
                      custom={direction}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      <Input
                        label="Password"
                        type="password"
                        placeholder="At least 8 characters"
                        icon={Lock}
                        value={form.password}
                        onChange={(e) => updateForm('password', e.target.value)}
                        error={fieldErrors.password}
                        required
                      />

                      {/* Password Strength */}
                      {form.password && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="space-y-1"
                        >
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div
                                key={i}
                                className="h-1.5 flex-1 rounded-full transition-all duration-300"
                                style={{
                                  backgroundColor:
                                    i <= pwStrength
                                      ? strengthColors[pwStrength]
                                      : 'var(--border)',
                                }}
                              />
                            ))}
                          </div>
                          <p className="text-xs" style={{ color: strengthColors[pwStrength] }}>
                            {strengthLabels[pwStrength]}
                          </p>
                        </motion.div>
                      )}

                      <Input
                        label="Confirm Password"
                        type="password"
                        placeholder="Re-enter your password"
                        icon={Lock}
                        value={form.confirmPassword}
                        onChange={(e) => updateForm('confirmPassword', e.target.value)}
                        error={fieldErrors.confirmPassword}
                        required
                      />

                      <Input
                        label="Date of Birth (optional)"
                        type="date"
                        icon={Calendar}
                        value={form.dob}
                        onChange={(e) => updateForm('dob', e.target.value)}
                      />

                      <div className="flex gap-3">
                        <Button type="button" variant="outline" size="lg" onClick={prevStep} className="gap-2">
                          <ArrowLeft className="h-4 w-4" />
                          Back
                        </Button>
                        <Button type="button" variant="glow" size="lg" className="flex-1 group" onClick={nextStep}>
                          Continue
                          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* ========== STEP 2: Preferences ========== */}
                  {step === 2 && (
                    <motion.div
                      key="step2"
                      custom={direction}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.3 }}
                      className="space-y-5"
                    >
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground/80">
                          Preferred Currency
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {CURRENCIES.map((c) => (
                            <button
                              key={c.code}
                              type="button"
                              onClick={() => updateForm('preferred_currency', c.code)}
                              className={`flex items-center gap-2 p-3 rounded-lg border text-sm transition-all cursor-pointer ${
                                form.preferred_currency === c.code
                                  ? 'border-primary bg-primary/5 text-foreground'
                                  : 'border-border hover:border-primary/30 text-muted-foreground'
                              }`}
                            >
                              <span className="text-lg">{c.flag}</span>
                              <span className="font-medium">{c.code}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground/80">Language</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { code: 'en', name: 'English', flag: '🇺🇸' },
                            { code: 'ur', name: 'اردو', flag: '🇵🇰' },
                          ].map((l) => (
                            <button
                              key={l.code}
                              type="button"
                              onClick={() => updateForm('language', l.code)}
                              className={`flex items-center gap-2 p-3 rounded-lg border text-sm transition-all cursor-pointer ${
                                form.language === l.code
                                  ? 'border-primary bg-primary/5 text-foreground'
                                  : 'border-border hover:border-primary/30 text-muted-foreground'
                              }`}
                            >
                              <span className="text-lg">{l.flag}</span>
                              <span>{l.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Terms */}
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary mt-0.5"
                          required
                        />
                        <span className="text-xs text-muted-foreground leading-relaxed">
                          I agree to the{' '}
                          <a href="#" className="text-primary hover:underline">Terms of Service</a>{' '}
                          and{' '}
                          <a href="#" className="text-primary hover:underline">Privacy Policy</a>
                        </span>
                      </label>

                      <div className="flex gap-3">
                        <Button type="button" variant="outline" size="lg" onClick={prevStep} className="gap-2">
                          <ArrowLeft className="h-4 w-4" /> Back
                        </Button>
                        <Button
                          type="button"
                          variant="glow"
                          size="lg"
                          className="flex-1 group"
                          isLoading={isLoading}
                          onClick={handleRegister}
                        >
                          Create Account
                          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* ========== STEP 3: OTP Verification ========== */}
                  {step === 3 && (
                    <motion.div
                      key="step3"
                      custom={direction}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.3 }}
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
                        <h3 className="text-xl font-bold">Verify Your Email</h3>
                        <p className="text-sm text-muted-foreground mt-2">
                          We've sent a 6-digit code to
                        </p>
                        <p className="text-sm text-primary font-medium">{form.email}</p>
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
                        Verify & Continue
                      </Button>

                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">
                          Didn't receive code?{' '}
                          {resendCooldown > 0 ? (
                            <span className="text-primary">Resend in {resendCooldown}s</span>
                          ) : (
                            <button
                              onClick={handleResendOTP}
                              className="text-primary hover:underline font-medium cursor-pointer"
                            >
                              Resend OTP
                            </button>
                          )}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Login Link */}
                {step < 3 && (
                  <p className="text-center text-sm text-muted-foreground mt-6">
                    Already have an account?{' '}
                    <Link to="/login" className="text-primary font-medium hover:underline">
                      Sign in
                    </Link>
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}