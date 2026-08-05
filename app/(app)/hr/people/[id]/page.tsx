'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, Phone, Clock, ShieldX, FileWarning } from 'lucide-react';
import { Card, CardBody, Tabs, TabPanel, Chip, Empty, InlineNotice, Button, Field, Input, Select } from '@/components/ui';
import { useAppStore } from '@/store';
import { canDo } from '@/lib/auth/permissions';
import { fmt } from '@/lib/utils';
import { resolveActiveHourlyRate } from '@/lib/payroll/attendanceEngine';
import { INSURANCE_STATUS_LABELS } from '@/types';

type DetailTab = 'summary' | 'work' | 'compensation' | 'documents' | 'time' | 'payslips' | 'recruitment' | 'access' | 'history';

interface SourceApplication {
  id: string; firstName: string; lastName: string; phone: string;
  referralSource: string | null; score: number | null; createdAt: string; hiredAt: string | null;
}

interface CompensationChange {
  id: string; fromType: string; toType: string; effectiveFrom: string; reason: string | null; createdAt: string;
}

/** پرونده‌ی ۳۶۰ درجه‌ی یک نفر — خلاصه/اطلاعات همکاری/حقوق و نرخ‌ها/تاریخچه واقعی است؛
 * مدارک/شیفت‌وحضور/فیش‌ها/منبع استخدام/حساب کاربری چون یا زیرساخت‌شان هنوز
 * ساخته نشده (مدارک) یا به فازهای بعدی این یکپارچه‌سازی وابسته‌اند
 * (منبع استخدام→فاز ۷، حساب کاربری→فاز ۸)، فعلاً صادقانه placeholder دارند. */
