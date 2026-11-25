import React from 'react';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  CalendarClock,
  ClipboardCheck,
  Settings,
  Sun,
  Moon,
  X,
} from 'lucide-react';
import type { CenterSettings } from '../types/tutoring';

export type NavTabId =
  | 'overview'
  | 'students'
  | 'subscriptions'
  | 'schedule'
  | 'attendance'
  | 'settings';

interface SidebarProps {
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  settings: CenterSettings;
  onToggleTheme: () => void;
  renewalsBadgeCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: NavTabId;
  label: string;
  mobileLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'overview', label: 'لوحة القيادة', mobileLabel: 'الرئيسية', icon: LayoutDashboard },
  { id: 'students', label: 'الطلاب والتسجيل', mobileLabel: 'الطلاب', icon: Users },
  { id: 'subscriptions', label: 'الاشتراكات والتجديد', mobileLabel: 'الاشتراكات', icon: CreditCard },
  { id: 'schedule', label: 'الجدول الأسبوعي', mobileLabel: 'الجدول', icon: CalendarClock },
  { id: 'attendance', label: 'الحضور والدرجات', mobileLabel: 'الحضور', icon: ClipboardCheck },
  { id: 'settings', label: 'إعدادات المركز', mobileLabel: 'الإعدادات', icon: Settings },
];

const MOBILE_BOTTOM_TABS: NavTabId[] = [
  'overview',
  'students',
  'subscriptions',
  'schedule',
  'attendance',
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  settings,
  onToggleTheme,
  renewalsBadgeCount,
  mobileOpen,
  onCloseMobile,
}) => {
  React.useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseMobile();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen, onCloseMobile]);

  const handleNav = (id: NavTabId) => {
    onSelectTab(id);
    onCloseMobile();
  };

  const sidebarBody = (
    <div className="flex flex-col h-full bg-white/95 dark:bg-[#14161C]/95 backdrop-blur-xl border-l border-black/[0.06] dark:border-white/[0.08] px-4 py-5">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-2 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#0071E3] text-white flex items-center justify-center font-display font-bold text-lg shrink-0 shadow-sm">
            أ
          </div>
          <div className="min-w-0">
            <div className="font-display font-bold text-base text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
              أُفق
            </div>
            <div className="text-xs text-[#6E6E73] dark:text-[#98989D] truncate">
              {settings.centerName}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="إغلاق القائمة الجانبية"
          className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[#6E6E73] hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav aria-label="القائمة الرئيسية" className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNav(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 whitespace-nowrap ${
                isActive
                  ? 'bg-[#0071E3] text-white shadow-sm'
                  : 'text-[#424245] dark:text-[#C7C7CC] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-[#1D1D1F] dark:hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3">
                <Icon
                  className={`w-[18px] h-[18px] shrink-0 ${
                    isActive ? 'text-white' : 'text-[#6E6E73] dark:text-[#98989D]'
                  }`}
                />
                <span>{item.label}</span>
              </span>
              {item.id === 'subscriptions' && renewalsBadgeCount > 0 && (
                <span
                  className={`text-xs tabular-nums font-semibold px-1.5 py-0.5 rounded-md ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'text-[#D97706] dark:text-[#FBBF24] bg-amber-500/10'
                  }`}
                >
                  {renewalsBadgeCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Teacher Profile (Text Only) & Theme Switch */}
      <div className="pt-4 mt-4 border-t border-black/[0.06] dark:border-white/[0.08] space-y-3">
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={
            settings.theme === 'dark'
              ? 'التبديل إلى الوضع الفاتح'
              : 'التبديل إلى الوضع الداكن'
          }
          className="w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-[#424245] dark:text-[#C7C7CC] bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.06] dark:hover:bg-white/[0.09] transition-colors"
        >
          <span className="flex items-center gap-2.5">
            {settings.theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-[#0071E3]" />
            )}
            <span>{settings.theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}</span>
          </span>
          <span className="text-[11px] text-[#6E6E73] dark:text-[#98989D]">
            {settings.theme === 'dark' ? 'ليلي' : 'نهاري'}
          </span>
        </button>

        <div className="px-2 py-1.5 min-w-0">
          <div className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
            {settings.teacherName}
          </div>
          <div className="text-xs text-[#6E6E73] dark:text-[#98989D] truncate mt-0.5">
            {settings.specialty}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-[264px] shrink-0 h-screen sticky top-0 z-20">
        {sidebarBody}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative w-[280px] max-w-[85vw] h-full z-10 pb-safe">
            {sidebarBody}
          </aside>
        </div>
      )}
    </>
  );
};

interface MobileTabBarProps {
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  renewalsBadgeCount: number;
}

export const MobileTabBar: React.FC<MobileTabBarProps> = ({
  activeTab,
  onSelectTab,
  renewalsBadgeCount,
}) => {
  const items = NAV_ITEMS.filter((item) => MOBILE_BOTTOM_TABS.includes(item.id));

  return (
    <nav
      aria-label="التنقل السريع بالهاتف"
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/92 dark:bg-[#14161C]/92 backdrop-blur-xl border-t border-black/[0.07] dark:border-white/[0.08] pb-safe"
    >
      <div className="grid grid-cols-5 h-14">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors active:scale-[0.96] ${
                isActive
                  ? 'text-[#0071E3] dark:text-[#2997FF]'
                  : 'text-[#6E6E73] dark:text-[#98989D]'
              }`}
            >
              <div className="relative">
                <Icon className="w-[20px] h-[20px]" />
                {item.id === 'subscriptions' && renewalsBadgeCount > 0 && (
                  <span className="absolute -top-1.5 -left-2.5 min-w-[16px] h-[16px] px-1 rounded-md bg-[#DC2626] text-white text-[10px] font-bold tabular-nums flex items-center justify-center">
                    {renewalsBadgeCount > 9 ? '9+' : renewalsBadgeCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium leading-none tracking-tight whitespace-nowrap">
                {item.mobileLabel}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
