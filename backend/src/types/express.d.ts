import { User as FinSyncUser } from './index';

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      name: string;
      role: 'user' | 'admin';
      provider: 'local' | 'google' | 'github';
      is_active: boolean;
      is_email_verified: boolean;
      is_phone_verified: boolean;
      two_factor_enabled: boolean;
      preferred_currency: string;
      language: string;
      kyc_status: string;
      avatar_url: string | null;
      phone: string | null;
    }
    interface Request {
      user?: User;
    }
  }
}

export {};