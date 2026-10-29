/**
 * نگهبان ایستا برای محدوده‌ی شعبه در routeهای API — ادامه‌ی رفع B1.
 * ممیزی ۲۰۲۶-۱۰-۳۰: ۲۵ route هنوز فقط `role === 'BranchUser'` را محدود می‌کردند و
 * Chef/Warehouse می‌توانستند داده‌ی شعبه‌ی دیگر را ببینند یا تغییر دهند
 * (مثلاً انبارگردانی قلمِ شعبه‌ی دیگر). محدوده باید با branchScope/canUseBranch/assertBranch
 * از lib/auth/apiAccess.ts اعمال شود.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';

const API_DIR = path.resolve(__dirname, '../../app/api');

// استفاده‌هایی که محدوده‌ی شعبه نیستند:
// - users/route.ts: اعتبارسنجی «نقش شعبه‌ای باید شعبه داشته باشد»
// - transactions/[id]/route.ts: حذف تراکنش در انتظارِ خودِ کاربر شعبه (قاعده‌ی مالکیت، نه شعبه)
const ALLOWED = new Set(['users/route.ts', 'transactions/[id]/route.ts']);

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return routeFiles(full);
    return name === 'route.ts' ? [full] : [];
  });
}

describe('routeهای API محدوده‌ی شعبه را فقط برای BranchUser اعمال نمی‌کنند', () => {
  it('هیچ route خارج از فهرست مجاز از `role === \'BranchUser\'` استفاده نمی‌کند', () => {
    const offenders = routeFiles(API_DIR)
      .map((f) => path.relative(API_DIR, f).split(path.sep).join('/'))
      .filter((rel) => !ALLOWED.has(rel))
      .filter((rel) => readFileSync(path.join(API_DIR, rel), 'utf8').includes("role === 'BranchUser'"));
    expect(offenders).toEqual([]);
  });
});
