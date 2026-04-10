import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { supabaseAdmin } from '../config/supabase';
import { AuthService } from '../services/auth.service';
import { OTPService } from '../services/otp.service';
import { EmailService } from '../services/email.service';
import { SMSService } from '../services/sms.service';
import { redisHelpers } from '../config/redis';
import { env } from '../config/env';
import { COOKIE_OPTIONS } from '../utils/constants';
import { sanitizeUser } from '../utils/helpers';
import {
  BadRequestError,
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  AccountLockedError,
} from '../utils/errors';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { TokenPayload } from '../types';
import jwt from 'jsonwebtoken';
import { StorageService } from '../services/storage.service';
import QRCode from 'qrcode';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, phone, dob, preferred_currency, language } = req.body;
  const avatarFile = req.file;
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id, provider')
    .eq('email', email)
    .single();

  if (existingUser) {
    throw new ConflictError(
      `An account with this email already exists. ${existingUser.provider !== 'local'
        ? `Try signing in with ${existingUser.provider}.`
        : ''
      }`
    );
  }

  let avatar_url = null;
  if (avatarFile) {
    avatar_url = await StorageService.uploadImage(avatarFile);
  }
  const password_hash = await AuthService.hashPassword(password);

  const { data: newUser, error } = await supabaseAdmin
    .from('users')
    .insert({
      name,
      email,
      password_hash,
      phone: phone || null,
      dob: dob || null,
      preferred_currency: preferred_currency || 'USD',
      language: language || 'en',
      provider: 'local',
      avatar_url,
    })
    .select()
    .single();

  if (error || !newUser) {
    logger.error('User creation failed:', error);
    throw new BadRequestError('Failed to create account. Please try again.');
  }

  try {
    await supabaseAdmin.rpc('create_user_default_accounts', {
      p_user_id: newUser.id,
      p_currency: preferred_currency || 'USD',
    });

    const { data: accounts } = await supabaseAdmin
      .from('accounts')
      .select('account_number')
      .eq('user_id', newUser.id)
      .eq('account_type', 'savings')
      .single();

    if (accounts) {
      const qrData = JSON.stringify({
        type: 'personal',
        account: accounts.account_number,
        name: newUser.name,
        bank: 'FINSYNC'
      });

      const qrBuffer = await QRCode.toBuffer(qrData, { width: 400, margin: 2, color: { dark: '#000000ff', light: '#ffffffff' } });
      const qr_code_url = await StorageService.uploadBuffer(qrBuffer, 'image/png', 'qr.png', 'qrcodes', 'users');

      await supabaseAdmin
        .from('users')
        .update({ qr_code_url })
        .eq('id', newUser.id);
    }
  } catch (err) {
    logger.error('Default accounts/QR creation failed:', err);
  }

  const defaultCategories = [
    { category_name: 'Food & Dining', color: '#ff6b6b', icon: 'utensils', monthly_limit: 500 },
    { category_name: 'Shopping', color: '#4ecdc4', icon: 'shopping-bag', monthly_limit: 300 },
    { category_name: 'Transportation', color: '#45b7d1', icon: 'car', monthly_limit: 200 },
    { category_name: 'Bills & Utilities', color: '#96ceb4', icon: 'zap', monthly_limit: 400 },
    { category_name: 'Entertainment', color: '#ffeaa7', icon: 'film', monthly_limit: 200 },
    { category_name: 'Healthcare', color: '#dfe6e9', icon: 'heart', monthly_limit: 300 },
  ];

  for (const cat of defaultCategories) {
    await supabaseAdmin.from('budget_categories').insert({
      user_id: newUser.id,
      ...cat,
      currency: preferred_currency || 'USD',
    });
  }

  const otp = await OTPService.generateAndStore(newUser.id, 'email_verification');

  await EmailService.sendOTP(email, otp, name, 'email verification');

  if (phone) {
    const phoneOtp = await OTPService.generateAndStore(newUser.id, 'phone_verification');
    await SMSService.sendOTP(phone, phoneOtp);
  }
  await supabaseAdmin.from('notifications').insert({
    user_id: newUser.id,
    type: 'system',
    title: '🎉 Welcome to FinSync!',
    message: 'Your account has been created. Please verify your email to get started.',
  });

  await supabaseAdmin.from('audit_log').insert({
    user_id: newUser.id,
    action: 'REGISTER',
    table_name: 'users',
    record_id: newUser.id,
    new_data: { email, name, provider: 'local' },
    ip_address: req.ip,
    user_agent: req.get('user-agent'),
  });

  res.status(201).json({
    success: true,
    message: 'Account created successfully. Please verify your email with the OTP sent.',
    data: {
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
      requiresOTP: true,
      otpType: 'email_verification',
    },
  });
});

