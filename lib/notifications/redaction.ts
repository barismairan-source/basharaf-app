/**
 * Error redaction utilities.
 *
 * Strips potential credentials and sensitive values from error messages
 * before storing them in notification_outbox.last_error or returning
 * them to admin UI.
 */

// Patterns that may contain credentials or PII
const REDACT_PATTERNS: RegExp[] = [
  /api[_-]?key[=:\s]+\S+/gi,
  /apikey[=:\s]+\S+/gi,
  /password[=:\s]+\S+/gi,
  // bearer must come before authorization so the token is redacted first,
  // then the header name is also redacted
  /bearer\s+\S+/gi,
  /authorization:\s*\S+/gi,
  /smtp:\/\/[^@]*@/gi,            // smtp://user:pass@
  /:[^:@/\s]{6,}@/g,              // :password@ in URLs
  /\b[A-Za-z0-9+/]{40,}={0,2}\b/g, // long base64 (potential tokens)
];

const MAX_ERROR_LENGTH = 500;

/**
 * Redacts credentials and truncates to a safe length.
 * Returns '[no error]' for null/undefined input.
 */
export function redactError(raw: unknown): string {
  if (raw == null) return '[no error]';

  let msg = raw instanceof Error
    ? raw.message
    : typeof raw === 'string'
      ? raw
      : JSON.stringify(raw);

  for (const pattern of REDACT_PATTERNS) {
    msg = msg.replace(pattern, '[REDACTED]');
  }

  if (msg.length > MAX_ERROR_LENGTH) {
    msg = msg.slice(0, MAX_ERROR_LENGTH) + '…';
  }

  return msg;
}

/**
 * Masks a phone number: 09121234567 → 0912***4567
 */
export function maskPhone(phone: string): string {
  if (phone.length < 7) return '***';
  return phone.slice(0, 4) + '***' + phone.slice(-4);
}

/**
 * Masks an email address: user@example.com → us**@ex*****.com
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***@***';
  const maskedLocal = local.length <= 2 ? local + '*' : local.slice(0, 2) + '**';
  const domainParts = domain.split('.');
  const ext = domainParts.pop() ?? '';
  const domainBase = domainParts.join('.') || '***';
  const maskedDomain = domainBase.length <= 3
    ? domainBase + '***'
    : domainBase.slice(0, 2) + '*'.repeat(Math.min(domainBase.length - 2, 4));
  return `${maskedLocal}@${maskedDomain}.${ext}`;
}
