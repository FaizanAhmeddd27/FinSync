import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { env } from '../config/env';
import { redisHelpers } from '../config/redis';
import { supabaseAdmin } from '../config/supabase';
import { TokenPayload, AuthTokens } from '../types';
import { logger } from '../utils/logger';

export class AuthService {
  static generateTokens(payload: TokenPayload): AuthTokens {
    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRE,
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRE,
    } as jwt.SignOptions);

    return { accessToken, refreshToken };
  }

  // Hash password
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  }

  // Verify password
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Store refresh token in Redis
  static async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    await redisHelpers.setRefreshToken(userId, refreshToken, env.JWT_COOKIE_EXPIRE);
  }

  // Verify refresh token
  static async verifyRefreshToken(userId: string, refreshToken: string): Promise<boolean> {
    const storedToken = await redisHelpers.getRefreshToken(userId);
    return storedToken === refreshToken;
  }

  // Revoke refresh token (logout)
  static async revokeRefreshToken(userId: string): Promise<void> {
    await redisHelpers.revokeRefreshToken(userId);
  }

  // Record login attempt
  static async recordLoginAttempt(
    email: string,
    userId: string | null,
    ipAddress: string,
    userAgent: string | null,
    success: boolean,
    failureReason: string | null = null
  ): Promise<void> {
    await supabaseAdmin.from('login_attempts').insert({
      email,
      user_id: userId,
      ip_address: ipAddress,
      user_agent: userAgent,
      success,
      failure_reason: failureReason,
    });

    if (!success && userId) {
      const attempts = await redisHelpers.incrementLoginAttempts(userId);
      if (attempts >= env.MAX_LOGIN_ATTEMPTS) {
        logger.warn(`Account locked for user ${userId} after ${attempts} failed attempts`);
      }
    } else if (success && userId) {
      await redisHelpers.resetLoginAttempts(userId);
    }
  }
}