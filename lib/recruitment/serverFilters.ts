import { and, eq, sql, type SQL } from 'drizzle-orm';
import { schema } from '@/lib/db/client';
import type { CandidateFilterState } from './filterCandidates';
import { SEARCH_TRANSLATE_FROM, SEARCH_TRANSLATE_TO, searchTokens, phoneDigitsQuery } from './searchNormalize';

const t = schema.jobApplications;

/** escape برای LIKE — % و _ و \ در متن کاربر حرف عادی هستند. */
function likeEscape(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * شرط‌های SQL فیلترهای فهرست داوطلبان — همه به‌جز وضعیت (status جدا اضافه
 * می‌شود تا شمارش هر تب وضعیت با بقیه‌ی فیلترها روی کل دیتابیس حساب شود).
 */
export function nonStatusConditions(f: CandidateFilterState): SQL[] {
  const conds: SQL[] = [];
  if (f.area !== 'all') conds.push(eq(t.area, f.area));
  if (f.start !== 'all') conds.push(eq(t.startAvailability, f.start));
  if (f.gender !== 'all') conds.push(eq(t.gender, f.gender));
  if (f.shift !== 'all') conds.push(sql`coalesce(${t.shiftAvailability}, '[]'::jsonb) @> ${JSON.stringify([f.shift])}::jsonb`);
  if (f.referral !== 'all') conds.push(eq(t.referralSource, f.referral));
  if (f.hasResume !== 'all') conds.push(eq(t.hasResume, f.hasResume === 'yes'));

  const tokens = searchTokens(f.search);
  if (tokens.length > 0) {
    const hay = sql`lower(translate(${t.firstName} || ' ' || ${t.lastName} || ' ' || ${t.phone}, ${SEARCH_TRANSLATE_FROM}, ${SEARCH_TRANSLATE_TO}))`;
    const textMatch = and(...tokens.map((tok) => sql`${hay} like ${'%' + likeEscape(tok) + '%'} escape '\\'`))!;
    const digits = phoneDigitsQuery(f.search);
    if (digits) {
      const phoneDigits = sql`regexp_replace(translate(${t.phone}, ${SEARCH_TRANSLATE_FROM}, ${SEARCH_TRANSLATE_TO}), '[^0-9]', '', 'g')`;
      conds.push(sql`(${textMatch} or ${phoneDigits} like ${'%' + digits + '%'})`);
    } else {
      conds.push(textMatch);
    }
  }

  for (const [key, val] of Object.entries(f.dynamicFilters)) {
    if (!val || val === 'all') continue;
    // تک‌مقداری (select/radio) یا آرایه (multiselect)
    conds.push(sql`(${t.customFields} ->> ${key} = ${val} or coalesce(${t.customFields} -> ${key}, 'null'::jsonb) @> ${JSON.stringify([val])}::jsonb)`);
  }
  return conds;
}