export const login = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (!user) {
    await AuthService.recordLoginAttempt(email, null, req.ip || '', req.get('user-agent') || null, false, 'User not found');
    throw new UnauthorizedError('Invalid email or password');
  }

  const isLocked = await redisHelpers.isAccountLocked(user.id);
  if (isLocked) {
    await AuthService.recordLoginAttempt(email, user.id, req.ip || '', req.get('user-agent') || null, false, 'Account locked');
    throw new AccountLockedError();
  }

  if (user.provider !== 'local' && !user.password_hash) {
    throw new BadRequestError(`This account uses ${user.provider} sign-in. Please use the ${user.provider} button.`);
  }
  const isMatch = await AuthService.verifyPassword(password, user.password_hash);
  if (!isMatch) {
    await AuthService.recordLoginAttempt(email, user.id, req.ip || '', req.get('user-agent') || null, false, 'Invalid password');

    const { redis } = await import('../config/redis');
    const currentAttempts = Number(await redis.get(`login_attempts:${user.id}`)) || 0;
    const remaining = env.MAX_LOGIN_ATTEMPTS - currentAttempts;

    if (remaining <= 0) {
      throw new AccountLockedError();
    }

    throw new UnauthorizedError(`Invalid password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`);
  }

  if (!user.is_email_verified) {
    const otp = await OTPService.generateAndStore(user.id, 'email_verification');
    await EmailService.sendOTP(email, otp, user.name, 'email verification');

    res.status(200).json({
      success: true,
      message: 'Email not verified. A new verification code has been sent.',
      data: {
        userId: user.id,
        requiresOTP: true,
        otpType: 'email_verification',
      },
    });
    return;
  }

  if (user.two_factor_enabled) {
    const otp = await OTPService.generateAndStore(user.id, 'login_2fa');
    await EmailService.sendOTP(email, otp, user.name, 'two-factor authentication');

    res.status(200).json({
      success: true,
      message: 'Two-factor authentication required. OTP sent to your email.',
      data: {
        userId: user.id,
        requiresOTP: true,
        otpType: 'login_2fa',
      },
    });
    return;
  }

  const tokenPayload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
  const tokens = AuthService.generateTokens(tokenPayload);
  await AuthService.storeRefreshToken(user.id, tokens.refreshToken);

  await AuthService.recordLoginAttempt(email, user.id, req.ip || '', req.get('user-agent') || null, true);

  res.cookie('accessToken', tokens.accessToken, COOKIE_OPTIONS);
  res.cookie('refreshToken', tokens.refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000,
  });

  await supabaseAdmin.from('audit_log').insert({
    user_id: user.id,
    action: 'LOGIN',
    table_name: 'users',
    record_id: user.id,
    ip_address: req.ip,
    user_agent: req.get('user-agent'),
  });

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: sanitizeUser(user),
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    },
  });
});

export const verifyOTP = asyncHandler(async (req: Request, res: Response) => {
  const { userId, otp, type } = req.body;

  const isValid = await OTPService.verify(userId, otp, type);

  if (!isValid) {
    throw new BadRequestError('Invalid or expired OTP. Please request a new one.');
  }

  if (type === 'email_verification') {
    await supabaseAdmin
      .from('users')
      .update({ is_email_verified: true })
      .eq('id', userId);

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (!user) throw new NotFoundError('User not found');

    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
    const tokens = AuthService.generateTokens(tokenPayload);
    await AuthService.storeRefreshToken(user.id, tokens.refreshToken);

    res.cookie('accessToken', tokens.accessToken, COOKIE_OPTIONS);
    res.cookie('refreshToken', tokens.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000,
    });

    await EmailService.sendWelcome(user.email, user.name);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully!',
      data: {
        user: sanitizeUser(user),
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      },
    });
    return;
  }

  if (type === 'phone_verification') {
    await supabaseAdmin
      .from('users')
      .update({ is_phone_verified: true })
      .eq('id', userId);

    res.status(200).json({
      success: true,
      message: 'Phone number verified successfully!',
    });
    return;
  }

  if (type === 'login_2fa') {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (!user) throw new NotFoundError('User not found');

    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
    const tokens = AuthService.generateTokens(tokenPayload);
    await AuthService.storeRefreshToken(user.id, tokens.refreshToken);

    await AuthService.recordLoginAttempt(user.email, user.id, req.ip || '', req.get('user-agent') || null, true);

    res.cookie('accessToken', tokens.accessToken, COOKIE_OPTIONS);
    res.cookie('refreshToken', tokens.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: '2FA verification successful',
      data: {
        user: sanitizeUser(user),
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      },
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: 'OTP verified successfully',
  });
});

