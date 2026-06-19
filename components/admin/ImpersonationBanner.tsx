import { cookies } from 'next/headers';
import { verifyImpersonationToken, IMP_COOKIE } from '@/lib/auth/impersonation';
import { ImpersonationBannerClient } from './ImpersonationBannerClient';

export async function ImpersonationBanner() {
  const token = cookies().get(IMP_COOKIE)?.value;
  if (!token) return null;

  const imp = await verifyImpersonationToken(token);
  if (!imp) return null;

  const roleLabel: Record<string, string> = {
    SuperAdmin: 'مدیر کل',
    BranchUser: 'کاربر شعبه',
    Warehouse: 'انباردار',
    Chef: 'سرآشپز',
  };

  return (
    <>
      {/* spacer so content doesn't go under the fixed banner */}
      <div className="h-10 shrink-0" />
      <ImpersonationBannerClient
        targetName={imp.targetName}
        targetRole={roleLabel[imp.role] ?? imp.role}
      />
    </>
  );
}
