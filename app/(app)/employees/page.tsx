'use client';

import { useEffect, useState } from 'react';
import { Users, Plus, Phone, Trash2, Briefcase, ShieldX, Pencil } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, Field, Input, Select, Empty, Chip, JalaliDatePicker } from '@/components/ui';
import { useAppStore } from '@/store';
import { fmt, cn, normalizeDigits } from '@/lib/utils';
import { getTodayJalali, jalaliToDate, dateToJalali } from '@/lib/jalali';
import { EMPLOYEE_ROLE_LABELS, INSURANCE_STATUS_LABELS, DEFAULT_ROLES, type EmployeeRole, type InsuranceStatus } from '@/types';

export default function EmployeesPage() {
  const user = useAppStore(s => s.user);
  const employees = useAppStore(s => s.employees);
  const branches = useAppStore(s => s.branches);
  const loadEmployees = useAppStore(s => s.loadEmployees);
  const createEmployee = useAppStore(s => s.createEmployee);
  const updateEmployee = useAppStore(s => s.updateEmployee);
  const deleteEmployee = useAppStore(s => s.deleteEmployee);
  const getSetting = useAppStore(s => s.getSetting);
  const updateSetting = useAppStore(s => s.updateSetting);
  const showToast = useAppStore(s => s.showToast);

  const [hydrated, setHydrated] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showRoles, setShowRoles] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // سمت‌ها: از تنظیمات (payroll.roles) یا پیش‌فرض
  const rolesRaw = getSetting('payroll.roles', '');
  let roles: { value: string; label: string }[] = DEFAULT_ROLES;
  if (rolesRaw) {
    try { const parsed = JSON.parse(rolesRaw); if (Array.isArray(parsed) && parsed.length) roles = parsed; } catch { /* fallback */ }
  }

  async function addRole() {
    const label = newRole.trim();
    if (!label) return;
    const value = `custom_${Date.now()}`;
    const next = [...roles, { value, label }];
    const ok = await updateSetting('payroll.roles', JSON.stringify(next));
    if (ok) { showToast('سمت اضافه شد', 'success'); setNewRole(''); }
    else showToast('خطا', 'danger');
  }

  async function removeRole(value: string) {
    const next = roles.filter(r => r.value !== value);
    const ok = await updateSetting('payroll.roles', JSON.stringify(next));
    showToast(ok ? 'حذف شد' : 'خطا', ok ? 'success' : 'danger');
  }

  function roleLabel(value: string): string {
    return roles.find(r => r.value === value)?.label ?? EMPLOYEE_ROLE_LABELS[value] ?? value;
  }

  // فرم
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<EmployeeRole>('cook');
  const [branchId, setBranchId] = useState('');
  const [salary, setSalary] = useState('');
  const [joinDate, setJoinDate] = useState(getTodayJalali());
  const [insuranceStatus, setInsuranceStatus] = useState<InsuranceStatus>('uninsured');

  useEffect(() => { setHydrated(true); loadEmployees(); }, [loadEmployees]);

  // اگر از پنل استخدام «تبدیل به پرسنل» آمده باشد، فرم را پیش‌پر و باز کن
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('fromApplicant') === '1') {
      const name = sp.get('fullName') ?? '';
      const ph = sp.get('phone') ?? '';
      resetForm();
      setFullName(name);
      setPhone(ph);
      setShowAdd(true);
      // پاک‌کردن query تا رفرش دوباره فرم را باز نکند
      window.history.replaceState({}, '', '/employees');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!hydrated || !user) return null;
  if (user.role !== 'SuperAdmin') {
    return <div className="p-6"><Card><CardBody><Empty title="فقط مدیر کل به این بخش دسترسی دارد" icon={ShieldX} /></CardBody></Card></div>;
  }

  function resetForm() {
    setEditingId(null);
    setFullName(''); setPhone(''); setRole('cook'); setBranchId('');
    setSalary(''); setJoinDate(getTodayJalali()); setInsuranceStatus('uninsured');
  }

  function openEdit(e: typeof employees[number]) {
    setEditingId(e.id);
    setFullName(e.fullName); setPhone(e.phone); setRole(e.role);
    setBranchId(e.branchId ?? '');
    setSalary(e.baseMonthlySalary ? e.baseMonthlySalary.toLocaleString('en-US') : '');
    // joinDate در DB میلادی است؛ به شمسی برای نمایش
    try {
      setJoinDate(dateToJalali(new Date(e.joinDate)));
    } catch { setJoinDate(getTodayJalali()); }
    setInsuranceStatus(e.insuranceStatus);
    setShowAdd(true);
  }

  async function handleSave() {
    if (!fullName.trim() || !phone.trim()) { showToast('نام و تلفن الزامی است', 'danger'); return; }
    const gregorian = jalaliToDate(joinDate);
    if (!gregorian) { showToast('تاریخ استخدام نامعتبر است', 'danger'); return; }
    setAdding(true);
    const branch = branches.find(b => b.id === branchId);
    const payload = {
      fullName: fullName.trim(), phone: phone.trim(), role,
      branchId: branchId || null, branchName: branch?.name ?? null,
      baseMonthlySalary: salary ? parseInt(salary.replace(/\D/g, ''), 10) || 0 : 0,
      joinDate: gregorian.toISOString().slice(0, 10), insuranceStatus,
    };
    let ok = false;
    if (editingId) {
      ok = await updateEmployee(editingId, payload);
    } else {
      ok = !!(await createEmployee(payload));
    }
    setAdding(false);
    if (ok) { showToast(editingId ? 'ویرایش شد' : 'پرسنل ثبت شد', 'success'); resetForm(); setShowAdd(false); }
    else showToast('خطا در ثبت', 'danger');
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`«${name}» حذف شود؟ (غیرفعال می‌شود، تاریخچه حفظ می‌ماند)`)) return;
    const ok = await deleteEmployee(id);
    showToast(ok ? 'پرسنل حذف شد' : 'خطا در حذف', ok ? 'success' : 'danger');
  }

  const totalSalary = employees.reduce((s, e) => s + e.baseMonthlySalary, 0);

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-medium text-stone-900 tracking-tight">مدیریت پرسنل</h1>
            <div className="text-[12px] text-stone-500 mt-1">
              {employees.length} نفر · مجموع حقوق پایه ماهانه: {fmt(totalSalary)} تومان
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant={showRoles ? 'primary' : 'default'} size="sm" icon={Briefcase} onClick={() => setShowRoles(v => !v)}>مدیریت سمت‌ها</Button>
            <Button variant="primary" size="sm" icon={Plus} onClick={() => { resetForm(); setShowAdd(true); }}>افزودن پرسنل</Button>
          </div>
        </div>

        {/* پنل inline سمت‌ها (داخل لیست، نه modal جدا) */}
        {showRoles && (
          <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
            <div className="text-[12.5px] font-medium text-stone-700 mb-1">سمت‌های شغلی</div>
            <p className="text-[11px] text-stone-500 mb-3">سمت‌ها را اضافه یا حذف کنید — در فرم افزودن پرسنل ظاهر می‌شوند.</p>
            <div className="flex gap-2 mb-3">
              <Input value={newRole} onChange={e => setNewRole(e.target.value)} placeholder="سمت جدید..." />
              <Button variant="primary" size="sm" icon={Plus} onClick={addRole}>افزودن</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {roles.map(r => (
                <span key={r.value} className="inline-flex items-center gap-1.5 bg-white border border-stone-200 rounded-full pr-3 pl-2 py-1 text-[12px] text-stone-700">
                  {r.label}
                  <button onClick={() => removeRole(r.value)} className="text-muted hover:text-rose-600"><Trash2 size={12} strokeWidth={1.5} /></button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* List */}
        {employees.length === 0 ? (
          <Card><CardBody><Empty title="هنوز پرسنلی ثبت نشده" icon={Users} /></CardBody></Card>
        ) : (
          <div className="space-y-2">
            {employees.map(e => (
              <div key={e.id} className="bg-white border border-stone-200 rounded-lg p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 flex-shrink-0">
                  <Briefcase size={16} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13.5px] font-medium text-stone-900">{e.fullName}</span>
                    <Chip tone="neutral">{roleLabel(e.role)}</Chip>
                    {e.branchName && <span className="text-[10.5px] text-muted">{e.branchName}</span>}
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1"><Phone size={11} strokeWidth={1.5} />{e.phone}</span>
                    <span>{INSURANCE_STATUS_LABELS[e.insuranceStatus]}</span>
                  </div>
                </div>
                <div className="text-left flex-shrink-0">
                  <div className="text-[13px] font-medium text-stone-800 tabular-nums">{fmt(e.baseMonthlySalary)}</div>
                  <div className="text-[9.5px] text-muted">تومان / ماه</div>
                </div>
                <button onClick={() => openEdit(e)} className="text-muted hover:text-stone-700 p-1 flex-shrink-0">
                  <Pencil size={14} strokeWidth={1.5} />
                </button>
                <button onClick={() => handleDelete(e.id, e.fullName)} className="text-muted hover:text-rose-600 p-1 flex-shrink-0">
                  <Trash2 size={15} strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={ev => ev.stopPropagation()}>
            <h2 className="text-[16px] font-medium text-stone-900 mb-4">{editingId ? 'ویرایش پرسنل' : 'افزودن پرسنل'}</h2>
            <div className="space-y-3">
              <Field label="نام و نام خانوادگی">
                <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="مثلاً: علی رضایی" />
              </Field>
              <Field label="تلفن">
                <Input value={phone} onChange={e => setPhone(normalizeDigits(e.target.value))} placeholder="۰۹۱۲..." dir="ltr" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="سمت">
                  <Select value={role} onChange={e => setRole(e.target.value as EmployeeRole)}>
                    {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </Select>
                </Field>
                <Field label="شعبه">
                  <Select value={branchId} onChange={e => setBranchId(e.target.value)}>
                    <option value="">— بدون شعبه —</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </Select>
                </Field>
              </div>
              <Field label="حقوق پایه ماهانه (تومان)">
                <Input value={salary} onChange={e => {
                  const n = parseInt(e.target.value.replace(/[^\d]/g, ''), 10) || 0;
                  setSalary(n ? n.toLocaleString('en-US') : '');
                }} placeholder="مثلاً: 16,625,550" dir="ltr" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="تاریخ استخدام">
                  <JalaliDatePicker value={joinDate} onChange={setJoinDate} />
                </Field>
                <Field label="وضعیت بیمه">
                  <Select value={insuranceStatus} onChange={e => setInsuranceStatus(e.target.value as InsuranceStatus)}>
                    {Object.entries(INSURANCE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                </Field>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button variant="primary" onClick={handleSave} loading={adding} icon={editingId ? Pencil : Plus}>{editingId ? 'ذخیره' : 'افزودن'}</Button>
              <Button variant="default" onClick={() => setShowAdd(false)}>لغو</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
