/**
 * نقش کاربر — کنترل دسترسی همه چیز روی این تک‌مقدار سوار است.
 *
 * - SuperAdmin: دسترسی به همه شعب، تنظیمات، مدیریت تیم
 * - BranchUser: فقط داده‌های شعبه‌ی تخصیص‌یافته خود را می‌بیند
 * - Warehouse: فقط انبار — بدون قیمت و اطلاعات مالی
 * - Chef: سرآشپز — رسپی، برنامه پخت، food cost، انقضا
 */
export type UserRole = 'SuperAdmin' | 'BranchUser' | 'Warehouse' | 'Chef';

/**
 * Discriminated union: یک SuperAdmin همیشه `assignedBranch === null` دارد،
 * یک BranchUser همیشه یک رشته دارد. این invariant در تایپ تثبیت شده تا
 * هر جای کد که `user.role === 'BranchUser'` چک شود، TypeScript بفهمد
 * `user.assignedBranch` غیر-null است.
 */
export type User =
  | {
      id: string;
      name: string;
      email: string;
      role: 'SuperAdmin';
      assignedBranch: null;
      initials: string;
      lastSeen: string;
      joined: string;
      permissions?: string[] | null;
      isActive?: boolean;
    }
  | {
      id: string;
      name: string;
      email: string;
      role: 'BranchUser';
      assignedBranch: string; // branch.id
      initials: string;
      lastSeen: string;
      joined: string;
      permissions?: string[] | null;
      isActive?: boolean;
    }
  | {
      id: string;
      name: string;
      email: string;
      role: 'Warehouse';
      assignedBranch: string; // branch.id — انباردار به یک شعبه تخصیص می‌یابد
      initials: string;
      lastSeen: string;
      joined: string;
      permissions?: string[] | null;
      isActive?: boolean;
    }
  | {
      id: string;
      name: string;
      email: string;
      role: 'Chef';
      assignedBranch: string; // branch.id — سرآشپز به یک شعبه تخصیص می‌یابد
      initials: string;
      lastSeen: string;
      joined: string;
      permissions?: string[] | null;
      isActive?: boolean;
    };
