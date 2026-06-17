import type { StateCreator } from 'zustand';
import type { User } from '@/types';

/**
 * AuthSlice — فاز ۱۰.
 *
 * تفاوت با فاز ۹:
 * - login مستقیماً به /api/auth/login می‌رود
 * - logout به /api/auth/logout می‌رود
 * - cookie httpOnly است (server-side)، client آن را ست/پاک نمی‌کند
 * - switchUser حذف شده — در production معنی ندارد
 */
export interface AuthSlice {
  user: User | null;
  authLoading: boolean;
  authError: string | null;

  login: (
    email: string,
    password: string,
    remember?: boolean
  ) => Promise<boolean>;

  logout: () => Promise<void>;

  /** legacy stub — برای backwards compat با code فاز ۹ که هنوز import می‌کند */
  switchUser: (userId: string) => Promise<void>;
}

// dependencies دیگر استفاده نمی‌شوند ولی برای حفظ signature، optional شدند
interface AuthSliceDeps {
  findUserByEmail?: (email: string) => Promise<User | null>;
  findUserById?: (id: string) => User | undefined;
}

export const createAuthSlice =
  (_deps: AuthSliceDeps): StateCreator<AuthSlice> =>
  (set) => ({
    user: null,
    authLoading: false,
    authError: null,

    async login(email, password, _remember = true) {
      void _remember; // server خودش maxAge را تعیین می‌کند
      set({ authLoading: true, authError: null });
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
          credentials: 'include',
        });
        const data = (await res.json().catch(() => ({}))) as {
          user?: User;
          error?: string;
        };
        if (!res.ok || !data.user) {
          throw new Error(data.error || 'خطا در ورود');
        }
        set({ user: data.user, authLoading: false, authError: null });
        return true;
      } catch (e) {
        const message = e instanceof Error ? e.message : 'خطای ناشناخته';
        set({ authLoading: false, authError: message });
        return false;
      }
    },

    async logout() {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
        });
      } catch {
        // اگر fetch fail شد، بازهم state را پاک می‌کنیم
      }
      set({ user: null, authError: null });
    },

    async switchUser(_userId) {
      // در فاز ۱۰ این feature غیرفعال است
      void _userId;
      set({
        authError:
          'سوئیچ سریع کاربر در نسخه‌ی production غیرفعال است. ابتدا خروج کنید.',
      });
    },
  });
