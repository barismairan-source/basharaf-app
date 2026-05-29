import { redirect } from 'next/navigation';

/**
 * Phase 1 placeholder:
 * The root path redirects to /login. In Phase 4, middleware.ts will
 * handle this routing based on auth state (logged-in → /dashboard,
 * anonymous → /login).
 */
export default function HomePage() {
  redirect('/login');
}