export default function PersonDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAppStore(s => s.user);
  const employees = useAppStore(s => s.employees);
  const loadEmployees = useAppStore(s => s.loadEmployees);
  const hourlyRatesByEmployee = useAppStore(s => s.hourlyRatesByEmployee);
  const loadHourlyRates = useAppStore(s => s.loadHourlyRates);

  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<DetailTab>('summary');
  const [changes, setChanges] = useState<CompensationChange[] | null>(null);
  const [sourceApplication, setSourceApplication] = useState<SourceApplication | null>(null);

  const employee = employees.find(e => e.id === params.id);
  const todayIso = new Date().toISOString().slice(0, 10);
  const rates = hourlyRatesByEmployee[params.id] ?? [];
  const activeRate = resolveActiveHourlyRate(rates, todayIso);

  useEffect(() => {
    setHydrated(true);
    if (employees.length === 0) loadEmployees('all');
    loadHourlyRates(params.id);
    fetch(`/api/employees/${params.id}/compensation-type`, { credentials: 'include', cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => setChanges(d?.changes ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    if (!employee?.sourceApplicationId) { setSourceApplication(null); return; }
    fetch(`/api/recruitment/${employee.sourceApplicationId}`, { credentials: 'include', cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => setSourceApplication(d?.application ?? null));
  }, [employee?.sourceApplicationId]);

  if (!hydrated || !user) return null;
  if (user.role !== 'SuperAdmin' && user.role !== 'BranchUser') {
    return <div className="p-6"><Card><CardBody><Empty title="دسترسی به این بخش مجاز نیست" icon={ShieldX} /></CardBody></Card></div>;
  }
  if (!employee) {
    return (
      <div className="p-4 lg:p-6 pt-2">
        <div className="max-w-4xl mx-auto">
          <Card><CardBody><Empty title="پرسنل پیدا نشد" icon={ShieldX} /></CardBody></Card>
        </div>
      </div>
    );
  }

  const canViewSensitive = canDo(user, 'hr.people.viewSensitive');

  return (
    <div className="p-4 lg:p-6 pt-2">
      <div className="max-w-4xl mx-auto space-y-4">
        <button onClick={() => router.push('/hr/people')} className="flex items-center gap-1.5 text-[12px] text-muted hover:text-stone-700">
          <ArrowRight size={14} strokeWidth={1.5} /> بازگشت به فهرست افراد
        </button>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[18px] font-medium text-stone-900">{employee.fullName}</h1>
              <Chip tone={employee.isActive ? 'green' : 'neutral'}>{employee.isActive ? 'فعال' : 'غیرفعال'}</Chip>
              <Chip tone={employee.compensationType === 'hourly' ? 'green' : 'amber'}>
                {employee.compensationType === 'hourly' ? 'ساعتی' : 'ماهانه'}
              </Chip>
            </div>
            <div className="text-[12px] text-stone-500 mt-1 flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1"><Phone size={11} strokeWidth={1.5} />{employee.phone}</span>
              {employee.branchName && <span>{employee.branchName}</span>}
            </div>
          </div>
        </div>

        <Tabs value={tab} onChange={setTab} aria-label="بخش‌های پرونده"
          items={[
            { value: 'summary', label: 'خلاصه' },
            { value: 'work', label: 'اطلاعات همکاری' },
            { value: 'compensation', label: 'حقوق و نرخ‌ها' },
            { value: 'documents', label: 'مدارک' },
            { value: 'time', label: 'شیفت و حضور' },
            { value: 'payslips', label: 'فیش‌ها و پرداخت‌ها' },
            { value: 'recruitment', label: 'منبع استخدام' },
            { value: 'access', label: 'حساب کاربری و دسترسی' },
            { value: 'history', label: 'تاریخچه تغییرات' },
          ]} />

        <TabPanel value="summary" active={tab === 'summary'}>
          <Card><CardBody className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-[12.5px]">
              <div><div className="text-muted text-[10.5px] mb-0.5">سمت</div><div className="text-stone-800">{employee.role}</div></div>
              <div><div className="text-muted text-[10.5px] mb-0.5">شعبه</div><div className="text-stone-800">{employee.branchName ?? '—'}</div></div>
              <div><div className="text-muted text-[10.5px] mb-0.5">تاریخ شروع همکاری</div><div className="text-stone-800" dir="ltr">{employee.joinDate}</div></div>
              <div><div className="text-muted text-[10.5px] mb-0.5">وضعیت بیمه</div><div className="text-stone-800">{INSURANCE_STATUS_LABELS[employee.insuranceStatus]}</div></div>
              <div>
                <div className="text-muted text-[10.5px] mb-0.5">نوع حقوق / نرخ فعلی</div>
                <div className="text-stone-800">
                  {employee.compensationType === 'hourly'
                    ? (canViewSensitive ? (activeRate !== null ? `${fmt(activeRate)} تومان/ساعت` : 'بدون نرخ فعال') : '—')
                    : (canViewSensitive ? `${fmt(employee.baseMonthlySalary)} تومان/ماه` : '—')}
                </div>
              </div>
              <div><div className="text-muted text-[10.5px] mb-0.5">شیفت بعدی / وضعیت حضور امروز</div><div className="text-stone-500">در تب «شیفت و حضور»</div></div>
            </div>
            {!canViewSensitive && (
              <InlineNotice tone="info">نرخ/حقوق و اطلاعات حساس دیگر فقط برای مدیر کل نمایش داده می‌شود.</InlineNotice>
            )}
          </CardBody></Card>
        </TabPanel>

        <TabPanel value="work" active={tab === 'work'}>
          <Card><CardBody className="space-y-3 text-[12.5px]">
            <div className="grid grid-cols-2 gap-4">
              <div><div className="text-muted text-[10.5px] mb-0.5">نام پدر</div><div className="text-stone-800">{employee.fatherName ?? '—'}</div></div>
              <div><div className="text-muted text-[10.5px] mb-0.5">جنسیت</div><div className="text-stone-800">{employee.gender ?? '—'}</div></div>
              <div><div className="text-muted text-[10.5px] mb-0.5">وضعیت تأهل</div><div className="text-stone-800">{employee.maritalStatus ?? '—'}</div></div>
              <div><div className="text-muted text-[10.5px] mb-0.5">مخاطب اضطراری</div><div className="text-stone-800">{employee.emergencyContactName ?? '—'} {employee.emergencyContactPhone ? `(${employee.emergencyContactPhone})` : ''}</div></div>
              {canViewSensitive && (
                <>
                  <div><div className="text-muted text-[10.5px] mb-0.5">کد ملی</div><div className="text-stone-800" dir="ltr">{employee.nationalId ?? '—'}</div></div>
                  <div><div className="text-muted text-[10.5px] mb-0.5">شبا</div><div className="text-stone-800" dir="ltr">{employee.iban ?? '—'}</div></div>
                </>
              )}
            </div>
            <div className="text-[11px] text-muted pt-2 border-t border-stone-100">برای ویرایش این اطلاعات، از دکمه‌ی مداد در فهرست «افراد» استفاده کنید.</div>
          </CardBody></Card>
        </TabPanel>

        <TabPanel value="compensation" active={tab === 'compensation'}>
          <Card><CardBody className="space-y-3">
            {!canViewSensitive ? (
              <InlineNotice tone="info">فقط مدیر کل مجاز به مشاهده‌ی نرخ/حقوق است.</InlineNotice>
            ) : employee.compensationType === 'hourly' ? (
              rates.length === 0 ? (
                <div className="text-[12px] text-muted">هنوز نرخی ثبت نشده — از فهرست «افراد» یک نرخ ثبت کنید.</div>
              ) : (
                <div className="space-y-1.5">
                  {rates.map(r => (
                    <div key={r.id} className="flex items-center justify-between text-[12px] bg-stone-50 rounded p-2">
                      <span className="text-stone-600" dir="ltr">{r.effectiveFrom} → {r.effectiveTo ?? 'ادامه‌دار'}</span>
                      <span className="tabular-nums text-stone-800">{fmt(r.hourlyRate)} ت/س</span>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="text-[12.5px] text-stone-700">حقوق پایه‌ی ماهانه: <span className="font-medium tabular-nums">{fmt(employee.baseMonthlySalary)}</span> تومان</div>
            )}
          </CardBody></Card>
        </TabPanel>

        <TabPanel value="documents" active={tab === 'documents'}>
          <Card><CardBody>
            <div className="flex items-center gap-2 text-[12.5px] text-amber-700">
              <FileWarning size={15} strokeWidth={1.5} />
              مدیریت مدارک هنوز ساخته نشده — جدول مربوطه در دیتابیس آماده است ولی رابط کاربری آپلود/مشاهده‌ی مدرک هنوز وجود ندارد.
            </div>
          </CardBody></Card>
        </TabPanel>

        <TabPanel value="time" active={tab === 'time'}>
          <Card><CardBody>
            <div className="text-[12.5px] text-stone-600 mb-2">برای مشاهده و ثبت شیفت/حضور این فرد، از صفحه‌ی «زمان و حضور» استفاده کنید.</div>
            <a href="/hr/time?tab=schedule" className="inline-flex items-center gap-1.5 text-[12.5px] text-accent hover:underline">
              <Clock size={13} strokeWidth={1.5} /> رفتن به زمان و حضور
            </a>
          </CardBody></Card>
        </TabPanel>

        <TabPanel value="payslips" active={tab === 'payslips'}>
          <Card><CardBody>
            <div className="text-[12.5px] text-stone-600">برای مشاهده‌ی فیش‌های این فرد، از صفحه‌ی «حقوق و مزایا» استفاده کنید (فعلاً گزارش مستقیم به‌ازای هر فرد در این تب ساخته نشده).</div>
          </CardBody></Card>
        </TabPanel>

        <TabPanel value="recruitment" active={tab === 'recruitment'}>
          <Card><CardBody>
            {!employee.sourceApplicationId ? (
              <div className="text-[12.5px] text-stone-600">این کارمند از مسیر استخدام یکپارچه ثبت نشده (یا قبل از این قابلیت اضافه شده).</div>
            ) : !sourceApplication ? (
              <div className="text-[12px] text-muted">در حال بارگذاری…</div>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-[12.5px]">
                <div><div className="text-muted text-[10.5px] mb-0.5">نام در درخواست</div><div className="text-stone-800">{sourceApplication.firstName} {sourceApplication.lastName}</div></div>
                <div><div className="text-muted text-[10.5px] mb-0.5">کانال آشنایی</div><div className="text-stone-800">{sourceApplication.referralSource ?? '—'}</div></div>
                <div><div className="text-muted text-[10.5px] mb-0.5">امتیاز</div><div className="text-stone-800">{sourceApplication.score ?? '—'}</div></div>
                <div><div className="text-muted text-[10.5px] mb-0.5">تاریخ درخواست</div><div className="text-stone-800" dir="ltr">{sourceApplication.createdAt.slice(0, 10)}</div></div>
                {sourceApplication.hiredAt && (
                  <div><div className="text-muted text-[10.5px] mb-0.5">تاریخ استخدام</div><div className="text-stone-800" dir="ltr">{sourceApplication.hiredAt.slice(0, 10)}</div></div>
                )}
                <div className="col-span-2">
                  <a href={`/hr/recruitment?status=all`} className="text-accent hover:underline">مشاهده در صفحه‌ی استخدام</a>
                </div>
              </div>
            )}
          </CardBody></Card>
        </TabPanel>

        <TabPanel value="access" active={tab === 'access'}>
          <AccessTab employee={employee} canManage={canDo(user, 'hr.systemAccess.manage')} />
        </TabPanel>

        <TabPanel value="history" active={tab === 'history'}>
          <Card><CardBody>
            {changes === null ? (
              <div className="text-[12px] text-muted">در حال بارگذاری…</div>
            ) : changes.length === 0 ? (
              <div className="text-[12px] text-muted">هنوز تغییری در نوع حقوق ثبت نشده.</div>
            ) : (
              <div className="space-y-1.5">
                {changes.map(c => (
                  <div key={c.id} className="text-[12px] bg-stone-50 rounded p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-stone-700">{c.fromType === 'hourly' ? 'ساعتی' : 'ماهانه'} ← {c.toType === 'hourly' ? 'ساعتی' : 'ماهانه'}</span>
                      <span className="text-muted" dir="ltr">{c.effectiveFrom}</span>
                    </div>
                    {c.reason && <div className="text-muted mt-1">{c.reason}</div>}
                  </div>
                ))}
              </div>
            )}
          </CardBody></Card>
        </TabPanel>
      </div>
    </div>
  );
}

interface SystemUser { id: string; name: string; email: string; role: string; assignedBranch: string | null; isActive: boolean; lastSeen: string | null }

/** تب «حساب کاربری و دسترسی» — اتصال اختیاری به یک حساب کاربری موجود؛ ساخت
 * حساب جدید از همان endpoint موجود مدیریت تیم استفاده می‌کند (بدون تکرار
 * منطق hash رمز عبور). دسترسی نرم‌افزار همیشه مستقل از سمت شغلی می‌ماند. */
function AccessTab({ employee, canManage }: { employee: NonNullable<ReturnType<typeof useAppStore.getState>['employees']>[number]; canManage: boolean }) {
  const showToast = useAppStore(s => s.showToast);
  const branches = useAppStore(s => s.branches);
  const [linkedUser, setLinkedUser] = useState<SystemUser | null>(null);
  const [allUsers, setAllUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'none' | 'link' | 'create'>('none');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [busy, setBusy] = useState(false);

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'SuperAdmin' | 'BranchUser' | 'Warehouse' | 'Chef'>('BranchUser');
  const [newBranchId, setNewBranchId] = useState(employee.branchId ?? '');

  useEffect(() => {
    setLoading(true);
    fetch('/api/users', { credentials: 'include', cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const users: SystemUser[] = d?.users ?? [];
        setAllUsers(users);
        setLinkedUser(employee.userId ? users.find(u => u.id === employee.userId) ?? null : null);
      })
      .finally(() => setLoading(false));
  }, [employee.userId]);

  async function handleUnlink() {
    if (!confirm('اتصال این کارمند به حساب کاربری قطع شود؟ خود حساب کاربری حذف نمی‌شود.')) return;
    setBusy(true);
    const res = await fetch(`/api/employees/${employee.id}/link-user`, { method: 'DELETE', credentials: 'include' });
    setBusy(false);
    showToast(res.ok ? 'اتصال قطع شد' : 'خطا', res.ok ? 'success' : 'danger');
    if (res.ok) setLinkedUser(null);
  }

  async function handleLinkExisting() {
    if (!selectedUserId) return;
    setBusy(true);
    const res = await fetch(`/api/employees/${employee.id}/link-user`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ userId: selectedUserId }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) {
      showToast('حساب متصل شد', 'success');
      setLinkedUser(allUsers.find(u => u.id === selectedUserId) ?? null);
      setMode('none');
    } else {
      showToast(data.error ?? 'خطا در اتصال', 'danger');
    }
  }

  async function handleCreateAndLink() {
    if (!newName.trim() || !newEmail.trim() || newPassword.length < 8) {
      showToast('نام، ایمیل و رمز عبور (حداقل ۸ کاراکتر) الزامی است', 'danger'); return;
    }
    setBusy(true);
    const createRes = await fetch('/api/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ name: newName.trim(), email: newEmail.trim(), password: newPassword, role: newRole, assignedBranchId: newBranchId || null }),
    });
    const createData = await createRes.json();
    if (!createRes.ok || !createData.user?.id) {
      setBusy(false);
      showToast(createData.error ?? 'خطا در ساخت حساب', 'danger');
      return;
    }
    const linkRes = await fetch(`/api/employees/${employee.id}/link-user`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ userId: createData.user.id }),
    });
    setBusy(false);
    if (linkRes.ok) {
      showToast('حساب ساخته و متصل شد', 'success');
      setLinkedUser({ id: createData.user.id, name: newName, email: newEmail, role: newRole, assignedBranch: newBranchId || null, isActive: true, lastSeen: null });
      setMode('none');
    } else {
      showToast('حساب ساخته شد ولی اتصال ناموفق بود — از «اتصال به حساب موجود» استفاده کنید', 'danger');
    }
  }

  const availableUsers = allUsers.filter(u => u.id !== linkedUser?.id);

  if (loading) return <Card><CardBody><div className="text-[12px] text-muted">در حال بارگذاری…</div></CardBody></Card>;

  return (
    <Card><CardBody className="space-y-3">
      {linkedUser ? (
        <div className="space-y-2 text-[12.5px]">
          <div className="flex items-center gap-2"><Chip tone="green">متصل</Chip><span className="font-medium text-stone-800">{linkedUser.name}</span></div>
          <div className="text-stone-600" dir="ltr">{linkedUser.email}</div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div><div className="text-muted text-[10.5px] mb-0.5">نقش سیستم</div><div className="text-stone-800">{linkedUser.role}</div></div>
            <div><div className="text-muted text-[10.5px] mb-0.5">وضعیت</div><div className="text-stone-800">{linkedUser.isActive ? 'فعال' : 'غیرفعال'}</div></div>
          </div>
          {canManage && (
            <Button variant="default" size="sm" onClick={handleUnlink} loading={busy}>قطع اتصال</Button>
          )}
        </div>
      ) : !canManage ? (
        <InlineNotice tone="info">این کارمند به هیچ حساب کاربری‌ای متصل نیست. فقط مدیر کل می‌تواند اتصال ایجاد کند.</InlineNotice>
      ) : mode === 'none' ? (
        <div className="space-y-2">
          <div className="text-[12.5px] text-stone-600 mb-2">این کارمند به هیچ حساب کاربری‌ای متصل نیست.</div>
          <div className="flex gap-2">
            <Button variant="default" size="sm" onClick={() => setMode('link')}>اتصال به حساب موجود</Button>
            <Button variant="primary" size="sm" onClick={() => setMode('create')}>ساخت حساب جدید</Button>
          </div>
        </div>
      ) : mode === 'link' ? (
        <div className="space-y-3">
          <Field label="حساب کاربری موجود">
            <Select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
              <option value="">— انتخاب —</option>
              {availableUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
            </Select>
          </Field>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={handleLinkExisting} loading={busy} disabled={!selectedUserId}>اتصال</Button>
            <Button variant="default" size="sm" onClick={() => setMode('none')}>انصراف</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Field label="نام"><Input value={newName} onChange={e => setNewName(e.target.value)} /></Field>
          <Field label="ایمیل"><Input value={newEmail} onChange={e => setNewEmail(e.target.value)} dir="ltr" /></Field>
          <Field label="رمز عبور (حداقل ۸ کاراکتر)"><Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} dir="ltr" /></Field>
          <Field label="نقش سیستم">
            <Select value={newRole} onChange={e => setNewRole(e.target.value as typeof newRole)}>
              <option value="BranchUser">کاربر شعبه</option>
              <option value="Chef">سرآشپز</option>
              <option value="Warehouse">انباردار</option>
              <option value="SuperAdmin">مدیر کل</option>
            </Select>
          </Field>
          {newRole !== 'SuperAdmin' && (
            <Field label="شعبه">
              <Select value={newBranchId} onChange={e => setNewBranchId(e.target.value)}>
                <option value="">— انتخاب کنید —</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </Field>
          )}
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={handleCreateAndLink} loading={busy}>ساخت و اتصال</Button>
            <Button variant="default" size="sm" onClick={() => setMode('none')}>انصراف</Button>
          </div>
        </div>
      )}
    </CardBody></Card>
  );
}
