import type { NotificationType } from '@/types';

export type OutboxChannel = 'sms' | 'email';

export type OutboxStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'dead' | 'skipped';

export interface NotifyAdminsParams {
  ruleKey: string;
  type: NotificationType;
  title: string;
  /**
   * Short summary — minimal content for delivery.
   * Includes name and area label only; never phone, email, resume, answers,
   * or other extra sensitive fields.
   * Note: applicant name IS personal information; it is included because it is
   * the minimum needed to identify the event. No additional PII is included.
   */
  sub: string;
  actionUrl?: string | null;
  entityId?: string | null;
  txId?: string | null;
  priority?: number;
  /**
   * Optional stable key for events without entityId.
   * Priority: idempotencyKey ?? entityId ?? crypto.randomUUID()
   * When provided, repeated calls with the same key deduplicate for the same recipient+channel.
   * Two independent calls without a stable key each get a unique UUID and are treated as separate events.
   */
  idempotencyKey?: string;
  /**
   * The branch this event belongs to, if any. Powers 'event_branch' audience
   * targeting (lib/notifications/audience.ts) — a SuperAdmin can configure a
   * rule to notify only users assigned to the branch where the event happened.
   * null/undefined for branch-agnostic events (e.g. recruitment applications).
   */
  branchId?: string | null;
}

export interface NotifyAdminsChannelOptions {
  /**
   * Declares that this event type supports SMS delivery.
   * Defaults to true — DB rule.smsEnabled controls whether it's actually sent.
   * Pass false to permanently disable SMS for this event type regardless of rule settings.
   */
  sms?: boolean;
  /**
   * Declares that this event type supports email delivery.
   * Defaults to true — DB rule.emailEnabled + SMTP config controls whether it's actually sent.
   * Pass false to permanently disable email for this event type regardless of rule settings.
   */
  email?: boolean;
}

export interface OutboxPayload {
  /** Routing only */
  ruleKey:   string;
  entityId:  string | null;
  /**
   * Content for delivery — minimal information required for the message body.
   * Never contains phone numbers, email addresses, resume data, or form answers.
   * Note: title/sub may include applicant name (minimal PII for delivery).
   */
  title:     string;
  sub:       string;
  actionUrl: string | null;
}

export interface RetrySchedule {
  attempts: number;
  maxAttempts: number;
  /** Returns the delay in milliseconds for the given attempt number (1-based) */
  delayMs(attempt: number): number;
  /** Returns Date for the next attempt, or null if attempts >= max */
  nextAttemptAt(attempts: number): Date | null;
}

export interface DeliveryResult {
  status: 'sent' | 'failed' | 'skipped';
  providerMsgId?: string;
  error?: string;
  /** True when the channel's daily cap was hit — processor schedules next-day retry */
  capExceeded?: boolean;
}
