// 845d4446-05c2-4a99-9b62-2243728afbd2
// sk_178cc27c00faa5f328e21effe1ab3c28f199ac09cbd8dfee
// sk_ff326e555c6ae27148019861385aaa236161ce922fac0337



import { Router } from 'express';
import passport from 'passport';
import {
  register,
  login,
  verifyOTP,
  resendOTP,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout,
  getCurrentUser,
  toggle2FA,
  updateProfile,
  googleCallback,
  githubCallback,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { authLimiter, otpLimiter } from '../middleware/rateLimiter';
import { upload } from '../utils/upload';
import {
  registerSchema,
  loginSchema,
  verifyOTPSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resendOTPSchema,
  updateProfileSchema,
} from '../middleware/validators/auth.validator';

const router = Router();

router.post('/register', authLimiter, upload.single('avatar'), validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/verify-otp', otpLimiter, validate(verifyOTPSchema), verifyOTP);
router.post('/resend-otp', otpLimiter, validate(resendOTPSchema), resendOTP);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), resetPassword);
router.post('/refresh-token', refreshToken);
router.post('/logout', authenticate, logout);

router.get('/me', authenticate, getCurrentUser);
router.patch('/profile', authenticate, upload.single('avatar'), validate(updateProfileSchema), updateProfile);
router.patch('/toggle-2fa', authenticate, toggle2FA);

router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=google_auth_failed`,
    session: false,
  }),
  googleCallback
);

router.get(
  '/github',
  passport.authenticate('github', {
    scope: ['user:email'],
  })
);

router.get(
  '/github/callback',
  passport.authenticate('github', {
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=github_auth_failed`,
    session: false,
  }),
  githubCallback
);

export default router;