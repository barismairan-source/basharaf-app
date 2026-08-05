-- ═══════════════════════════════════════════════════════════════════
--  گزارش تشخیصی: حضورهای مشکوک/هم‌پوشان — فاز ۱ یکپارچه‌سازی منابع انسانی
--  این فایل هیچ جدول/ستونی نمی‌سازد یا تغییر نمی‌دهد — فقط SELECT است.
--  جلوگیری واقعی از هم‌پوشانی حضورهای جدید در لایه‌ی API انجام شده
--  (lib/payroll/attendanceEntryHelpers.ts → assertNoAttendanceOverlap)؛
--  این کوئری‌ها فقط برای بررسی رکوردهای *قبلی* (قبل از این فیکس) هستند.
--  read-only — امن برای اجرا روی production بدون هیچ ریسکی.
-- ═══════════════════════════════════════════════════════════════════

-- ۱) کارمند+روزهایی که بیش از یک رکورد حضور «کاری» دارند (present/holiday_work/off_day_work)
--    این‌ها کاندیدهای هم‌پوشانی‌اند — تشخیص دقیق (بازه‌ی زمانی) فقط در اپلیکیشن
--    ممکن است (به snapshot تخصیص شیفت نیاز دارد)، ولی این کوئری برای شروع بررسی کافی است.
SELECT
  ae.employee_id,
  e.full_name,
  ae.work_date,
  COUNT(*) AS entry_count,
  array_agg(ae.id) AS entry_ids,
  array_agg(ae.status) AS statuses,
  array_agg(ae.shift_assignment_id) AS shift_assignment_ids
FROM attendance_entries ae
JOIN employees e ON e.id = ae.employee_id
WHERE ae.attendance_type IN ('present', 'holiday_work', 'off_day_work')
GROUP BY ae.employee_id, e.full_name, ae.work_date
HAVING COUNT(*) > 1
ORDER BY ae.work_date DESC;

-- ۲) رکوردهای «حضور بدون شیفت» (شیفت‌متصل=null) که هم‌زمان یک شیفت
--    برنامه‌ریزی‌شده‌ی فعال هم برای همان کارمند/روز وجود دارد — کاندید قوی
--    برای همان الگوی باگ که در تصویر کاربر دیده شد.
SELECT
  ae.id AS attendance_id, ae.employee_id, e.full_name, ae.work_date, ae.status,
  esa.id AS existing_assignment_id, esa.planned_start_time, esa.planned_end_time
FROM attendance_entries ae
JOIN employees e ON e.id = ae.employee_id
JOIN employee_shift_assignments esa
  ON esa.employee_id = ae.employee_id AND esa.work_date = ae.work_date AND esa.status = 'scheduled'
WHERE ae.shift_assignment_id IS NULL
  AND ae.attendance_type IN ('present', 'holiday_work', 'off_day_work')
ORDER BY ae.work_date DESC;

-- ۳) نرخ‌های ساعتی هم‌پوشان (نباید اتفاق بیفتد — API از این جلوگیری می‌کند، ولی دفاعی بررسی شود)
SELECT a.employee_id, a.id AS rate_a, b.id AS rate_b, a.effective_from AS a_from, a.effective_to AS a_to, b.effective_from AS b_from, b.effective_to AS b_to
FROM employee_hourly_rates a
JOIN employee_hourly_rates b ON a.employee_id = b.employee_id AND a.id < b.id
WHERE daterange(a.effective_from, COALESCE(a.effective_to, 'infinity'), '[]')
  && daterange(b.effective_from, COALESCE(b.effective_to, 'infinity'), '[]');

-- ═══════════════════════════════════════════════════════════════════
--  توجه: این فایل عمداً هیچ عملیات اصلاح/حذفی ندارد. رفع هر مورد مشکوک
--  باید دستی و از طریق UI «حضور و غیاب» (ویرایش/حذف/اتصال به شیفت) انجام
--  شود، چون هر مورد ممکن است تصمیم متفاوتی نیاز داشته باشد (کدام رکورد
--  درست است، کدام باید حذف/ادغام شود) — این تصمیم، تصمیم مدیر است، نه کد.
-- ═══════════════════════════════════════════════════════════════════
