import { supabaseAdmin } from '../config/supabase';
import { redisHelpers } from '../config/redis';
import { generateOTP } from '../utils/helpers';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export class OTPService {
  
  static async generateAndStore(
    userId: string,
    type: 'email_verification' | 'phone_verification' | 'login_2fa' | 'transfer'
  ): Promise<string> {
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + env.OTP_EXPIRY * 60 * 1000);

    
    await redisHelpers.setOTP(`${userId}:${type}`, otp, env.OTP_EXPIRY);

    
    await supabaseAdmin.from('otp_records').insert({
      user_id: userId,
      otp_code: otp,
      type,
      expires_at: expiresAt.toISOString(),
    });

    logger.debug(`OTP generated for ${userId} (${type}): ${otp}`);
    return otp;
  }

  
  static async verify(
    userId: string,
    otp: string,
    type: 'email_verification' | 'phone_verification' | 'login_2fa' | 'transfer'
  ): Promise<boolean> {
    
    const isValid = await redisHelpers.verifyOTP(`${userId}:${type}`, otp);

    if (isValid) {
      
      await supabaseAdmin
        .from('otp_records')
        .update({ is_used: true })
        .eq('user_id', userId)
        .eq('type', type)
        .eq('is_used', false)
        .order('created_at', { ascending: false })
        .limit(1);

      return true;
    }

    
    const { data: otpRecord } = await supabaseAdmin
      .from('otp_records')
      .select('*')
      .eq('user_id', userId)
      .eq('otp_code', String(otp)) 
      .eq('type', type)
      .eq('is_used', false)
      
      .gte('expires_at', new Date(Date.now() - 60000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpRecord) {
      await supabaseAdmin
        .from('otp_records')
        .update({ is_used: true })
        .eq('id', otpRecord.id);
      return true;
    }

    return false;
  }

  static async invalidateAll(userId: string, type?: string): Promise<void> {
    const query = supabaseAdmin
      .from('otp_records')
      .update({ is_used: true })
      .eq('user_id', userId);

    if (type) {
      query.eq('type', type);
    }

    await query;

    if (type) {
      await redisHelpers.invalidateCache(`otp:${userId}:${type}`);
    }
  }
}