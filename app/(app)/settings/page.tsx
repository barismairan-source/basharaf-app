'use client';

import { useEffect, useState } from 'react';
import {
  SettingsNav,
  ProfilePane,
  PreferencesPane,
  TeamPane,
  BranchesPane,
  CategoriesPane,
  ContentPane,
  SecurityPane,
  SmsPane,
  DetectivePane,
  ContactCleanupPane,
  type SettingsTab,
} from '@/components/settings';
import { RouterGuard } from '@/components/layout';
import { useAppStore } from '@/store';

export default function SettingsPage() {
  const user = useAppStore((s) => s.user);
  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  useEffect(() => { setHydrated(true); }, []);

  if (!hydrated || !user) {
    return (
      <div className="p-6">
        <div className="max-w-5xl mx-auto">
          <div className="h-6 w-32 bg-stone-200 rounded animate-pulse" />
          <div className="h-96 bg-white border border-stone-100 rounded-lg animate-pulse mt-6" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-[20px] font-medium text-stone-900 tracking-tight">تنظیمات</h1>
          <div className="text-[12px] text-muted mt-1">مدیریت حساب، شعب، کاربران و امنیت</div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <SettingsNav active={activeTab} onChange={setActiveTab} />
          <div className="flex-1 min-w-0">
            {activeTab === 'profile' && <ProfilePane />}
            {activeTab === 'preferences' && <PreferencesPane />}
            {activeTab === 'team' && (
              <RouterGuard cap="settings.team" fallbackTitle="مدیریت تیم">
                <TeamPane />
              </RouterGuard>
            )}
            {activeTab === 'branches' && (
              <RouterGuard cap="settings.branches" fallbackTitle="مدیریت شعب">
                <BranchesPane />
              </RouterGuard>
            )}
            {activeTab === 'categories' && (
              <RouterGuard cap="settings.categories" fallbackTitle="دسته‌بندی‌ها">
                <CategoriesPane />
              </RouterGuard>
            )}
            {activeTab === 'content' && (
              <RouterGuard cap="settings.content" fallbackTitle="متن‌های سامانه">
                <ContentPane />
              </RouterGuard>
            )}
            {activeTab === 'security' && (
              <RouterGuard cap="settings.security" fallbackTitle="امنیت">
                <SecurityPane />
              </RouterGuard>
            )}
            {activeTab === 'sms' && (
              <RouterGuard cap="settings.security" fallbackTitle="پیامک">
                <SmsPane />
              </RouterGuard>
            )}
            {activeTab === 'detective' && <DetectivePane />}
            {activeTab === 'contact-cleanup' && (
              <RouterGuard cap="settings.security" fallbackTitle="پاک‌سازی طرف‌حساب">
                <ContactCleanupPane />
              </RouterGuard>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
