import rateLimit from 'express-rate-limit';
import { env } from '../config/env';


export const generalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
    error: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});


export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 10,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes',
    error: 'AUTH_RATE_LIMIT',
  },
  standardHeaders: true,
  legacyHeaders: false,
});


export const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, 
  max: 5,
  message: {
    success: false,
    message: 'Too many OTP requests, please try again after 5 minutes',
    error: 'OTP_RATE_LIMIT',
  },
  standardHeaders: true,
  legacyHeaders: false,
});


export const transferLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 20,
  message: {
    success: false,
    message: 'Too many transfer requests, please try again later',
    error: 'TRANSFER_RATE_LIMIT',
  },
  standardHeaders: true,
  legacyHeaders: false,
});