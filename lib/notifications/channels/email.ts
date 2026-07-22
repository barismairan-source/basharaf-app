/**
 * Liara SMTP email adapter — server-only.
 *
 * Uses a singleton transporter (pool=true, maxConnections=3).
 * Never constructed during tests or build — guarded by isEmailConfigured().
 *
 * Required env vars:
 *   MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASSWORD, MAIL_FROM
 * Optional:
 *   MAIL_SECURE (default: port===465)
 *   MAIL_REPLY_TO
 *
 * Privacy contract:
 * - no attachments
 * - no inline resume
 * - no phone numbers or form answers in message body
 * - SMTP errors are redacted before being returned or stored
 */

import nodemailer from 'nodemailer';
import { redactError } from '@/lib/notifications/redaction';
import type { DeliveryResult } from '@/lib/notifications/types';
import type { NotificationEmailData } from '@/lib/notifications/templates';
import { buildNotificationEmail } from '@/lib/notifications/templates';

// ─── Config ─────────────────────────────────────────────────────

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  replyTo?: string;
}

function readConfig(): SmtpConfig | null {
  const host = process.env.MAIL_HOST;
  const portStr = process.env.MAIL_PORT;
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_PASSWORD;
  const from = process.env.MAIL_FROM;

  if (!host || !portStr || !user || !pass || !from) return null;

  const port = parseInt(portStr, 10);
  if (isNaN(port)) return null;

  const secureEnv = process.env.MAIL_SECURE;
  const secure = secureEnv !== undefined
    ? secureEnv === 'true'
    : port === 465;

  return {
    host, port, secure, user, pass, from,
    replyTo: process.env.MAIL_REPLY_TO,
  };
}

/** Returns true when all required SMTP env vars are present. */
export function isEmailConfigured(): boolean {
  return readConfig() !== null;
}

// ─── Singleton transporter ───────────────────────────────────────

let _transporter: nodemailer.Transporter<any> | null = null;

function getTransporter(): nodemailer.Transporter<any> {
  if (_transporter) return _transporter;

  const cfg = readConfig();
  if (!cfg) {
    throw new Error('SMTP not configured — set MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASSWORD, MAIL_FROM');
  }

  _transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
    pool: true,
    maxConnections: 3,
    tls: {
      // never disable certificate verification
      rejectUnauthorized: true,
    },
  });

  return _transporter;
}

// ─── Public API ─────────────���────────────────────────────────────

export interface SendEmailParams {
  to: string;
  data: NotificationEmailData;
}

/**
 * Sends a single notification email.
 * Returns a DeliveryResult — never throws.
 *
 * If SMTP is not configured, returns status='failed' (retryable).
 * The processor will retry on the normal backoff schedule until SMTP is restored.
 * Permanent skips ('skipped') are reserved for missing recipient addresses only.
 */
export async function sendNotificationEmail(
  params: SendEmailParams
): Promise<DeliveryResult> {
  if (!isEmailConfigured()) {
    // Return 'failed' (retryable) — not 'skipped' (permanent).
    // The admin panel SMTP guard prevents enabling email rules without SMTP,
    // so a missing config here means a temporary outage. The processor will retry
    // on the normal backoff schedule until SMTP is restored.
    return { status: 'failed', error: 'SMTP not configured — will retry when available' };
  }

  const cfg = readConfig()!;
  const { subject, text, html } = buildNotificationEmail(params.data);

  try {
    const transport = getTransporter();
    const info = await transport.sendMail({
      from: cfg.from,
      replyTo: cfg.replyTo,
      to: params.to,
      subject,
      text,
      html,
      // No attachments — privacy contract
    });
    return {
      status: 'sent',
      providerMsgId: typeof info.messageId === 'string' ? info.messageId : undefined,
    };
  } catch (err) {
    return {
      status: 'failed',
      error: redactError(err),
    };
  }
}

/**
 * Checks SMTP connectivity without sending any email.
 * Used by the admin SMTP verify endpoint only.
 * Returns { ok: true } or { ok: false, error: string }.
 */
export async function verifySmtpConnection(): Promise<{ ok: boolean; error?: string }> {
  if (!isEmailConfigured()) {
    return { ok: false, error: 'SMTP not configured' };
  }
  try {
    const transport = getTransporter();
    await transport.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: redactError(err) };
  }
}

/** Resets the singleton — used in tests only. */
export function _resetTransporterForTests(): void {
  _transporter = null;
}
