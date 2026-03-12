import twilio from 'twilio';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

export class SMSService {
  static async sendOTP(phone: string, otp: string): Promise<boolean> {
    try {
      await client.messages.create({
        body: `Your FinSync verification code is: ${otp}. Valid for ${env.OTP_EXPIRY} minutes. Do not share this code.`,
        from: env.TWILIO_PHONE_NUMBER,
        to: phone,
      });
      logger.success(`OTP SMS sent to ${phone}`);
      return true;
    } catch (err) {
      logger.error('SMS send error:', err);
      return false;
    }
  }
}