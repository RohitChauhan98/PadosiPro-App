import nodemailer from 'nodemailer';
import type { Config } from '../config.js';

export type OtpEmailPurpose = 'verify' | 'login';

export interface Mailer {
  sendOtpEmail(to: string, code: string, purpose: OtpEmailPurpose): Promise<void>;
}

const OTP_VALIDITY_MINUTES = 10;

const COPY: Record<OtpEmailPurpose, { subject: string; lead: string }> = {
  verify: {
    subject: 'Your PadosiPro verification code',
    lead: 'Use this code to verify your email address:',
  },
  login: {
    subject: 'Your PadosiPro sign-in code',
    lead: 'Use this code to finish signing in:',
  },
};

function otpEmailHtml(code: string, purpose: OtpEmailPurpose): string {
  const { lead } = COPY[purpose];
  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;padding:32px;max-width:90%;">
            <tr>
              <td style="font-size:20px;font-weight:bold;color:#18181b;padding-bottom:8px;">PadosiPro</td>
            </tr>
            <tr>
              <td style="font-size:15px;color:#3f3f46;padding-bottom:16px;">
                ${lead}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:16px 0 24px;">
                <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#18181b;background:#f4f4f5;border-radius:8px;padding:12px 24px;">${code}</span>
              </td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#71717a;">
                This code is valid for ${OTP_VALIDITY_MINUTES} minutes. If you did not request it, you can ignore this email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function otpEmailText(code: string, purpose: OtpEmailPurpose): string {
  const { lead } = COPY[purpose];
  return `${lead} ${code}. It is valid for ${OTP_VALIDITY_MINUTES} minutes. If you did not request it, you can ignore this email.`;
}

export function createSmtpMailer(config: Config): Mailer {
  const transport = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: false,
    auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASS } : undefined,
  });

  return {
    async sendOtpEmail(to: string, code: string, purpose: OtpEmailPurpose): Promise<void> {
      await transport.sendMail({
        from: config.SMTP_FROM,
        to,
        subject: COPY[purpose].subject,
        text: otpEmailText(code, purpose),
        html: otpEmailHtml(code, purpose),
      });
    },
  };
}
