import { BlockList, isIP } from 'node:net';

/**
 * IP عمومی درخواست برای «ثبت حضور فقط از اینترنت مغازه».
 *
 * این تصمیم امنیتی است، پس سخت‌گیرتر از getClientIp (که فقط برای rate limit است):
 * - IP از بدنه/پارامتر/سرآیند دلخواه گرفته نمی‌شود؛ فقط از سرآیندهای پراکسی لیارا.
 * - از X-Forwarded-For فقط از سمت راست خوانده می‌شود: نشانی‌های داخلی/خصوصی (پراکسی‌های
 *   داخلی لیارا یا خود Next.js که وقتی این سرآیند نیست نشانی سوکت را در آن می‌گذارد) رد
 *   می‌شوند و اولین نشانی عمومی همان است که پراکسی مورد اعتماد اضافه کرده. مقدار سمت چپ
 *   را کلاینت می‌تواند بنویسد و هرگز استفاده نمی‌شود.
 * - x-real-ip داخلی/خصوصی هم نادیده گرفته می‌شود (نشانی پراکسی است، نه کاربر).
 * - اگر هر دو سرآیند نشانی عمومی دارند ولی با هم نمی‌خوانند، یعنی یکی را کلاینت نوشته
 *   و پراکسی بازنویسی نکرده — ثبت رد می‌شود.
 * رفتار واقعی پراکسی لیارا باید یک بار بعد از انتشار با صفحه‌ی «IP من» تأیید شود
 * (project-docs/ATTENDANCE-CLOCK.md).
 */
export type ClockIpResult =
  | { ok: true; ip: string; realIp: string | null; forwardedIp: string | null }
  | { ok: false; reason: 'missing' | 'mismatch' | 'invalid'; realIp: string | null; forwardedIp: string | null };

export function resolveClockIp(headers: Headers): ClockIpResult {
  const realRaw = headers.get('x-real-ip')?.trim() || null;
  const realNorm = realRaw ? normalizeIp(realRaw) : null;
  if (realRaw && !realNorm) return { ok: false, reason: 'invalid', realIp: realRaw, forwardedIp: null };
  const realIp = realNorm && isPublicIp(realNorm) ? realNorm : null;

  let forwardedIp: string | null = null;
  const forwardedRaw = headers.get('x-forwarded-for');
  if (forwardedRaw) {
    const parts = forwardedRaw.split(',').map((p) => p.trim()).filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i--) {
      const ip = normalizeIp(parts[i]!);
      if (!ip) return { ok: false, reason: 'invalid', realIp, forwardedIp: parts[i]! };
      if (isPublicIp(ip)) { forwardedIp = ip; break; }
    }
  }

  if (realIp && forwardedIp && realIp !== forwardedIp) {
    return { ok: false, reason: 'mismatch', realIp, forwardedIp };
  }
  const ip = realIp ?? forwardedIp;
  if (!ip) return { ok: false, reason: 'missing', realIp: null, forwardedIp: null };
  return { ok: true, ip, realIp, forwardedIp };
}

export function isPublicIp(ip: string): boolean {
  const family = isIP(ip);
  if (family !== 4 && family !== 6) return false;
  return !isNonPublic(ip, family);
}

/** شکل استاندارد IP؛ IPv4-mapped IPv6 (::ffff:1.2.3.4) به IPv4 تبدیل می‌شود. نامعتبر → null */
export function normalizeIp(raw: string): string | null {
  let s = raw.trim();
  // «[::1]:443» یا «1.2.3.4:5678» — بعضی پراکسی‌ها پورت را هم می‌گذارند
  const bracket = /^\[([^\]]+)\](?::\d+)?$/.exec(s);
  if (bracket) s = bracket[1]!;
  else if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(s)) s = s.slice(0, s.lastIndexOf(':'));
  const mapped = /^::ffff:(\d{1,3}(\.\d{1,3}){3})$/i.exec(s);
  if (mapped) s = mapped[1]!;
  const family = isIP(s);
  if (family === 4) return s;
  if (family === 6) return s.toLowerCase();
  return null;
}

