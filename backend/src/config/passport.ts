import { PassportStatic } from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import bcrypt from 'bcryptjs';
import { env } from './env';
import { supabaseAdmin } from './supabase';
import { logger } from '../utils/logger';

export const configurePassport = (passport: PassportStatic): void => {
    
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('id, email, name, role, provider, is_active, is_email_verified, is_phone_verified, two_factor_enabled, preferred_currency, language, kyc_status, avatar_url, phone')
        .eq('id', id)
        .single();

      if (error || !user) {
        return done(null, false);
      }
      done(null, user as any);
    } catch (err) {
      done(err, false);
    }
  });

  passport.use(
    'local',
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
      },
      async (email, password, done) => {
        try {
          const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase().trim())
            .single();

          if (error || !user) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          // Check if account is active
          if (!user.is_active) {
            return done(null, false, { message: 'Account has been deactivated' });
          }

          // Check if user registered via OAuth
          if (user.provider !== 'local' && !user.password_hash) {
            return done(null, false, {
              message: `This account uses ${user.provider} sign-in. Please use ${user.provider} to login.`,
            });
          }

          // Verify password
          const isMatch = await bcrypt.compare(password, user.password_hash);
          if (!isMatch) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          // Return sanitized user
          const { password_hash, provider_id, ...sanitizedUser } = user;
          return done(null, sanitizedUser as any);
        } catch (err) {
          return done(err, false);
        }
      }
    )
  );

  passport.use(
    'google',
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
        scope: ['profile', 'email'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(null, false, { message: 'No email found in Google profile' } as any);
          }

          // Check if user exists
          const { data: existingUser } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();

          if (existingUser) {
            // Update provider info if logging in with Google for first time
            if (existingUser.provider === 'local') {
              await supabaseAdmin
                .from('users')
                .update({
                  provider: 'google',
                  provider_id: profile.id,
                  avatar_url: existingUser.avatar_url || profile.photos?.[0]?.value,
                  is_email_verified: true,
                })
                .eq('id', existingUser.id);
            }

            const { password_hash, provider_id, ...sanitizedUser } = existingUser;
            return done(null, { ...sanitizedUser, is_email_verified: true } as any);
          }

          // Create new user
          const { data: newUser, error } = await supabaseAdmin
            .from('users')
            .insert({
              email: email.toLowerCase(),
              name: profile.displayName || email.split('@')[0],
              provider: 'google',
              provider_id: profile.id,
              avatar_url: profile.photos?.[0]?.value,
              is_email_verified: true,
              kyc_status: 'pending',
            })
            .select()
            .single();

          if (error || !newUser) {
            logger.error('Failed to create Google user:', error);
            return done(null, false, { message: 'Failed to create account' } as any);
          }

          // Create default accounts
          await supabaseAdmin.rpc('create_user_default_accounts', {
            p_user_id: newUser.id,
            p_currency: 'USD',
          });

          // Create default budget categories
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
            });
          }

          const { password_hash: _, provider_id: __, ...sanitizedNewUser } = newUser;
          return done(null, sanitizedNewUser as any);
        } catch (err) {
          logger.error('Google auth error:', err);
          return done(err as Error, false);
        }
      }
    )
  );

  passport.use(
    'github',
    new GitHubStrategy(
      {
        clientID: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        callbackURL: env.GITHUB_CALLBACK_URL,
        scope: ['user:email'],
      },
      async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
        try {
          const email = profile.emails?.[0]?.value || `${profile.username}@github.com`;

          // Check if user exists
          const { data: existingUser } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();

          if (existingUser) {
            if (existingUser.provider === 'local') {
              await supabaseAdmin
                .from('users')
                .update({
                  provider: 'github',
                  provider_id: profile.id,
                  avatar_url: existingUser.avatar_url || profile.photos?.[0]?.value,
                  is_email_verified: true,
                })
                .eq('id', existingUser.id);
            }

            const { password_hash, provider_id, ...sanitizedUser } = existingUser;
            return done(null, { ...sanitizedUser, is_email_verified: true } as any);
          }

          // Create new user
          const { data: newUser, error } = await supabaseAdmin
            .from('users')
            .insert({
              email: email.toLowerCase(),
              name: profile.displayName || profile.username || email.split('@')[0],
              provider: 'github',
              provider_id: profile.id.toString(),
              avatar_url: profile.photos?.[0]?.value,
              is_email_verified: true,
              kyc_status: 'pending',
            })
            .select()
            .single();

          if (error || !newUser) {
            logger.error('Failed to create GitHub user:', error);
            return done(null, false);
          }

          // Create default accounts
          await supabaseAdmin.rpc('create_user_default_accounts', {
            p_user_id: newUser.id,
            p_currency: 'USD',
          });

          // Create default budget categories
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
            });
          }

          const { password_hash: _, provider_id: __, ...sanitizedNewUser } = newUser;
          return done(null, sanitizedNewUser as any);
        } catch (err) {
          logger.error('GitHub auth error:', err);
          return done(err, false);
        }
      }
    )
  );

  logger.success('Passport strategies configured: Local, Google, GitHub');
};