export const resendOTP = asyncHandler(async (req: Request, res: Response) => {
  const { userId, type } = req.body;

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, email, name, phone')
    .eq('id', userId)
    .single();

  if (!user) throw new NotFoundError('User not found');

  const otp = await OTPService.generateAndStore(userId, type);

  if (type === 'phone_verification' && user.phone) {
    await SMSService.sendOTP(user.phone, otp);
  } else {
    const purpose = type.replace(/_/g, ' ');
    await EmailService.sendOTP(user.email, otp, user.name, purpose);
  }

  res.status(200).json({
    success: true,
    message: 'OTP has been resent successfully',
  });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, email, name, provider')
    .eq('email', email)
    .single();

  if (!user || user.provider !== 'local') {
    res.status(200).json({
      success: true,
      message: 'If an account exists with this email, a password reset code has been sent.',
    });
    return;
  }

  const otp = await OTPService.generateAndStore(user.id, 'email_verification');
  await EmailService.sendOTP(email, otp, user.name, 'password reset');

  res.status(200).json({
    success: true,
    message: 'If an account exists with this email, a password reset code has been sent.',
    data: { userId: user.id },
  });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { userId, otp, newPassword } = req.body;

  const isValid = await OTPService.verify(userId, otp, 'email_verification');
  if (!isValid) {
    throw new BadRequestError('Invalid or expired OTP');
  }

  const password_hash = await AuthService.hashPassword(newPassword);

  await supabaseAdmin
    .from('users')
    .update({ password_hash })
    .eq('id', userId);

  await AuthService.revokeRefreshToken(userId);

  await supabaseAdmin.from('audit_log').insert({
    user_id: userId,
    action: 'PASSWORD_RESET',
    table_name: 'users',
    record_id: userId,
    ip_address: req.ip,
    user_agent: req.get('user-agent'),
  });

  res.status(200).json({
    success: true,
    message: 'Password reset successful. Please login with your new password.',
  });
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!token) {
    throw new UnauthorizedError('Refresh token not provided');
  }

  let decoded: TokenPayload;
  try {
    decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const isValid = await AuthService.verifyRefreshToken(decoded.userId, token);
  if (!isValid) {
    throw new UnauthorizedError('Refresh token has been revoked');
  }

  const tokenPayload: TokenPayload = {
    userId: decoded.userId,
    email: decoded.email,
    role: decoded.role,
  };
  const tokens = AuthService.generateTokens(tokenPayload);
  await AuthService.storeRefreshToken(decoded.userId, tokens.refreshToken);

  res.cookie('accessToken', tokens.accessToken, COOKIE_OPTIONS);
  res.cookie('refreshToken', tokens.refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000,
  });

  res.status(200).json({
    success: true,
    message: 'Token refreshed successfully',
    data: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    },
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (req.user) {
    await AuthService.revokeRefreshToken(req.user.id);

    await supabaseAdmin.from('audit_log').insert({
      user_id: req.user.id,
      action: 'LOGOUT',
      table_name: 'users',
      record_id: req.user.id,
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });
  }

  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');

  req.logout((err) => {
    if (err) logger.error('Logout error:', err);
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Not authenticated');
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', req.user.id)
    .single();

  if (!user) throw new NotFoundError('User not found');

  const { data: accounts } = await supabaseAdmin
    .from('accounts')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('status', 'active');

  const { count: unreadNotifications } = await supabaseAdmin
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', req.user.id)
    .eq('status', 'unread');

  res.status(200).json({
    success: true,
    message: 'User fetched successfully',
    data: {
      user: sanitizeUser(user),
      accounts: accounts || [],
      unreadNotifications: unreadNotifications || 0,
    },
  });
});

export const toggle2FA = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('two_factor_enabled')
    .eq('id', req.user.id)
    .single();

  if (!user) throw new NotFoundError('User not found');

  const newValue = !user.two_factor_enabled;

  await supabaseAdmin
    .from('users')
    .update({ two_factor_enabled: newValue })
    .eq('id', req.user.id);

  res.status(200).json({
    success: true,
    message: `Two-factor authentication ${newValue ? 'enabled' : 'disabled'}`,
    data: { two_factor_enabled: newValue },
  });
});

