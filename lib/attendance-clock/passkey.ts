import {
  generateAuthenticationOptions, generateRegistrationOptions,
  verifyAuthenticationResponse, verifyRegistrationResponse,
  type AuthenticationResponseJSON, type AuthenticatorTransportFuture, type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { and, eq, gt } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { ApiError } from '@/lib/api-error';
import { relyingPartyFrom } from './origin';

/**
 * تأیید «صاحب گوشی» با Face ID / اثر انگشت (WebAuthn passkey).
 *
 * سرور هیچ داده‌ی بیومتریکی نمی‌بیند: گوشی خودش صورت/انگشت صاحبش را بررسی می‌کند و
 * فقط یک امضای دیجیتال با کلید خصوصیِ داخل گوشی می‌فرستد؛ اینجا فقط کلید عمومی ذخیره
 * و امضا بررسی می‌شود. passkey همراه کوکی گوشی لازم است (هر دو) — پس اشتراک passkey
 * (مثلاً AirDrop در iOS) به‌تنهایی برای ثبت حضور کافی نیست.
 */

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

async function storeChallenge(deviceId: string, challenge: string): Promise<void> {
  await db.update(schema.attendanceClockDevices)
    .set({ passkeyChallenge: challenge, passkeyChallengeExpiresAt: new Date(Date.now() + CHALLENGE_TTL_MS) })
    .where(eq(schema.attendanceClockDevices.id, deviceId));
}

/**
 * challenge را «یک‌بارمصرف» برمی‌دارد: فقط اگر همان مقدار و منقضی‌نشده باشد پاک می‌شود و
 * true برمی‌گردد؛ دو درخواست هم‌زمان با یک امضا فقط یکی‌شان موفق می‌شود.
 */
async function consumeChallenge(deviceId: string, challenge: string): Promise<boolean> {
  const rows = await db.update(schema.attendanceClockDevices)
    .set({ passkeyChallenge: null, passkeyChallengeExpiresAt: null })
    .where(and(
      eq(schema.attendanceClockDevices.id, deviceId),
      eq(schema.attendanceClockDevices.passkeyChallenge, challenge),
      gt(schema.attendanceClockDevices.passkeyChallengeExpiresAt, new Date()),
    ))
    .returning({ id: schema.attendanceClockDevices.id });
  return rows.length === 1;
}

function challengeFromResponse(clientDataJSON: string): string {
  try {
    const parsed = JSON.parse(isoBase64URL.toUTF8String(clientDataJSON)) as { challenge?: string };
    if (typeof parsed.challenge === 'string') return parsed.challenge;
  } catch { /* بدنه‌ی نامعتبر */ }
  throw new ApiError(400, 'پاسخ Face ID نامعتبر است', 'PASSKEY_INVALID');
}

async function loadDevice(deviceId: string) {
  const [row] = await db.select().from(schema.attendanceClockDevices)
    .where(eq(schema.attendanceClockDevices.id, deviceId)).limit(1);
  if (!row) throw new ApiError(404, 'گوشی پیدا نشد', 'NO_DEVICE');
  return row;
}

// ─── ثبت passkey (یک بار برای هر گوشی؛ تعویض فقط با لینک جدید از مدیر) ───

export async function beginRegistration(req: Request, device: { deviceId: string; employeeName: string }) {
  const row = await loadDevice(device.deviceId);
  if (row.passkeyCredentialId) {
    throw new ApiError(409, 'Face ID برای این گوشی قبلاً فعال شده است.', 'PASSKEY_EXISTS');
  }
  const { rpID } = relyingPartyFrom(req);
  const options = await generateRegistrationOptions({
    rpName: 'ثبت حضور',
    rpID,
    userName: device.employeeName,
    userDisplayName: device.employeeName,
    userID: isoBase64URL.toBuffer(isoBase64URL.fromUTF8String(device.deviceId)),
    attestationType: 'none',
    authenticatorSelection: { authenticatorAttachment: 'platform', residentKey: 'preferred', userVerification: 'required' },
    timeout: 120_000,
  });
  await storeChallenge(device.deviceId, options.challenge);
  return options;
}

export async function finishRegistration(req: Request, deviceId: string, response: RegistrationResponseJSON): Promise<void> {
  const row = await loadDevice(deviceId);
  if (row.passkeyCredentialId) throw new ApiError(409, 'Face ID برای این گوشی قبلاً فعال شده است.', 'PASSKEY_EXISTS');
  const challenge = challengeFromResponse(response.response.clientDataJSON);
  const { rpID, origin } = relyingPartyFrom(req);

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response, expectedChallenge: challenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true,
    });
  } catch {
    throw new ApiError(400, 'فعال‌سازی Face ID تأیید نشد. دوباره امتحان کنید.', 'PASSKEY_FAILED');
  }
  if (!verification.verified) throw new ApiError(400, 'فعال‌سازی Face ID تأیید نشد. دوباره امتحان کنید.', 'PASSKEY_FAILED');
  if (!(await consumeChallenge(deviceId, challenge))) {
    throw new ApiError(400, 'مهلت فعال‌سازی تمام شد. دوباره امتحان کنید.', 'PASSKEY_CHALLENGE');
  }

  const cred = verification.registrationInfo.credential;
  const updated = await db.update(schema.attendanceClockDevices).set({
    passkeyCredentialId: cred.id,
    passkeyPublicKey: isoBase64URL.fromBuffer(cred.publicKey),
    passkeyCounter: cred.counter,
    passkeyTransports: cred.transports ? JSON.stringify(cred.transports) : null,
    passkeyRpId: rpID,
    passkeyRegisteredAt: new Date(),
  }).where(and(eq(schema.attendanceClockDevices.id, deviceId)))
    .returning({ id: schema.attendanceClockDevices.id });
  if (updated.length !== 1) throw new ApiError(500, 'ذخیره‌ی Face ID ناموفق بود', 'PASSKEY_SAVE');
}

