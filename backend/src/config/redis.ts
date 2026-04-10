import { Redis } from '@upstash/redis';
import { env } from './env';

export const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});


export const redisHelpers = {
  
  async setOTP(key: string, otp: string, expiryMinutes: number = 10): Promise<void> {
    await redis.set(`otp:${key}`, otp, { ex: expiryMinutes * 60 });
  },

  
  async verifyOTP(key: string, otp: string): Promise<boolean> {
    const storedOTP = await redis.get(`otp:${key}`);
    
    if (storedOTP && String(storedOTP) === String(otp)) {
      await redis.del(`otp:${key}`);
      return true;
    }
    return false;
  },

  
  async incrementLoginAttempts(userId: string): Promise<number> {
    const key = `login_attempts:${userId}`;
    const attempts = await redis.incr(key);
    if (attempts === 1) {
      await redis.expire(key, env.LOCK_TIME * 60);
    }
    return attempts;
  },

  
  async isAccountLocked(userId: string): Promise<boolean> {
    const attempts = await redis.get(`login_attempts:${userId}`);
    return Number(attempts) >= env.MAX_LOGIN_ATTEMPTS;
  },

  
  async resetLoginAttempts(userId: string): Promise<void> {
    await redis.del(`login_attempts:${userId}`);
  },

  
  async setCache(key: string, value: any, expirySeconds: number = 300): Promise<void> {
    await redis.set(`cache:${key}`, JSON.stringify(value), { ex: expirySeconds });
  },

  
  async getCache<T>(key: string): Promise<T | null> {
    const data = await redis.get(`cache:${key}`);
    if (!data) return null;
    return typeof data === 'string' ? JSON.parse(data) : data as T;
  },

  
  async invalidateCache(key: string): Promise<void> {
    await redis.del(`cache:${key}`);
  },

  
  async setRefreshToken(userId: string, token: string, expiryDays: number = 7): Promise<void> {
    await redis.set(`refresh:${userId}`, token, { ex: expiryDays * 24 * 60 * 60 });
  },

  
  async getRefreshToken(userId: string): Promise<string | null> {
    const token = await redis.get(`refresh:${userId}`);
    return token as string | null;
  },

  
  async revokeRefreshToken(userId: string): Promise<void> {
    await redis.del(`refresh:${userId}`);
  },

  
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

  
  async setSession(sessionId: string, data: any, expirySeconds: number = 86400): Promise<void> {
    await redis.set(`session:${sessionId}`, JSON.stringify(data), { ex: expirySeconds });
  },

  
  async getSession<T>(sessionId: string): Promise<T | null> {
    const data = await redis.get(`session:${sessionId}`);
    if (!data) return null;
    return typeof data === 'string' ? JSON.parse(data) : data as T;
  },
};

export default redis;
