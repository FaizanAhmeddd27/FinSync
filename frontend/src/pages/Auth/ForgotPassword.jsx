import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Landmark, ArrowLeft, ArrowRight,
  AlertCircle, CheckCircle2, KeyRound,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ThemeToggle from '@/components/common/ThemeToggle';
import { GlowingOrb } from '@/components/animations/FloatingElements';
import { authAPI } from '@/lib/api';

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [userId, setUserId] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const { data } = await authAPI.forgotPassword({ email: email.trim().toLowerCase() });
      if (data.success) {
        setSent(true);
        if (data.data?.userId) setUserId(data.data.userId);
      }
    } catch (err) {
      // Backend always returns success for security, but handle network errors
      setSent(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative">
      <GlowingOrb color="#1c9cf0" size={400} className="top-20 right-20" />
      <GlowingOrb color="#00b87a" size={300} className="bottom-20 left-20" />

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
            {!sent ? (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="text-center mb-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring' }}
                    className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4"
                  >
                    <KeyRound className="h-7 w-7 text-primary" />
                  </motion.div>
                  <h2 className="text-2xl font-bold">Forgot Password?</h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    Enter your email address and we'll send you a code to reset your password.
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

                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="you@example.com"
                    icon={Mail}
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    required
                  />

                  <Button type="submit" variant="glow" size="lg" className="w-full" isLoading={isLoading}>
                    Send Reset Code
                  </Button>
                </form>
              </motion.div>
            ) : (
              <motion.div key="sent" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className="mx-auto h-14 w-14 rounded-full bg-success/10 flex items-center justify-center mb-4"
                  >
                    <CheckCircle2 className="h-7 w-7 text-success" />
                  </motion.div>
                  <h2 className="text-2xl font-bold mb-2">Check Your Email</h2>
                  <p className="text-sm text-muted-foreground mb-1">
                    If an account exists with <span className="text-foreground font-medium">{email}</span>,
                    we've sent a password reset code.
                  </p>
                  <p className="text-xs text-muted-foreground mb-6">
                    Check spam folder if you don't see it.
                  </p>

                  <Button
                    variant="glow"
                    size="lg"
                    className="w-full"
                    onClick={() =>
                      navigate('/reset-password', { state: { email, userId } })
                    }
                  >
                    Enter Reset Code
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
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