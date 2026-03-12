import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { supabaseAdmin } from '../config/supabase';
import { UnauthorizedError, ForbiddenError, AccountLockedError } from '../utils/errors';
import { redisHelpers } from '../config/redis';
import { TokenPayload } from '../types';

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }
    else if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new UnauthorizedError('Access denied. No token provided.');
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role, provider, is_email_verified, is_phone_verified, two_factor_enabled, preferred_currency, language, kyc_status, avatar_url, phone, is_active')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      throw new UnauthorizedError('User not found or token invalid');
    }

    if (!user.is_active) {
      throw new ForbiddenError('Account has been deactivated');
    }

    const isLocked = await redisHelpers.isAccountLocked(user.id);
    if (isLocked) {
      throw new AccountLockedError();
    }

    req.user = user;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token expired. Please refresh your token.'));
    } else if (err instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else {
      next(err);
    }
  }
};

export const requireAdmin = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return next(new ForbiddenError('Admin access required'));
  }
  next();
};

export const requireVerifiedEmail = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user?.is_email_verified) {
    return next(new ForbiddenError('Email verification required. Please verify your email first.'));
  }
  next();
};

export const requireKYC = (req: Request, _res: Response, next: NextFunction) => {
  if (req.user?.kyc_status !== 'verified') {
    return next(new ForbiddenError('KYC verification required for this action'));
  }
  next();
};

export const optionalAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    } else if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id, email, name, role, provider, is_email_verified, preferred_currency, language, avatar_url')
        .eq('id', decoded.userId)
        .single();

      if (user) {
        req.user = user as any;
      }
    }
    next();
  } catch {
    next();
  }
};