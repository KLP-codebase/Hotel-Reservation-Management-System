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

function guestLoginNotificationHtml(params: {
  firstName: string;
  loginTime: string;
  ipAddress: string;
  activityUrl: string;
}): string {
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
        .detail-box { background: #F8F6F2; border: 1px solid #E5E0D8; padding: 18px 20px; margin: 20px 0; }
        .detail-row { font-size: 13px; color: rgba(11, 37, 64, 0.85); margin: 6px 0; line-height: 1.5; }
        .btn { display: inline-block; background-color: #0B2540; color: #FFFFFF !important; text-decoration: none; padding: 14px 28px; font-size: 12px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; margin: 24px 0; }
        .footer { border-top: 1px solid #E5E0D8; margin-top: 32px; padding-top: 20px; font-size: 12px; color: rgba(11, 37, 64, 0.5); }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">SKY NEST</div>
        <div class="accent-bar"></div>
        <h1>Security Alert: New Sign-in</h1>
        <p>Dear ${params.firstName},</p>
        <p>We noticed a successful sign-in to your Sky Nest account. If this was you, no action is needed.</p>
        <div class="detail-box">
          <div class="detail-row"><strong>Sign-in Time:</strong> ${params.loginTime}</div>
          <div class="detail-row"><strong>IP Address:</strong> ${params.ipAddress}</div>
        </div>
        <div style="text-align: center;">
          <a href="${params.activityUrl}" class="btn" target="_blank">View Your Activity &amp; Stays</a>
        </div>
        <p style="font-size: 12px; color: rgba(11, 37, 64, 0.6);">
          If you did not authorize this login, please contact Sky Nest guest services immediately to secure your account.
        </p>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Sky Nest Luxury Hotels &amp; Resorts. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;
}


function bookingConfirmationHtml(params: {
  guestName: string;
  branchName: string;
  bookingRef: string;
  stayDates: string;
  duration: string;
  roomName: string;
  roomRate: string;
  roomSubtotal: string;
  grandTotal: string;
  actionUrl: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FDFCFA; color: #0B2540; margin: 0; padding: 30px 15px; }
        .container { max-width: 620px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E5E0D8; padding: 40px 32px; box-shadow: 0 4px 20px rgba(11,37,64,0.04); }
        .logo { font-family: 'Cinzel', Georgia, serif; font-size: 24px; font-weight: 700; letter-spacing: 0.2em; color: #0B2540; text-transform: uppercase; margin-bottom: 20px; }
        .accent-bar { width: 50px; height: 2px; background-color: #D9722C; margin-bottom: 24px; }
        .status-badge { display: inline-block; background-color: #F0FDF4; border: 1px solid #BBF7D0; color: #166534; font-size: 11px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; padding: 6px 14px; margin-bottom: 24px; }
        h1 { font-family: 'Cinzel', Georgia, serif; font-size: 22px; font-weight: 600; letter-spacing: 0.05em; color: #0B2540; margin: 0 0 8px 0; }
        p { font-size: 13px; line-height: 1.6; color: rgba(11, 37, 64, 0.8); margin: 8px 0; }
        .section-title { font-family: 'Cinzel', Georgia, serif; font-size: 13px; font-weight: 700; letter-spacing: 0.12em; color: #0B2540; text-transform: uppercase; margin: 24px 0 12px 0; border-bottom: 1px solid #E5E0D8; padding-bottom: 6px; }
        .ref-box { background: #F8F6F2; border: 1px solid #E5E0D8; padding: 18px 20px; margin: 16px 0; }
        .ref-label { font-size: 10px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(11, 37, 64, 0.6); margin-bottom: 4px; }
        .ref-val { font-family: monospace; font-size: 15px; font-weight: 700; color: #0B2540; letter-spacing: 0.08em; word-break: break-all; }
        .btn { display: inline-block; background-color: #0B2540; color: #FFFFFF !important; text-decoration: none; padding: 14px 32px; font-size: 12px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; margin: 18px 0; }
        .footer { border-top: 1px solid #E5E0D8; margin-top: 32px; padding-top: 20px; font-size: 11px; color: rgba(11, 37, 64, 0.5); text-align: center; line-height: 1.6; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">SKY NEST</div>
        <div class="accent-bar"></div>
        <div class="status-badge">&#10003; Reservation Confirmed &bull; 1 Room Reserved</div>
        <h1>Sanctuary Reservation Confirmation</h1>
        <p>Dear ${params.guestName},</p>
        <p>Your reservation at <strong>${params.branchName}</strong> has been confirmed. Below are your stay details and itemized statutory billing statement.</p>

        <div class="ref-box">
          <div class="ref-label">Booking Reference</div>
          <div class="ref-val">${params.bookingRef}</div>
        </div>

        <div class="section-title">Stay &amp; Guest Details</div>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; margin-bottom: 16px;">
          <tr>
            <td style="font-size: 13px; color: rgba(11, 37, 64, 0.7); padding: 8px 0; border-bottom: 1px dashed #EDE8E1;">Sanctuary Branch</td>
            <td style="font-size: 13px; font-weight: 600; color: #0B2540; text-align: right; padding: 8px 0; border-bottom: 1px dashed #EDE8E1;">${params.branchName}</td>
          </tr>
          <tr>
            <td style="font-size: 13px; color: rgba(11, 37, 64, 0.7); padding: 8px 0; border-bottom: 1px dashed #EDE8E1;">Primary Guest</td>
            <td style="font-size: 13px; font-weight: 600; color: #0B2540; text-align: right; padding: 8px 0; border-bottom: 1px dashed #EDE8E1;">${params.guestName}</td>
          </tr>
          <tr>
            <td style="font-size: 13px; color: rgba(11, 37, 64, 0.7); padding: 8px 0; border-bottom: 1px dashed #EDE8E1;">Stay Dates</td>
            <td style="font-size: 13px; font-weight: 600; color: #0B2540; text-align: right; padding: 8px 0; border-bottom: 1px dashed #EDE8E1;">${params.stayDates}</td>
          </tr>
          <tr>
            <td style="font-size: 13px; color: rgba(11, 37, 64, 0.7); padding: 8px 0;">Duration &amp; Guests</td>
            <td style="font-size: 13px; font-weight: 600; color: #0B2540; text-align: right; padding: 8px 0;">${params.duration}</td>
          </tr>
        </table>

        <div class="section-title">Allocated Room &amp; Meal Plan</div>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; margin-bottom: 16px;">
          <tr>
            <td style="font-size: 13px; color: rgba(11, 37, 64, 0.7); padding: 8px 0; border-bottom: 1px dashed #EDE8E1;">${params.roomName}</td>
            <td style="font-size: 13px; font-weight: 600; color: #0B2540; text-align: right; padding: 8px 0; border-bottom: 1px dashed #EDE8E1;">${params.roomRate}</td>
          </tr>
          <tr>
            <td style="font-size: 13px; color: rgba(11, 37, 64, 0.7); padding: 8px 0;">Room Subtotal</td>
            <td style="font-size: 13px; font-weight: 600; color: #0B2540; text-align: right; padding: 8px 0;">${params.roomSubtotal}</td>
          </tr>
        </table>

        <div class="section-title">Statutory Sri Lankan Tax Cascade</div>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; margin-top: 8px; font-size: 12px;">
          <tr>
            <td style="padding: 6px 0; color: rgba(11, 37, 64, 0.75);">Total Accommodation</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #0B2540;">${params.roomSubtotal}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: rgba(11, 37, 64, 0.75);">Total Meal Plans</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #0B2540;">$0.00</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #0B2540; font-weight: 700; border-top: 1px dashed #EDE8E1; border-bottom: 1px dashed #EDE8E1;">Base Subtotal (Net of Taxes)</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #0B2540; border-top: 1px dashed #EDE8E1; border-bottom: 1px dashed #EDE8E1;">${params.roomSubtotal}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: rgba(11, 37, 64, 0.75);">+ Service Charge (SC 10%)</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #0B2540;">$24.00</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: rgba(11, 37, 64, 0.75);">+ Tourism Development Levy (TDL 1%)</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #0B2540;">$2.64</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: rgba(11, 37, 64, 0.75);">+ Social Security Contribution Levy (SSCL 2.5%)</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #0B2540;">$6.67</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: rgba(11, 37, 64, 0.75);">+ Value Added Tax (VAT 18%)</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #0B2540;">$49.20</td>
          </tr>
        </table>

        <div style="background: #F8F6F2; border: 1px solid #E5E0D8; padding: 18px 20px; margin-top: 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #0B2540; vertical-align: middle;">
                GRAND TOTAL (ALL-INCLUSIVE)
              </td>
              <td style="font-family: 'Cinzel', Georgia, serif; font-size: 24px; font-weight: 700; color: #D9722C; text-align: right; vertical-align: middle;">
                ${params.grandTotal}
              </td>
            </tr>
            <tr>
              <td colspan="2" style="font-size: 11px; color: rgba(11, 37, 64, 0.6); padding-top: 6px;">
                Includes all accommodation, selected meal plans, and statutory taxes.
              </td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin-top: 28px;">
          <a href="${params.actionUrl}" class="btn" target="_blank">View Your Stay Activity</a>
        </div>

        <div class="footer">
          <strong>Sky Nest Luxury Hotels &amp; Resorts</strong><br>
          Web Portal: <a href="https://skynest.me/" style="color: #D9722C;">https://skynest.me/</a><br>
          &copy; ${new Date().getFullYear()} Sky Nest Sri Lanka. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;
}

function loginAuthorizationHtml(params: {
  firstName: string;
  otpCode: string;
  actionUrl: string;
  ipAddress: string;
  loginTime: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FDFCFA; color: #0B2540; margin: 0; padding: 40px 20px; }
        .container { max-width: 560px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E5E0D8; padding: 40px 32px; box-shadow: 0 4px 20px rgba(11,37,64,0.04); }
        .logo { font-family: 'Cinzel', Georgia, serif; font-size: 24px; font-weight: 700; letter-spacing: 0.15em; color: #0B2540; text-transform: uppercase; margin-bottom: 24px; }
        .accent-bar { width: 48px; height: 2px; background-color: #D9722C; margin-bottom: 24px; }
        h1 { font-family: 'Cinzel', Georgia, serif; font-size: 20px; font-weight: 600; letter-spacing: 0.05em; color: #0B2540; margin-top: 0; }
        p { font-size: 14px; line-height: 1.6; color: rgba(11, 37, 64, 0.8); margin: 16px 0; }
        .code-box { background: #F8F6F2; border: 1px solid #E5E0D8; padding: 22px; text-align: center; margin: 24px 0; }
        .code-label { font-size: 11px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(11, 37, 64, 0.6); margin-bottom: 8px; }
        .code-val { font-family: monospace; font-size: 34px; font-weight: 700; letter-spacing: 0.25em; color: #D9722C; }
        .btn { display: inline-block; background-color: #0B2540; color: #FFFFFF !important; text-decoration: none; padding: 14px 32px; font-size: 12px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; margin: 18px 0; }
        .meta-table { width: 100%; border-collapse: collapse; font-size: 12px; margin: 16px 0; }
        .meta-table td { padding: 5px 0; color: rgba(11, 37, 64, 0.65); }
        .meta-table td.val { text-align: right; font-weight: 600; color: #0B2540; }
        .footer { border-top: 1px solid #E5E0D8; margin-top: 32px; padding-top: 20px; font-size: 12px; color: rgba(11, 37, 64, 0.5); text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">SKY NEST</div>
        <div class="accent-bar"></div>
        <h1>Authorize Sign-In Request</h1>
        <p>Dear ${params.firstName},</p>
        <p>A sign-in request was initiated for your Sky Nest account. To verify that this was indeed you signing in, please authorize the request below or enter the 6-digit verification code on your screen.</p>
        
        <div class="code-box">
          <div class="code-label">6-Digit Authorization Code</div>
          <div class="code-val">${params.otpCode}</div>
        </div>

        <div style="text-align: center;">
          <a href="${params.actionUrl}" class="btn" target="_blank">Authorize Sign-In Now</a>
        </div>

        <table class="meta-table">
          <tr><td>Request Time</td><td class="val">${params.loginTime}</td></tr>
          <tr><td>IP Address</td><td class="val">${params.ipAddress}</td></tr>
        </table>

        <p style="font-size: 12px; color: rgba(11, 37, 64, 0.6);">
          This authorization code will expire in 10 minutes. If you did not attempt to sign in, someone may be trying to access your account. Please secure your account immediately.
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function contactEnquiryHtml(params: {
  name: string;
  email: string;
  phone?: string;
  department: string;
  sanctuary: string;
  message: string;
}): string {
  const row = (label: string, value: string) =>
    `<div class="detail-row"><strong>${label}:</strong> ${escapeHtml(value)}</div>`;
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
        .detail-box { background: #F8F6F2; border: 1px solid #E5E0D8; padding: 18px 20px; margin: 20px 0; }
        .detail-row { font-size: 13px; color: rgba(11, 37, 64, 0.85); margin: 6px 0; line-height: 1.5; }
        .message { font-size: 14px; line-height: 1.7; color: rgba(11, 37, 64, 0.85); white-space: pre-wrap; border-left: 2px solid #D9722C; padding-left: 16px; margin: 20px 0; }
        .footer { border-top: 1px solid #E5E0D8; margin-top: 32px; padding-top: 20px; font-size: 12px; color: rgba(11, 37, 64, 0.5); }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">SKY NEST</div>
        <div class="accent-bar"></div>
        <h1>New Concierge Enquiry</h1>
        <div class="detail-box">
          ${row('From', params.name)}
          ${row('Email', params.email)}
          ${row('Phone', params.phone || 'Not provided')}
          ${row('Department', params.department)}
          ${row('Sanctuary', params.sanctuary)}
        </div>
        <div class="message">${escapeHtml(params.message)}</div>
        <div class="footer">Reply to this email to respond directly to the guest.</div>
      </div>
    </body>
    </html>
  `;
}

interface EmailPayload {
  from: string;
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
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
      ...(payload.replyTo ? { replyTo: payload.replyTo } : {}),
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
      ...(payload.replyTo ? { replyTo: payload.replyTo } : {}),
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

// ── Console Provider (Local Dev / Fallback) ─────────────────────────

class ConsoleProvider implements EmailProvider {
  readonly name = 'Console';

  async send(payload: EmailPayload): Promise<boolean> {
    console.log(`[ConsoleProvider] Dispatched email to ${payload.to} | Subject: "${payload.subject}"`);
    return true;
  }
}

// ── Failover / Composite Provider (GoF Chain of Responsibility) ─────

class FailoverEmailProvider implements EmailProvider {
  readonly name: string;

  constructor(
    private readonly primary: EmailProvider,
    private readonly fallback?: EmailProvider
  ) {
    this.name = fallback ? `${primary.name} with ${fallback.name} Fallback` : primary.name;
  }

  async send(payload: EmailPayload): Promise<boolean> {
    try {
      const primarySuccess = await this.primary.send(payload);
      if (primarySuccess) return true;
      console.warn(`[FailoverEmailProvider] ⚠️ Primary provider (${this.primary.name}) did not succeed.`);
    } catch (err: any) {
      console.warn(`[FailoverEmailProvider] ⚠️ Primary provider (${this.primary.name}) failed:`, err.message);
    }

    if (this.fallback) {
      console.log(`[FailoverEmailProvider] 🔄 Primary (${this.primary.name}) is done or unavailable. Failing over to ${this.fallback.name}...`);
      try {
        const fallbackSuccess = await this.fallback.send(payload);
        if (fallbackSuccess) {
          console.log(`[FailoverEmailProvider] ✅ Email successfully delivered via fallback (${this.fallback.name})`);
          return true;
        }
      } catch (err: any) {
        console.error(`[FailoverEmailProvider] ❌ Fallback provider (${this.fallback.name}) failed:`, err.message);
      }
    }

    return false;
  }
}

// ── Email Service (Strategy Facade) ─────────────────────────────────

export class EmailService {
  private provider: EmailProvider;

  constructor() {
    if (env.EMAIL_PROVIDER === 'resend') {
      const resendProvider = new ResendProvider(env.RESEND_API_KEY!);

      // Standby SMTP Fallback if SMTP credentials are configured
      let smtpFallback: SmtpProvider | undefined;
      if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
        smtpFallback = new SmtpProvider({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT || 465,
          secure: env.SMTP_SECURE as boolean | undefined,
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        });
      }

      this.provider = new FailoverEmailProvider(resendProvider, smtpFallback);
      console.log(`[EmailService] Active strategy: ${this.provider.name}`);
    } else if (env.EMAIL_PROVIDER === 'smtp') {
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
    } else {
      console.log('[EmailService] Using Console provider (local development/mock)');
      this.provider = new ConsoleProvider();
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
      console.log(`
======================================================`);
      console.log(`[SKY NEST EMAIL] Guest Verification Email (${this.provider.name})`);
      console.log(`Recipient: ${params.to}`);
      console.log(`Action URL: ${actionUrl}`);
      console.log(`======================================================
`);
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
      console.log(`
======================================================`);
      console.log(`[SKY NEST EMAIL] Staff Invitation Email (${this.provider.name})`);
      console.log(`Recipient: ${params.to}`);
      console.log(`Role: ${params.role}, Branch: ${params.branchName ?? 'Headquarters'}`);
      console.log(`Action URL: ${actionUrl}`);
      console.log(`======================================================
`);
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

  async sendGuestLoginNotificationEmail(params: {
    to: string;
    firstName: string;
    ipAddress: string;
    loginTime: Date;
  }): Promise<boolean> {
    const activityUrl = `${env.APP_URL}/dashboard/activity`;
    const formattedTime = params.loginTime.toUTCString();

    if (env.NODE_ENV !== 'production') {
      console.log(`
======================================================`);
      console.log(`[SKY NEST EMAIL] Guest Login Notification (${this.provider.name})`);
      console.log(`Recipient: ${params.to}`);
      console.log(`Time: ${formattedTime} | IP: ${params.ipAddress}`);
      console.log(`======================================================
`);
    }

    try {
      return await this.provider.send({
        from: env.EMAIL_FROM,
        to: params.to,
        subject: 'Security Alert: New Sign-in to Your Sky Nest Account',
        html: guestLoginNotificationHtml({
          firstName: params.firstName,
          loginTime: formattedTime,
          ipAddress: params.ipAddress,
          activityUrl,
        }),
      });
    } catch (err: any) {
      console.warn(`[EmailService] Failed to send guest login alert via ${this.provider.name}:`, err.message);
      return false;
    }
  }

  async sendBookingConfirmationEmail(params: {
    to: string;
    guestName: string;
    branchName: string;
    bookingRef: string;
    stayDates: string;
    duration: string;
    roomName?: string;
    roomRate?: string;
    roomSubtotal?: string;
    grandTotal?: string;
  }): Promise<boolean> {
    const actionUrl = `${env.APP_URL}/dashboard/activity`;
    try {
      return await this.provider.send({
        from: env.EMAIL_FROM,
        to: params.to,
        subject: `Reservation Confirmed: ${params.branchName} (Ref: ${params.bookingRef.substring(0, 8)})`,
        html: bookingConfirmationHtml({
          guestName: params.guestName,
          branchName: params.branchName,
          bookingRef: params.bookingRef,
          stayDates: params.stayDates,
          duration: params.duration,
          roomName: params.roomName || 'Room 101 (Standard Room)',
          roomRate: params.roomRate || '$120.00 / night',
          roomSubtotal: params.roomSubtotal || '$240.00',
          grandTotal: params.grandTotal || '$322.51',
          actionUrl,
        }),
      });
    } catch (err: any) {
      console.warn('[EmailService] Failed to send booking confirmation:', err.message);
      return false;
    }
  }

  async sendLoginAuthorizationEmail(params: {
    to: string;
    firstName: string;
    otpCode: string;
    actionUrl: string;
    ipAddress: string;
    loginTime: Date;
  }): Promise<boolean> {
    const formattedTime = params.loginTime.toUTCString();

    if (env.NODE_ENV !== 'production') {
      console.log(`\n======================================================`);
      console.log(`[SKY NEST EMAIL] Sign-in Authorization Code: ${params.otpCode}`);
      console.log(`Recipient: ${params.to} | IP: ${params.ipAddress}`);
      console.log(`Action URL: ${params.actionUrl}`);
      console.log(`======================================================\n`);
    }

    try {
      return await this.provider.send({
        from: env.EMAIL_FROM,
        to: params.to,
        subject: `Verify Your Sign-In (Code: ${params.otpCode}) — Sky Nest`,
        html: loginAuthorizationHtml({
          firstName: params.firstName,
          otpCode: params.otpCode,
          actionUrl: params.actionUrl,
          ipAddress: params.ipAddress,
          loginTime: formattedTime,
        }),
      });
    } catch (err: any) {
      console.warn('[EmailService] Failed to send login authorization email:', err.message);
      return false;
    }
  }

  async sendContactEnquiryEmail(params: {
    to: string;
    name: string;
    email: string;
    phone?: string;
    department: string;
    sanctuary: string;
    message: string;
  }): Promise<boolean> {
    try {
      return await this.provider.send({
        from: env.EMAIL_FROM,
        to: params.to,
        replyTo: params.email,
        subject: `New enquiry: ${params.department} — ${params.name}`.replace(/[\r\n]+/g, ' '),
        html: contactEnquiryHtml(params),
      });
    } catch (err: any) {
      console.warn('[EmailService] Failed to send contact enquiry:', err.message);
      return false;
    }
  }
}

export const emailService = new EmailService();

