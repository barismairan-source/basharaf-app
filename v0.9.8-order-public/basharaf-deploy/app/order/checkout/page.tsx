import Link from 'next/link';

export default function OrderCheckoutPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-lg text-stone-800">ثبت سفارش</h1>
      <p className="mt-2 text-[13px] text-stone-500">این بخش به‌زودی تکمیل می‌شود.</p>
      <Link
        href="/order"
        className="mt-6 inline-block text-[13px] text-stone-600 underline-offset-2 hover:underline"
      >
        بازگشت به منو
      </Link>
    </div>
  );
}
