let ctx: AudioContext | null = null;

/**
 * صدای هشدار سفارش جدید — دو بیپ کوتاه با Web Audio API (بدون فایل خارجی).
 * در صورت بلاک‌شدن توسط مرورگر (قبل از تعامل کاربر با صفحه) بی‌صدا نادیده می‌شود.
 */
export function playOrderAlert(): void {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();

    const now = ctx.currentTime;
    for (const offset of [0, 0.18]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.value = 0.0001;
      gain.gain.exponentialRampToValueAtTime(0.2, now + offset + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.16);
    }
  } catch {
    /* بی‌خطر نادیده گرفته شود */
  }
}
