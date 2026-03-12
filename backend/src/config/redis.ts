import { Redis } from '@upstash/redis';
import { env } from './env';

export const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

// Helper functions for common Redis operations
export const redisHelpers = {
  // Store OTP with expiry
  async setOTP(key: string, otp: string, expiryMinutes: number = 10): Promise<void> {
    await redis.set(`otp:${key}`, otp, { ex: expiryMinutes * 60 });
  },

  // Verify OTP
  async verifyOTP(key: string, otp: string): Promise<boolean> {
    const storedOTP = await redis.get(`otp:${key}`);
    // Safely cast both values to string for comparison
    if (storedOTP && String(storedOTP) === String(otp)) {
      await redis.del(`otp:${key}`);
      return true;
    }
    return false;
  },

  // Track login attempts
  async incrementLoginAttempts(userId: string): Promise<number> {
    const key = `login_attempts:${userId}`;
    const attempts = await redis.incr(key);
    if (attempts === 1) {
      await redis.expire(key, env.LOCK_TIME * 60);
    }
    return attempts;
  },

  // Check if account is locked
  async isAccountLocked(userId: string): Promise<boolean> {
    const attempts = await redis.get(`login_attempts:${userId}`);
    return Number(attempts) >= env.MAX_LOGIN_ATTEMPTS;
  },

  // Reset login attempts
  async resetLoginAttempts(userId: string): Promise<void> {
    await redis.del(`login_attempts:${userId}`);
  },

  // Cache with expiry
  async setCache(key: string, value: any, expirySeconds: number = 300): Promise<void> {
    await redis.set(`cache:${key}`, JSON.stringify(value), { ex: expirySeconds });
  },

  // Get cache
  async getCache<T>(key: string): Promise<T | null> {
    const data = await redis.get(`cache:${key}`);
    if (!data) return null;
    return typeof data === 'string' ? JSON.parse(data) : data as T;
  },

  // Invalidate cache
  async invalidateCache(key: string): Promise<void> {
    await redis.del(`cache:${key}`);
  },

  // Store refresh token
  async setRefreshToken(userId: string, token: string, expiryDays: number = 7): Promise<void> {
    await redis.set(`refresh:${userId}`, token, { ex: expiryDays * 24 * 60 * 60 });
  },

  // Get refresh token
  async getRefreshToken(userId: string): Promise<string | null> {
    const token = await redis.get(`refresh:${userId}`);
    return token as string | null;
  },

  // Revoke refresh token
  async revokeRefreshToken(userId: string): Promise<void> {
    await redis.del(`refresh:${userId}`);
  },

  // Rate limiting helper
  async checkRateLimit(identifier: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number }> {
    const key = `ratelimit:${identifier}`;
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }
    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
    };
  },

  // Store session data
  async setSession(sessionId: string, data: any, expirySeconds: number = 86400): Promise<void> {
    await redis.set(`session:${sessionId}`, JSON.stringify(data), { ex: expirySeconds });
  },

  // Get session data
  async getSession<T>(sessionId: string): Promise<T | null> {
    const data = await redis.get(`session:${sessionId}`);
    if (!data) return null;
    return typeof data === 'string' ? JSON.parse(data) : data as T;
  },
};

export default redis;
