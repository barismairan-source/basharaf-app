'use client';

import { useEffect, useState } from 'react';
import { ClipboardList, Plus, RefreshCw, Check, Settings2 } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, Field, Input, Select, Empty, Chip, Switch, SegFilter, JalaliDatePicker } from '@/components/ui';
import { useAppStore } from '@/store';
import { getTodayJalali } from '@/lib/jalali';
import { toFa, formatNumericInputValue } from '@/lib/utils';
import type { TaskFrequency, TaskStatus, UserRole } from '@/types';

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'در انتظار',
  done: 'انجام‌شده',
  skipped: 'رد شده',
};

const STATUS_TONES: Record<TaskStatus, 'amber' | 'green' | 'neutral'> = {
  pending: 'amber',
  done: 'green',
  skipped: 'neutral',
};

const FREQ_LABELS: Record<TaskFrequency, string> = {
  daily: 'روزانه',
  weekly: 'هفتگی',
  monthly: 'ماهانه',
};

const ROLE_LABELS: Record<UserRole, string> = {
  SuperAdmin: 'مدیر',
  BranchUser: 'کاربر شعبه',
  Warehouse: 'انباردار',
  Chef: 'سرآشپز',
};

export default function TasksPage() {
  const user = useAppStore(s => s.user);
  const branches = useAppStore(s => s.branches);
  const users = useAppStore(s => s.users);
  const showToast = useAppStore(s => s.showToast);

  const tasks = useAppStore(s => s.tasks);
  const tasksLoaded = useAppStore(s => s.tasksLoaded);
  const tasksError = useAppStore(s => s.tasksError);
  const loadTasks = useAppStore(s => s.loadTasks);
  const generateTodayTasks = useAppStore(s => s.generateTodayTasks);
  const updateTaskInstance = useAppStore(s => s.updateTaskInstance);

  const taskTemplates = useAppStore(s => s.taskTemplates);
  const taskTemplatesError = useAppStore(s => s.taskTemplatesError);
  const loadTaskTemplates = useAppStore(s => s.loadTaskTemplates);
  const createTaskTemplate = useAppStore(s => s.createTaskTemplate);
  const updateTaskTemplate = useAppStore(s => s.updateTaskTemplate);

  const [hydrated, setHydrated] = useState(false);
  const [branchId, setBranchId] = useState('');
  const [date, setDate] = useState('');
  const [mineOnly, setMineOnly] = useState<'all' | 'mine'>('all');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [skippingId, setSkippingId] = useState<string | null>(null);
  const [skipNote, setSkipNote] = useState('');

  const [showTemplates, setShowTemplates] = useState(false);
  const [tplTitle, setTplTitle] = useState('');
  const [tplCategory, setTplCategory] = useState('');
  const [tplRole, setTplRole] = useState<UserRole>('BranchUser');
  const [tplFrequency, setTplFrequency] = useState<TaskFrequency>('daily');
  const [tplMinutes, setTplMinutes] = useState('10');
  const [tplBranchId, setTplBranchId] = useState(''); // '' = همه شعب
  const [addingTpl, setAddingTpl] = useState(false);

  useEffect(() => { setHydrated(true); setDate(getTodayJalali()); }, []);

  useEffect(() => {
    if (user?.role !== 'SuperAdmin' && user?.assignedBranch) setBranchId(user.assignedBranch);
    else if (branches[0] && !branchId) setBranchId(branches[0].id);
  }, [user, branches, branchId]);

  useEffect(() => {
    if (!branchId || !date) return;
    loadTasks({
      branchId,
      date,
      mine: mineOnly === 'mine',
      assignedUserId: mineOnly === 'all' && assignedUserId ? assignedUserId : undefined,
    });
  }, [branchId, date, mineOnly, assignedUserId, loadTasks]);

  useEffect(() => {
    if (user?.role === 'SuperAdmin') loadTaskTemplates();
  }, [user, loadTaskTemplates]);

  if (!hydrated || !user) return null;
  const isAdmin = user.role === 'SuperAdmin';
  const branchUsers = users.filter(u => u.assignedBranch === branchId);

  function branchName(id: string) {
    return branches.find(b => b.id === id)?.name ?? '—';
  }

  function refreshTasks() {
    loadTasks({
      branchId,
      date,
      mine: mineOnly === 'mine',
      assignedUserId: mineOnly === 'all' && assignedUserId ? assignedUserId : undefined,
    });
  }

  async function handleGenerate() {
    if (!branchId) return;
    setGenerating(true);
    const count = await generateTodayTasks(branchId);
    setGenerating(false);
    if (count < 0) {
      showToast(tasksError || 'خطا در ساخت وظایف', 'danger');
      return;
    }
    showToast(count === 0 ? 'وظایف امروز قبلاً ساخته شده بودند' : `${toFa(count)} وظیفه جدید ساخته شد`, 'success');
    refreshTasks();
  }

  async function markStatus(taskId: string, status: TaskStatus, note?: string | null) {
    setBusyId(taskId);
    const result = await updateTaskInstance(taskId, { status, note });
    setBusyId(null);
    if (!result) showToast(tasksError || 'خطا در به‌روزرسانی وظیفه', 'danger');
    if (status === 'skipped') { setSkippingId(null); setSkipNote(''); }
  }

  async function claimTask(taskId: string) {
    setBusyId(taskId);
    const result = await updateTaskInstance(taskId, { assignedUserId: user!.id });
    setBusyId(null);
    if (!result) showToast(tasksError || 'خطا در تخصیص وظیفه', 'danger');
  }

  async function unassignTask(taskId: string) {
    setBusyId(taskId);
    const result = await updateTaskInstance(taskId, { assignedUserId: null });
    setBusyId(null);
    if (!result) showToast(tasksError || 'خطا در تخصیص وظیفه', 'danger');
  }

  async function reassignTask(taskId: string, userId: string) {
    setBusyId(taskId);
    const result = await updateTaskInstance(taskId, { assignedUserId: userId || null });
    setBusyId(null);
    if (!result) showToast(tasksError || 'خطا در تخصیص وظیفه', 'danger');
  }

  async function handleAddTemplate() {
    if (!tplTitle.trim()) return;
    setAddingTpl(true);
    const created = await createTaskTemplate({
      branchId: tplBranchId || null,
      title: tplTitle.trim(),
      category: tplCategory.trim() || undefined,
      assignedRole: tplRole,
      frequency: tplFrequency,
      estimatedMinutes: parseInt(tplMinutes.replace(/\D/g, ''), 10) || 0,
    });
    setAddingTpl(false);
    if (created) {
      showToast('قالب وظیفه اضافه شد', 'success', created.title);
      setTplTitle(''); setTplCategory(''); setTplMinutes('10');
    } else {
      showToast(taskTemplatesError || 'خطا در ثبت قالب وظیفه', 'danger');
    }
  }

  async function toggleTemplateActive(id: string, isActive: boolean) {
    const ok = await updateTaskTemplate(id, { isActive });
    if (!ok) showToast(taskTemplatesError || 'خطا در ویرایش قالب', 'danger');
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-medium text-stone-900 tracking-tight">وظایف روزانه</h1>
            <div className="text-[12px] text-stone-500 mt-1">چک‌لیست روزانه شعبه — شمارش، نظافت و موارد تکراری</div>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Button variant="default" size="sm" icon={Settings2} onClick={() => setShowTemplates(v => !v)}>
                قالب‌های وظیفه
              </Button>
            )}
            <Button variant="primary" size="sm" icon={RefreshCw} loading={generating} onClick={handleGenerate}>
              ساخت وظایف امروز
            </Button>
          </div>
        </div>

        {/* Template management (admin only) */}
        {isAdmin && showTemplates && (
          <Card>
            <CardHeader title="قالب‌های وظیفه" sub="هر قالب طبق بازه‌ی تکرارش، با «ساخت وظایف امروز» نمونه‌سازی می‌شود" />
            <CardBody className="space-y-4">
              {taskTemplates.length > 0 && (
                <div className="space-y-1.5">
                  {taskTemplates.map(t => (
                    <div key={t.id} className="flex flex-wrap items-center gap-3 px-3 py-2 rounded-md bg-stone-50/60">
                      <div className="flex-1 min-w-[140px]">
                        <div className="text-[12.5px] text-stone-800">{t.title}</div>
                        <div className="text-[10.5px] text-muted">
                          {t.category} · {FREQ_LABELS[t.frequency]} · {ROLE_LABELS[t.assignedRole]} · {toFa(t.estimatedMinutes)} دقیقه · {t.branchId ? branchName(t.branchId) : 'همه شعب'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-stone-500">{t.isActive ? 'فعال' : 'غیرفعال'}</span>
                        <Switch checked={t.isActive} onCheckedChange={v => toggleTemplateActive(t.id, v)} aria-label="فعال/غیرفعال" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-100">
                <Field label="عنوان وظیفه">
                  <Input placeholder="مثلاً: شمارش صندوق پایان روز" value={tplTitle} onChange={e => setTplTitle(e.target.value)} />
                </Field>
                <Field label="دسته (اختیاری)">
                  <Input placeholder="مثلاً: مالی" value={tplCategory} onChange={e => setTplCategory(e.target.value)} />
                </Field>
                <Field label="تکرار">
                  <Select value={tplFrequency} onChange={e => setTplFrequency(e.target.value as TaskFrequency)}>
                    <option value="daily">روزانه</option>
                    <option value="weekly">هفتگی</option>
                    <option value="monthly">ماهانه</option>
                  </Select>
                </Field>
                <Field label="نقش مسئول">
                  <Select value={tplRole} onChange={e => setTplRole(e.target.value as UserRole)}>
                    <option value="BranchUser">کاربر شعبه</option>
                    <option value="Warehouse">انباردار</option>
                    <option value="SuperAdmin">مدیر</option>
                  </Select>
                </Field>
                <Field label="زمان تخمینی (دقیقه)">
                  <Input
                    type="text" inputMode="numeric" dir="ltr"
                    value={tplMinutes}
                    onChange={e => setTplMinutes(formatNumericInputValue(e.target))}
                  />
                </Field>
                <Field label="شعبه">
                  <Select value={tplBranchId} onChange={e => setTplBranchId(e.target.value)}>
                    <option value="">همه شعب</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </Select>
                </Field>
              </div>
              <div className="flex justify-end">
                <Button variant="primary" size="sm" icon={Plus} loading={addingTpl} onClick={handleAddTemplate} disabled={!tplTitle.trim()}>
                  افزودن قالب
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardBody className="flex flex-wrap items-end gap-3">
            {isAdmin && (
              <Field label="شعبه" className="w-44">
                <Select value={branchId} onChange={e => setBranchId(e.target.value)}>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </Field>
            )}
            <Field label="تاریخ" className="w-36">
              <JalaliDatePicker value={date} onChange={setDate} />
            </Field>
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] text-stone-500">نمایش</span>
              <SegFilter
                value={mineOnly}
                onChange={setMineOnly}
                options={[
                  { value: 'all', label: 'همه' },
                  { value: 'mine', label: 'کارهای من' },
                ]}
              />
            </div>
            {mineOnly === 'all' && branchUsers.length > 0 && (
              <Field label="مسئول" className="w-40">
                <Select value={assignedUserId} onChange={e => setAssignedUserId(e.target.value)}>
                  <option value="">همه افراد</option>
                  {branchUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </Select>
              </Field>
            )}
          </CardBody>
        </Card>

        {/* List */}
        {tasksLoaded && tasks.length === 0 ? (
          <Card><CardBody><Empty title="برای این فیلتر وظیفه‌ای ثبت نشده" icon={ClipboardList} /></CardBody></Card>
        ) : (
          <Card>
            <CardBody className="p-0">
              {tasks.map(task => (
                <div key={task.id} className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-stone-50 last:border-b-0">
                  <div className="flex-1 min-w-[160px]">
                    <div className="text-[12.5px] text-stone-800">{task.title}</div>
                    <div className="text-[10.5px] text-muted">{task.category} · {toFa(task.estimatedMinutes)} دقیقه</div>
                    {task.note && (
                      <div className="text-[10.5px] text-amber-600 mt-0.5">یادداشت: {task.note}</div>
                    )}
                  </div>

                  <div className="w-36 text-[11.5px] text-center">
                    {task.assignedUserId === user.id ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <Chip tone="neutral">شما</Chip>
                        <button onClick={() => unassignTask(task.id)} className="text-muted hover:text-rose-600 text-[10.5px]">رها کردن</button>
                      </div>
                    ) : task.assignedUserId ? (
                      isAdmin ? (
                        <Select value={task.assignedUserId} onChange={e => reassignTask(task.id, e.target.value)}>
                          <option value="">—</option>
                          {branchUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </Select>
                      ) : (
                        <span className="text-stone-500">{task.assignedUserName ?? '—'}</span>
                      )
                    ) : (
                      <button onClick={() => claimTask(task.id)} disabled={busyId === task.id} className="text-stone-600 hover:text-stone-900 underline">
                        تخصیص به من
                      </button>
                    )}
                  </div>

                  <Chip tone={STATUS_TONES[task.status]}>{STATUS_LABELS[task.status]}</Chip>

                  <div className="flex items-center gap-1.5">
                    {task.status !== 'done' && (
                      <Button variant="success" size="sm" icon={Check} loading={busyId === task.id} onClick={() => markStatus(task.id, 'done')}>
                        انجام شد
                      </Button>
                    )}
                    {task.status === 'pending' && skippingId !== task.id && (
                      <Button variant="default" size="sm" onClick={() => { setSkippingId(task.id); setSkipNote(''); }}>رد کردن</Button>
                    )}
                    {task.status !== 'pending' && (
                      <button onClick={() => markStatus(task.id, 'pending', null)} className="text-[11px] text-muted hover:text-stone-700">بازگشت</button>
                    )}
                  </div>

                  {skippingId === task.id && (
                    <div className="w-full flex items-center gap-2 pt-1">
                      <Input className="flex-1" placeholder="دلیل رد شدن (اختیاری)" value={skipNote} onChange={e => setSkipNote(e.target.value)} />
                      <Button variant="danger" size="sm" loading={busyId === task.id} onClick={() => markStatus(task.id, 'skipped', skipNote.trim() || null)}>تأیید رد</Button>
                      <Button variant="default" size="sm" onClick={() => setSkippingId(null)}>انصراف</Button>
                    </div>
                  )}
                </div>
              ))}
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
