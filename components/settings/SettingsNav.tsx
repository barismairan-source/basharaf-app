'use client';

import {
  User as UserIcon,
  Settings2,
  Users,
  Building2,
  Tags,
  PenLine,
  Shield,
  MessageSquare,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { canDo, type CapabilityKey } from '@/lib/auth/permissions';
import { cn } from '@/lib/utils';

export type SettingsTab =
  | 'profile'
  | 'preferences'
  | 'team'
  | 'branches'
  | 'categories'
  | 'content'
  | 'security'
  | 'sms'
  | 'detective';

interface TabDef {
  id: SettingsTab;
  label: string;
  icon: LucideIcon;
  requires?: CapabilityKey;
  superAdminOnly?: boolean;
}

const TABS: ReadonlyArray<TabDef> = [
  { id: 'profile', label: 'پروفایل', icon: UserIcon },
  { id: 'preferences', label: 'تنظیمات', icon: Settings2 },
  { id: 'team', label: 'تیم', icon: Users, requires: 'settings.team' },
  { id: 'branches', label: 'شعب', icon: Building2, requires: 'settings.branches' },
  { id: 'categories', label: 'دسته‌بندی‌ها', icon: Tags, requires: 'settings.categories' },
  { id: 'content', label: 'متن‌های سامانه', icon: PenLine, requires: 'settings.content' },
  { id: 'security', label: 'امنیت', icon: Shield, requires: 'settings.security' },
  { id: 'sms', label: 'پیامک', icon: MessageSquare, requires: 'settings.security' },
  { id: 'detective', label: 'قوانین کارآگاه', icon: ShieldAlert, superAdminOnly: true },
];

interface SettingsNavProps {
  active: SettingsTab;
  onChange: (tab: SettingsTab) => void;
}

export function SettingsNav({ active, onChange }: SettingsNavProps) {
  const user = useAppStore((s) => s.user);
  if (!user) return null;

  const visible = TABS.filter((t) => {
    if (t.superAdminOnly && user.role !== 'SuperAdmin') return false;
    if (t.requires && !canDo(user, t.requires)) return false;
    return true;
  });

  return (
    <nav className="lg:w-56 flex-shrink-0">
      <ul className="space-y-0.5">
        {visible.map((tab) => {
          const isActive = tab.id === active;
          const Icon = tab.icon;
          return (
            <li key={tab.id}>
              <button
                type="button"
                onClick={() => onChange(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'w-full flex items-center gap-2.5 h-9 px-3 rounded-md text-[12.5px] transition-colors text-right',
                  isActive
                    ? 'bg-stone-100 text-stone-900'
                    : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                )}
              >
                <Icon size={14} strokeWidth={1.5} aria-hidden="true" />
                {tab.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
