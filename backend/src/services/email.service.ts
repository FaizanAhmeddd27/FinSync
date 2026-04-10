
import { transporter } from '../config/nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const SENDER_EMAIL = `FinSync <${env.EMAIL_USER}>`;

export class EmailService {
  static async sendOTP(to: string, otp: string, name: string, purpose: string = 'verification'): Promise<boolean> {
    try {
      const info = await transporter.sendMail({
        from: SENDER_EMAIL,
        to,
        subject: `FinSync — Your ${purpose} code: ${otp}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin:0;padding:0;background-color:#000000;font-family:'Open Sans',Arial,sans-serif;">
            <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
              <div style="text-align:center;margin-bottom:40px;">
                <h1 style="color:#1c9cf0;font-size:32px;margin:0;letter-spacing:2px;">🏦 FinSync</h1>
                <p style="color:#72767a;margin-top:8px;">Advanced Digital Banking</p>
              </div>
              <div style="background-color:#17181c;border:1px solid #242628;border-radius:16px;padding:40px;text-align:center;">
                <h2 style="color:#e7e9ea;font-size:24px;margin:0 0 8px;">Hello, ${name}! 👋</h2>
                <p style="color:#72767a;font-size:16px;margin:0 0 32px;">Your ${purpose} code is:</p>
                <div style="background-color:#061622;border:2px solid #1c9cf0;border-radius:12px;padding:24px;margin:0 auto;max-width:280px;">
                  <span style="font-size:36px;font-weight:bold;letter-spacing:12px;color:#1c9cf0;font-family:monospace;">
                    ${otp}
                  </span>
                </div>
                <p style="color:#72767a;font-size:14px;margin-top:24px;">
                  This code expires in <strong style="color:#e7e9ea;">${env.OTP_EXPIRY} minutes</strong>
                </p>
                <div style="border-top:1px solid #242628;margin:32px 0;"></div>
                <p style="color:#72767a;font-size:12px;margin:0;">
                  If you didn't request this code, please ignore this email.
                </p>
              </div>
              <div style="text-align:center;margin-top:32px;">
                <p style="color:#72767a;font-size:12px;">
                  © ${new Date().getFullYear()} FinSync. All rights reserved.
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      logger.info(`OTP email sent → ${to} | Message ID: ${info.messageId}`);
      return true;
    } catch (err) {
      logger.error('Email service exception:', err);
      return false;
    }
  }

  static async sendWelcome(to: string, name: string): Promise<boolean> {
    try {
      const info = await transporter.sendMail({
        from: SENDER_EMAIL,
        to,
        subject: 'Welcome to FinSync! 🏦',
        html: `
          <!DOCTYPE html>
          <html>
          <body style="margin:0;padding:0;background-color:#000000;font-family:'Open Sans',Arial,sans-serif;">
            <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
              <div style="text-align:center;margin-bottom:40px;">
                <h1 style="color:#1c9cf0;font-size:32px;margin:0;">🏦 FinSync</h1>
              </div>
              <div style="background-color:#17181c;border:1px solid #242628;border-radius:16px;padding:40px;">
                <h2 style="color:#e7e9ea;text-align:center;">Welcome aboard, ${name}! 🎉</h2>
                <p style="color:#72767a;line-height:1.6;">Your FinSync account is ready. Here's what you can do:</p>
                <ul style="color:#d9d9d9;line-height:2;">
                  <li>💰 Multi-currency accounts (USD, EUR, GBP, INR, PKR)</li>
                  <li>💸 Instant transfers with real-time tracking</li>
                  <li>📊 AI-powered spending insights & budget tracking</li>
                  <li>🤖 Smart AI chatbot assistant</li>
                  <li>🚨 Advanced fraud detection</li>
                </ul>
                <div style="text-align:center;margin-top:32px;">
                  <a href="${env.CLIENT_URL}/dashboard" style="background-color:#1c9cf0;color:white;padding:14px 40px;border-radius:10px;text-decoration:none;font-weight:bold;display:inline-block;">
                    Go to Dashboard →
                  </a>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      logger.info(`Welcome email sent → ${to} | Message ID: ${info.messageId}`);
      return true;
    } catch (err) {
      logger.error('Welcome email exception:', err);
      return false;
    }
  }

  static async sendTransactionAlert(
    to: string, name: string, type: 'credit' | 'debit',
    amount: number, currency: string, description: string, balance: number
  ): Promise<boolean> {
    try {
      const emoji = type === 'credit' ? '💰' : '💸';
      const color = type === 'credit' ? '#00b87a' : '#f4212e';
      const label = type === 'credit' ? 'Received' : 'Sent';

      const info = await transporter.sendMail({
        from: SENDER_EMAIL,
        to,
        subject: `${emoji} ${currency} ${amount.toFixed(2)} ${label} — FinSync`,
        html: `
          <!DOCTYPE html>
          <html>
          <body style="margin:0;padding:0;background-color:#000000;font-family:'Open Sans',Arial,sans-serif;">
            <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
              <div style="text-align:center;margin-bottom:24px;">
                <h1 style="color:#1c9cf0;font-size:28px;margin:0;">🏦 FinSync</h1>
              </div>
              <div style="background-color:#17181c;border:1px solid #242628;border-radius:16px;padding:32px;">
                <p style="color:#72767a;margin:0;">Hi ${name},</p>
                <h2 style="color:${color};font-size:28px;margin:16px 0;">${emoji} ${currency} ${amount.toFixed(2)} ${label}</h2>
                <p style="color:#d9d9d9;margin:8px 0;">${description}</p>
                <div style="border-top:1px solid #242628;margin:24px 0;"></div>
                <p style="color:#72767a;margin:0;">
                  Available Balance: <strong style="color:#e7e9ea;">${currency} ${balance.toFixed(2)}</strong>
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      logger.info(`Transaction alert sent → ${to} | Message ID: ${info.messageId}`);
      return true;
    } catch (err) {
      logger.error('Transaction alert exception:', err);
      return false;
    }
  }

  static async sendFraudAlert(to: string, name: string, alertType: string, description: string): Promise<boolean> {
    try {
      const info = await transporter.sendMail({
        from: SENDER_EMAIL,
        to,
        subject: '🚨 Security Alert — FinSync',
        html: `
          <!DOCTYPE html>
          <html>
          <body style="margin:0;padding:0;background-color:#000000;font-family:'Open Sans',Arial,sans-serif;">
            <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
              <div style="text-align:center;margin-bottom:24px;">
                <h1 style="color:#1c9cf0;font-size:28px;margin:0;">🏦 FinSync</h1>
              </div>
              <div style="background-color:#17181c;border:2px solid #f4212e;border-radius:16px;padding:32px;">
                <h2 style="color:#f4212e;text-align:center;">🚨 Security Alert</h2>
                <p style="color:#d9d9d9;">Hi ${name},</p>
                <p style="color:#72767a;">Suspicious activity detected on your account:</p>
                <div style="background-color:#061622;border-radius:8px;padding:16px;margin:16px 0;">
                  <p style="color:#f4212e;margin:0;"><strong>Alert:</strong> ${alertType.replace(/_/g, ' ').toUpperCase()}</p>
                  <p style="color:#d9d9d9;margin:8px 0 0;">${description}</p>
                </div>
                <p style="color:#72767a;">If this wasn't you, contact support immediately.</p>
                <div style="text-align:center;margin-top:24px;">
                  <a href="${env.CLIENT_URL}/fraud-alerts" style="background-color:#f4212e;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">
                    Review Alert
                  </a>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      logger.info(`Fraud alert sent → ${to} | Message ID: ${info.messageId}`);
      return true;
    } catch (err) {
      logger.error('Fraud alert exception:', err);
      return false;
    }
  }
}