export const googleCallback = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as any;
  if (!user) {
    return res.redirect(`${env.CLIENT_URL}/login?error=google_auth_failed`);
  }

  const tokenPayload: TokenPayload = { userId: user.id, email: user.email, role: user.role || 'user' };
  const tokens = AuthService.generateTokens(tokenPayload);
  await AuthService.storeRefreshToken(user.id, tokens.refreshToken);
  await AuthService.recordLoginAttempt(user.email, user.id, req.ip || '', req.get('user-agent') || null, true);

  res.cookie('accessToken', tokens.accessToken, COOKIE_OPTIONS);
  res.cookie('refreshToken', tokens.refreshToken, { ...COOKIE_OPTIONS, maxAge: env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000 });

  res.redirect(`${env.CLIENT_URL}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`);
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();

  const { name, phone, language } = req.body;
  const avatarFile = req.file;

  logger.debug('Update profile request:', { body: req.body, file: !!avatarFile });

  const { data: currentUser, error: userError } = await supabaseAdmin
    .from('users')
    .select('avatar_url')
    .eq('id', req.user.id)
    .single();

  if (userError || !currentUser) {
    logger.error('Failed to fetch existing user:', userError);
    throw new NotFoundError('User not found');
  }

  const updateData: any = {};
  if (name) updateData.name = name;
  if (phone) updateData.phone = phone;
  if (language) updateData.language = language;

  if (avatarFile) {
    const newAvatarUrl = await StorageService.uploadImage(avatarFile);
    updateData.avatar_url = newAvatarUrl;

    if (currentUser.avatar_url) {
      await StorageService.deleteImage(currentUser.avatar_url);
    }
  }

  logger.debug('Final update data:', updateData);

  if (Object.keys(updateData).length === 0) {
    res.status(200).json({
      success: true,
      message: 'No changes detected',
      data: { user: sanitizeUser(req.user) },
    });
    return;
  }

  const { data: updatedUser, error } = await supabaseAdmin
    .from('users')
    .update(updateData)
    .eq('id', req.user.id)
    .select('id, email, name, role, provider, is_email_verified, is_phone_verified, two_factor_enabled, preferred_currency, language, kyc_status, avatar_url, phone, is_active')
    .single();

  if (error || !updatedUser) {
    logger.error('Supabase profile update failed! Error:', error || 'Unknown failure, no user returned');
    throw new BadRequestError(`Failed to update profile: ${error?.message || 'Update operation yielded no result'}`);
  }

  await supabaseAdmin.from('audit_log').insert({
    user_id: req.user.id,
    action: 'UPDATE_PROFILE',
    table_name: 'users',
    record_id: req.user.id,
    new_data: updateData,
    ip_address: req.ip,
    user_agent: req.get('user-agent'),
  });

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: sanitizeUser(updatedUser),
    },
  });
});

export const githubCallback = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as any;
  if (!user) {
    return res.redirect(`${env.CLIENT_URL}/login?error=github_auth_failed`);
  }

  const tokenPayload: TokenPayload = { userId: user.id, email: user.email, role: user.role || 'user' };
  const tokens = AuthService.generateTokens(tokenPayload);
  await AuthService.storeRefreshToken(user.id, tokens.refreshToken);
  await AuthService.recordLoginAttempt(user.email, user.id, req.ip || '', req.get('user-agent') || null, true);

  res.cookie('accessToken', tokens.accessToken, COOKIE_OPTIONS);
  res.cookie('refreshToken', tokens.refreshToken, { ...COOKIE_OPTIONS, maxAge: env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000 });

  res.redirect(`${env.CLIENT_URL}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`);
});