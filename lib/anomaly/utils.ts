/** توابع خالص برای محاسبات قوانین کارآگاه — قابل تست بدون DB */

export function isWasteSpike(finalTotal: number, avg30d: number, multiplierPct: number): boolean {
  return avg30d > 0 && finalTotal > avg30d * (multiplierPct / 100);
}

export function isPriceJump(newPrice: number, avg90d: number, jumpPct: number): boolean {
  return avg90d > 0 && ((newPrice - avg90d) / avg90d) * 100 > jumpPct;
}

export function isConsumptionSpike(todayConsumption: number, avg7d: number, multiplierPct: number): boolean {
  return avg7d > 0 && todayConsumption > avg7d * (multiplierPct / 100);
}

export function isOffHours(hourTehran: number, startHour: number, endHour: number): boolean {
  // ساعت غیرعادی: از startHour شب تا endHour صبح
  return hourTehran >= startHour || hourTehran < endHour;
}

export function getTehranHour(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tehran',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(date);
  const h = parts.find((p) => p.type === 'hour')?.value ?? '0';
  return parseInt(h) % 24;
}
