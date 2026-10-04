import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { env } from '../config/env';

// ── Email Templates ─────────────────────────────────────────────────
// Shared HTML templates used by all providers.

function guestVerificationHtml(params: { firstName: string; actionUrl: string }): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FDFCFA; color: #0B2540; margin: 0; padding: 40px 20px; }
        .container { max-width: 560px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E5E0D8; padding: 40px 32px; }
        .logo { font-family: 'Cinzel', Georgia, serif; font-size: 24px; font-weight: 700; letter-spacing: 0.15em; color: #0B2540; text-transform: uppercase; margin-bottom: 24px; }
        .accent-bar { width: 48px; height: 2px; background-color: #D9722C; margin-bottom: 24px; }
        h1 { font-family: 'Cinzel', Georgia, serif; font-size: 20px; font-weight: 600; letter-spacing: 0.05em; color: #0B2540; margin-top: 0; }
        p { font-size: 14px; line-height: 1.6; color: rgba(11, 37, 64, 0.8); margin: 16px 0; }
        .btn { display: inline-block; background-color: #0B2540; color: #FFFFFF !important; text-decoration: none; padding: 14px 28px; font-size: 12px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; margin: 24px 0; }
        .footer { border-top: 1px solid #E5E0D8; margin-top: 32px; padding-top: 20px; font-size: 12px; color: rgba(11, 37, 64, 0.5); }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">SKY NEST</div>
        <div class="accent-bar"></div>
        <h1>Confirm Your Email Address</h1>
        <p>Welcome to Sky Nest, ${params.firstName}.</p>
        <p>Thank you for creating an account with us. Please confirm your email address to activate your account and start booking luxury sanctuaries across Sri Lanka.</p>
        <div style="text-align: center;">
          <a href="${params.actionUrl}" class="btn" target="_blank">Verify Email Address</a>
        </div>
        <p style="font-size: 12px; color: rgba(11, 37, 64, 0.6);">
          This link will expire in 24 hours. If you did not create a Sky Nest account, you can safely disregard this email.
        </p>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Sky Nest Luxury Hotels &amp; Resorts. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;
}

function staffInvitationHtml(params: { firstName: string; role: string; branchName?: string | null; actionUrl: string }): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FDFCFA; color: #0B2540; margin: 0; padding: 40px 20px; }
        .container { max-width: 560px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E5E0D8; padding: 40px 32px; }
        .logo { font-family: 'Cinzel', Georgia, serif; font-size: 24px; font-weight: 700; letter-spacing: 0.15em; color: #0B2540; text-transform: uppercase; margin-bottom: 24px; }
        .accent-bar { width: 48px; height: 2px; background-color: #D9722C; margin-bottom: 24px; }
        h1 { font-family: 'Cinzel', Georgia, serif; font-size: 20px; font-weight: 600; letter-spacing: 0.05em; color: #0B2540; margin-top: 0; }
        p { font-size: 14px; line-height: 1.6; color: rgba(11, 37, 64, 0.8); margin: 16px 0; }
        .badge { display: inline-block; background: #FDFCFA; border: 1px solid #E5E0D8; padding: 6px 14px; font-size: 12px; font-weight: 600; color: #D9722C; margin: 8px 0; }
        .btn { display: inline-block; background-color: #0B2540; color: #FFFFFF !important; text-decoration: none; padding: 14px 28px; font-size: 12px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; margin: 24px 0; }
        .footer { border-top: 1px solid #E5E0D8; margin-top: 32px; padding-top: 20px; font-size: 12px; color: rgba(11, 37, 64, 0.5); }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">SKY NEST</div>
        <div class="accent-bar"></div>
        <h1>Welcome to the Sky Nest Team</h1>
        <p>Hello ${params.firstName},</p>
        <p>You have been invited to join the Sky Nest Hotel Management System as:</p>
        <div>
          <span class="badge">Role: ${params.role.replace('_', ' ')}</span>
          ${params.branchName ? `<span class="badge" style="margin-left: 8px;">Branch: ${params.branchName}</span>` : ''}
        </div>
        <p>Please click the button below to set up your username and password to activate your staff account.</p>
        <div style="text-align: center;">
          <a href="${params.actionUrl}" class="btn" target="_blank">Activate Account</a>
        </div>
        <p style="font-size: 12px; color: rgba(11, 37, 64, 0.6);">
          This invitation link will expire in 48 hours. If you were not expecting this invitation, please contact your hotel administrator.
        </p>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Sky Nest Luxury Hotels &amp; Resorts. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;
}

// ── Provider Interface ──────────────────────────────────────────────

interface EmailPayload {
  from: string;
  to: string;
  subject: string;
  html: string;
}

interface EmailProvider {
  readonly name: string;
  send(payload: EmailPayload): Promise<boolean>;
}

// ── Resend Provider ─────────────────────────────────────────────────

class ResendProvider implements EmailProvider {
  readonly name = 'Resend';
  private client: Resend;

  constructor(apiKey: string) {
    this.client = new Resend(apiKey);
  }

  async send(payload: EmailPayload): Promise<boolean> {
    const { error } = await this.client.emails.send({
      from: payload.from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });

    if (error) {
      console.warn(`[ResendProvider] API error: ${error.message}`);
      return false;
    }
    return true;
  }
}

// ── SMTP / Nodemailer Provider ──────────────────────────────────────

class SmtpProvider implements EmailProvider {
  readonly name = 'SMTP';
  private transporter: Transporter;

  constructor(config: {
    host: string;
    port: number;
    secure?: boolean;
    user: string;
    pass: string;
  }) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure ?? config.port === 465,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      // Connection pooling for performance
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
    });
  }

  async send(payload: EmailPayload): Promise<boolean> {
    const info = await this.transporter.sendMail({
      from: payload.from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });

    console.log(`[SmtpProvider] Message sent: ${info.messageId}`);
    return true;
  }

  /** Verify SMTP connection on startup (non-blocking) */
  async verify(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('[SmtpProvider] ✅ SMTP connection verified');
      return true;
    } catch (err: any) {
      console.error('[SmtpProvider] ❌ SMTP connection failed:', err.message);
      return false;
    }
  }
}

// ── Email Service (Strategy Facade) ─────────────────────────────────

export class EmailService {
  private provider: EmailProvider;

  constructor() {
    if (env.EMAIL_PROVIDER === 'resend') {
      console.log('[EmailService] Using Resend provider');
      this.provider = new ResendProvider(env.RESEND_API_KEY!);
    } else {
      console.log('[EmailService] Using SMTP provider');
      const smtpProvider = new SmtpProvider({
        host: env.SMTP_HOST!,
        port: env.SMTP_PORT!,
        secure: env.SMTP_SECURE as boolean | undefined,
        user: env.SMTP_USER!,
        pass: env.SMTP_PASS!,
      });
      // Non-blocking connection verification on startup
      smtpProvider.verify();
      this.provider = smtpProvider;
    }
  }

  get providerName(): string {
    return this.provider.name;
  }

  async sendGuestVerificationEmail(params: {
    to: string;
    firstName: string;
    token: string;
  }): Promise<boolean> {
    const actionUrl = `${env.APP_URL}/verify-email?token=${encodeURIComponent(params.token)}`;

    if (env.NODE_ENV !== 'production') {
      console.log(`\n======================================================`);
      console.log(`[SKY NEST EMAIL] Guest Verification Email (${this.provider.name})`);
      console.log(`Recipient: ${params.to}`);
      console.log(`Action URL: ${actionUrl}`);
      console.log(`======================================================\n`);
    }

    try {
      return await this.provider.send({
        from: env.EMAIL_FROM,
        to: params.to,
        subject: 'Verify Your Email — Sky Nest Luxury Stays',
        html: guestVerificationHtml({ firstName: params.firstName, actionUrl }),
      });
    } catch (err: any) {
      console.warn(`[EmailService] Failed to send guest verification via ${this.provider.name}:`, err.message);
      return false;
    }
  }

  async sendStaffInvitationEmail(params: {
    to: string;
    firstName: string;
    role: string;
    branchName?: string | null;
    token: string;
  }): Promise<boolean> {
    const actionUrl = `${env.APP_URL}/accept-invite?token=${encodeURIComponent(params.token)}`;

    if (env.NODE_ENV !== 'production') {
      console.log(`\n======================================================`);
      console.log(`[SKY NEST EMAIL] Staff Invitation Email (${this.provider.name})`);
      console.log(`Recipient: ${params.to}`);
      console.log(`Role: ${params.role}, Branch: ${params.branchName ?? 'Headquarters'}`);
      console.log(`Action URL: ${actionUrl}`);
      console.log(`======================================================\n`);
    }

    try {
      return await this.provider.send({
        from: env.EMAIL_FROM,
        to: params.to,
        subject: 'Invitation to Join Sky Nest Staff Portal',
        html: staffInvitationHtml({
          firstName: params.firstName,
          role: params.role,
          branchName: params.branchName,
          actionUrl,
        }),
      });
    } catch (err: any) {
      console.warn(`[EmailService] Failed to send staff invitation via ${this.provider.name}:`, err.message);
      return false;
    }
  }
}

export const emailService = new EmailService();