// ─── تأیید هر ورود/خروج ───

export async function beginAuthentication(deviceId: string) {
  const row = await loadDevice(deviceId);
  if (!row.passkeyCredentialId || !row.passkeyRpId) {
    throw new ApiError(428, 'اول Face ID را برای این گوشی فعال کنید.', 'PASSKEY_NOT_REGISTERED');
  }
  const options = await generateAuthenticationOptions({
    rpID: row.passkeyRpId,
    allowCredentials: [{ id: row.passkeyCredentialId, transports: parseTransports(row.passkeyTransports) }],
    userVerification: 'required',
    timeout: 120_000,
  });
  await storeChallenge(deviceId, options.challenge);
  return options;
}

/** امضای Face ID را بررسی می‌کند؛ اگر معتبر نبود ApiError می‌اندازد. */
export async function verifyAuthentication(req: Request, deviceId: string, response: AuthenticationResponseJSON): Promise<void> {
  const row = await loadDevice(deviceId);
  if (!row.passkeyCredentialId || !row.passkeyPublicKey || !row.passkeyRpId) {
    throw new ApiError(428, 'اول Face ID را برای این گوشی فعال کنید.', 'PASSKEY_NOT_REGISTERED');
  }
  if (response.id !== row.passkeyCredentialId) {
    throw new ApiError(403, 'Face ID این گوشی با ثبت قبلی نمی‌خواند.', 'PASSKEY_MISMATCH');
  }
  const challenge = challengeFromResponse(response.response.clientDataJSON);
  const { origin } = relyingPartyFrom(req);

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: row.passkeyRpId,
      credential: {
        id: row.passkeyCredentialId,
        publicKey: isoBase64URL.toBuffer(row.passkeyPublicKey),
        counter: Number(row.passkeyCounter),
        transports: parseTransports(row.passkeyTransports),
      },
      requireUserVerification: true,
    });
  } catch {
    throw new ApiError(403, 'تأیید Face ID انجام نشد. دوباره امتحان کنید.', 'PASSKEY_FAILED');
  }
  if (!verification.verified || !verification.authenticationInfo.userVerified) {
    throw new ApiError(403, 'تأیید Face ID انجام نشد. دوباره امتحان کنید.', 'PASSKEY_FAILED');
  }
  if (!(await consumeChallenge(deviceId, challenge))) {
    throw new ApiError(400, 'مهلت تأیید تمام شد یا قبلاً استفاده شده. دوباره بزنید.', 'PASSKEY_CHALLENGE');
  }
  await db.update(schema.attendanceClockDevices)
    .set({ passkeyCounter: verification.authenticationInfo.newCounter })
    .where(eq(schema.attendanceClockDevices.id, deviceId));
}

function parseTransports(raw: string | null): AuthenticatorTransportFuture[] | undefined {
  if (!raw) return undefined;
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as AuthenticatorTransportFuture[]) : undefined;
  } catch {
    return undefined;
  }
}