export interface ParsedCidr { ip: string; prefix: number; family: 4 | 6; canonical: string }

/**
 * ورودی مدیر: یک IP («1.2.3.4») یا بازه («1.2.3.0/29»). بازه‌های خیلی بزرگ رد می‌شوند
 * تا با یک اشتباه تایپی کل اینترنت یک سرویس‌دهنده مجاز نشود.
 */
export function parseCidr(input: string): { ok: true; value: ParsedCidr } | { ok: false; error: string } {
  // صفحه‌کلید فارسی ارقام ۰-۹ (و عربی ٠-٩) می‌فرستد؛ نقطه‌ی فارسی «٫» هم رایج است.
  const trimmed = input.trim()
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[٫،]/g, '.');
  const [ipPart, prefixPart, ...rest] = trimmed.split('/');
  if (rest.length > 0 || !ipPart) return { ok: false, error: 'قالب نشانی درست نیست' };
  const ip = normalizeIp(ipPart);
  if (!ip) return { ok: false, error: 'نشانی IP معتبر نیست' };
  const family = isIP(ip) as 4 | 6;
  const max = family === 4 ? 32 : 128;
  const min = family === 4 ? MIN_PREFIX_V4 : MIN_PREFIX_V6;
  let prefix = max;
  if (prefixPart !== undefined) {
    if (!/^\d{1,3}$/.test(prefixPart)) return { ok: false, error: 'عدد بعد از / درست نیست' };
    prefix = Number(prefixPart);
  }
  if (prefix > max) return { ok: false, error: 'عدد بعد از / بیش از حد است' };
  if (prefix < min) {
    return { ok: false, error: `این بازه خیلی بزرگ است (حداقل /${min} برای IPv${family})` };
  }
  if (isNonPublic(ip, family)) {
    return { ok: false, error: 'این نشانی داخلی/خصوصی است (مثل ۱۹۲.۱۶۸…)؛ IP عمومی مغازه را وارد کنید' };
  }
  const canonical = prefix === max ? ip : `${ip}/${prefix}`;
  return { ok: true, value: { ip, prefix, family, canonical } };
}

const MIN_PREFIX_V4 = 24;
const MIN_PREFIX_V6 = 48;

/** آیا IP (نرمال‌شده) داخل یکی از بازه‌ها هست؟ */
export function ipMatchesCidr(ip: string, cidr: string): boolean {
  const parsed = parseCidrLoose(cidr);
  const ipNorm = normalizeIp(ip);
  if (!parsed || !ipNorm) return false;
  const family = isIP(ipNorm);
  if (family !== parsed.family) return false;
  const list = new BlockList();
  const type = family === 4 ? 'ipv4' : 'ipv6';
  list.addSubnet(parsed.ip, parsed.prefix, type);
  return list.check(ipNorm, type);
}

// برای مقایسه — بدون قواعد «خیلی بزرگ/خصوصی» (آن‌ها فقط هنگام ذخیره اعمال می‌شوند).
function parseCidrLoose(cidr: string): { ip: string; prefix: number; family: 4 | 6 } | null {
  const [ipPart, prefixPart] = cidr.trim().split('/');
  const ip = ipPart ? normalizeIp(ipPart) : null;
  if (!ip) return null;
  const family = isIP(ip) as 4 | 6;
  const prefix = prefixPart === undefined ? (family === 4 ? 32 : 128) : Number(prefixPart);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > (family === 4 ? 32 : 128)) return null;
  return { ip, prefix, family };
}

const NON_PUBLIC_V4: Array<[string, number]> = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.168.0.0', 16], ['224.0.0.0', 4], ['240.0.0.0', 4],
];
const NON_PUBLIC_V6: Array<[string, number]> = [['::', 127], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8]];

function isNonPublic(ip: string, family: 4 | 6): boolean {
  const list = new BlockList();
  const type = family === 4 ? 'ipv4' : 'ipv6';
  for (const [net, prefix] of family === 4 ? NON_PUBLIC_V4 : NON_PUBLIC_V6) list.addSubnet(net, prefix, type);
  return list.check(ip, type);
}
