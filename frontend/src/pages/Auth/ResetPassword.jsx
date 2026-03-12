import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock, Landmark, ArrowLeft,
  AlertCircle, CheckCircle2, Loader2, Shield,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import OTPInput from '@/components/ui/OTPInput';
import ThemeToggle from '@/components/common/ThemeToggle';
import { GlowingOrb } from '@/components/animations/FloatingElements';
import { authAPI } from '@/lib/api';

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const passedEmail = location.state?.email || '';
  const passedUserId = location.state?.userId || '';

  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const getPasswordStrength = (pw) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^a-zA-Z\d]/.test(pw)) score++;
    return score;
  };

  const pwStrength = getPasswordStrength(newPassword);
  const strengthColors = ['', '#f4212e', '#f7b928', '#f7b928', '#00b87a', '#00b87a'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const errors = {};
    if (otp.length !== 6) errors.otp = 'Please enter the 6-digit code';
    if (!newPassword) errors.newPassword = 'Password is required';
    if (newPassword.length < 8) errors.newPassword = 'Minimum 8 characters';
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword))
      errors.newPassword = 'Must include uppercase, lowercase, and a number';
    if (newPassword !== confirmPassword) errors.confirmPassword = 'Passwords do not match';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsLoading(true);

    try {
      const { data } = await authAPI.resetPassword({
        userId: passedUserId,
        otp,
        newPassword,
      });

      if (data.success) {
        setShowSuccess(true);
        setTimeout(() => navigate('/login', { replace: true }), 2500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative">
      <GlowingOrb color="#1c9cf0" size={400} className="top-20 left-20" />
      <GlowingOrb color="#00b87a" size={300} className="bottom-20 right-20" />
      <div className="absolute top-4 right-4 z-20"><ThemeToggle /></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Landmark className="h-5 w-5 text-primary" />
            </div>
            <span className="text-2xl font-bold">
              <span className="text-primary">Fin</span>Sync
            </span>
          </Link>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8">
          <AnimatePresence mode="wait">
            {showSuccess ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="mx-auto h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mb-4"
                >
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </motion.div>
                <h2 className="text-2xl font-bold mb-2">Password Reset!</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Your password has been changed successfully.
                  Redirecting to login...
                </p>
                <Loader2 className="h-5 w-5 text-primary animate-spin mx-auto" />
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="text-center mb-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring' }}
                    className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4"
                  >
                    <Shield className="h-7 w-7 text-primary" />
                  </motion.div>
                  <h2 className="text-2xl font-bold">Reset Password</h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    Enter the code sent to{' '}
                    <span className="text-primary">{passedEmail || 'your email'}</span>{' '}
                    and your new password.
                  </p>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2"
                    >
                      <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                      <p className="text-sm text-destructive">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* OTP */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground/80">Verification Code</label>
                    <OTPInput
                      length={6}
                      value={otp}
                      onChange={(val) => { setOtp(val); setFieldErrors((p) => ({ ...p, otp: '' })); }}
                      error={fieldErrors.otp}
                    />
                  </div>

                  {/* New Password */}
                  <Input
                    label="New Password"
                    type="password"
                    placeholder="At least 8 characters"
                    icon={Lock}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setFieldErrors((p) => ({ ...p, newPassword: '' }));
                    }}
                    error={fieldErrors.newPassword}
                    required
                  />

                  {/* Password Strength */}
                  {newPassword && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className="h-1.5 flex-1 rounded-full transition-all duration-300"
                            style={{
                              backgroundColor:
                                i <= pwStrength ? strengthColors[pwStrength] : 'var(--border)',
                            }}
                          />
                        ))}
                      </div>
                      <p className="text-xs" style={{ color: strengthColors[pwStrength] }}>
                        {strengthLabels[pwStrength]}
                      </p>
                    </motion.div>
                  )}

                  {/* Confirm Password */}
                  <Input
                    label="Confirm New Password"
                    type="password"
                    placeholder="Re-enter password"
                    icon={Lock}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setFieldErrors((p) => ({ ...p, confirmPassword: '' }));
                    }}
                    error={fieldErrors.confirmPassword}
                    required
                  />

                  <Button
                    type="submit"
                    variant="glow"
                    size="lg"
                    className="w-full"
                    isLoading={isLoading}
                  >
                    Reset Password
                  </Button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}