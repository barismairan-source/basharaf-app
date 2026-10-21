/**
 * rpID و origin = نشانی همان صفحه‌ای که کاربر باز کرده. اول از سرآیند Origin که مرورگر
 * روی هر POST می‌فرستد (پشت پراکسی لیارا Host ممکن است نشانی داخلی باشد)، وگرنه Host.
 * جعل این مقدار از بیرون مرورگر کمکی نمی‌کند: امضای passkey به هش همان rpID بسته است.
 */
export function relyingPartyFrom(req: Request): { rpID: string; origin: string } {
  const originHeader = req.headers.get('origin');
  if (originHeader && originHeader !== 'null') {
    try {
      const u = new URL(originHeader);
      if (u.protocol === 'https:' || (u.protocol === 'http:' && isLocalHost(u.hostname))) {
        return { rpID: u.hostname, origin: u.origin };
      }
    } catch { /* مقدار نامعتبر — پایین از Host */ }
  }
  const host = (req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? new URL(req.url).host).split(',')[0]!.trim();
  const hostname = host.replace(/:\d+$/, '');
  const proto = isLocalHost(hostname) ? (req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'http') : 'https';
  return { rpID: hostname, origin: `${proto}://${host}` };
}

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname.endsWith('.localhost');
}
