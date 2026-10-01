import type { JWTPayload } from './jwt';
import { canAccessSection, canAccessHr, canDo, type SectionKey, type CapabilityKey } from './permissions';
import { ForbiddenError, requireSession } from './session';

/**
 * گاردهای دسترسی سمت API — همان قوانینی که middleware برای صفحه‌ها اعمال
 * می‌کند، حالا برای داده هم اعمال می‌شوند (middleware عمداً /api را رد می‌کند).
 *
 * قانون محدوده‌ی شعبه: هر نقش غیر SuperAdmin فقط داده‌ی شعبه‌ی خودش را می‌بیند.
 * قبلاً بیشتر routeها فقط `role === 'BranchUser'` را محدود می‌کردند و نقش‌های
 * Chef/Warehouse (که هر دو به یک شعبه وصل‌اند) همه‌ی شعب را می‌دیدند.
 */

type Session = Pick<JWTPayload, 'role' | 'branchId' | 'permissions'>;

export function assertSection(session: Session, section: SectionKey): void {
  const ok = section === 'hr' ? canAccessHr(session) : canAccessSection(session, section);
  if (!ok) throw new ForbiddenError();
}

/** حداقل یکی از بخش‌ها لازم است (مثلاً فهرست صندوق‌ها هم در «صندوق‌ها» هم در «تراکنش‌ها» لازم است). */
export function assertAnySection(session: Session, sections: SectionKey[]): void {
  if (!sections.some((s) => (s === 'hr' ? canAccessHr(session) : canAccessSection(session, s)))) {
    throw new ForbiddenError();
  }
}

export function assertCan(session: Session, cap: CapabilityKey): void {
  if (!canDo(session, cap)) throw new ForbiddenError();
}

export function assertCanAny(session: Session, caps: CapabilityKey[]): void {
  if (!caps.some((c) => canDo(session, c))) throw new ForbiddenError();
}

/** requireSession + چک بخش، در یک قدم. */
export async function requireSection(section: SectionKey): Promise<JWTPayload> {
  const session = await requireSession();
  assertSection(session, section);
  return session;
}

/**
 * شعبه‌ای که داده‌ی این کاربر به آن محدود است:
 * - SuperAdmin → null (بدون محدودیت؛ فیلتر اختیاری خودِ درخواست اعمال می‌شود)
 * - بقیه → branchId خودشان؛ اگر شعبه ندارند، دسترسی به داده‌ی شعبه‌ای ندارند.
 */
export function branchScope(session: Session): string | null {
  if (session.role === 'SuperAdmin') return null;
  if (!session.branchId) throw new ForbiddenError();
  return session.branchId;
}

/** آیا این کاربر مجاز به دیدن/نوشتن داده‌ی این شعبه است؟ */
export function canUseBranch(session: Session, branchId: string | null | undefined): boolean {
  if (session.role === 'SuperAdmin') return true;
  return !!session.branchId && branchId === session.branchId;
}

export function assertBranch(session: Session, branchId: string | null | undefined): void {
  if (!canUseBranch(session, branchId)) throw new ForbiddenError();
}
