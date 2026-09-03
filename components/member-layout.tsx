'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/authSlice';
import { useLogoutMutation, useGetNotificationsQuery } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/language-context';
import { MEMBER_TRANSLATIONS } from '@/lib/member-translations';
import {
  LayoutDashboard,
  CreditCard,
  User,
  Bell,
  LogOut,
  Building2,
  FileText,
  Menu,
  X,
  ExternalLink,
  ChevronRight,
  Globe,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  '/member': LayoutDashboard,
  '/member/transactions': CreditCard,
  '/member/reports': FileText,
  '/member/profile': User,
  '/member/notifications': Bell,
};

export function MemberLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const [logoutApi] = useLogoutMutation();
  const { data: notifsData } = useGetNotificationsQuery(undefined, { pollingInterval: 5000 });

  const { lang, toggleLang, isBn } = useLanguage();
  const t = MEMBER_TRANSLATIONS[lang];

  const unwrappedUser = (user as any)?.data || user;
  const memberNo =
    unwrappedUser?.member_profile?.member_no || unwrappedUser?.member_no || 'Member';

  const unreadCount = notifsData?.data?.filter((n) => !n.is_read).length ?? 0;

  const handleLogout = async () => {
    try {
      await logoutApi().unwrap();
    } catch {}
    dispatch(logout());
    router.push('/login');
  };

  const navItems = [
    { label: t.layout.nav.dashboard, href: '/member', icon: LayoutDashboard },
    { label: t.layout.nav.transactions, href: '/member/transactions', icon: CreditCard },
    { label: t.layout.nav.reports, href: '/member/reports', icon: FileText },
    { label: t.layout.nav.notifications, href: '/member/notifications', icon: Bell, hasBadge: true },
    { label: t.layout.nav.profile, href: '/member/profile', icon: User },
  ];

  const bottomNavItems = [
    { label: t.layout.bottomNav.home, href: '/member', icon: LayoutDashboard },
    { label: t.layout.bottomNav.dues, href: '/member/transactions', icon: CreditCard },
    { label: t.layout.bottomNav.reports, href: '/member/reports', icon: FileText },
    { label: t.layout.bottomNav.notices, href: '/member/notifications', icon: Bell, hasBadge: true },
    { label: t.layout.bottomNav.profile, href: '/member/profile', icon: User },
  ];

  return (
    <div className="min-h-screen w-full max-w-full bg-slate-100 flex flex-col lg:flex-row overflow-x-hidden">
      {/* ======================================================== */}
      {/* 1. DESKTOP SIDEBAR (Screens >= 1024px)                  */}
      {/* ======================================================== */}
      <aside className="hidden lg:flex w-64 h-screen sticky top-0 bg-slate-900 text-slate-100 flex-col shrink-0 print:hidden border-r border-slate-800 shadow-xl z-20">
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold shrink-0">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white tracking-wide truncate">{t.layout.brand}</div>
              <div className="text-[10px] text-emerald-400 font-medium tracking-wider uppercase truncate">{t.layout.portalSubtitle}</div>
            </div>
          </div>

          {/* Desktop Language Toggle */}
          <button
            type="button"
            onClick={toggleLang}
            className="px-2 py-1 rounded-md text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs shrink-0"
            title={isBn ? 'Switch to English' : 'বাংলায় রূপান্তর করুন'}
          >
            <Globe className="h-3 w-3 text-emerald-400" />
            <span>{isBn ? 'EN' : 'বাংলা'}</span>
          </button>
        </div>

        {/* Quick Website Switcher */}
        <div className="px-3 pt-3 pb-1">
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/60 transition-colors shadow-2xs group"
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {t.layout.viewLiveWebsite}
            </span>
            <span className="text-[10px] text-emerald-300 font-bold group-hover:translate-x-0.5 transition-transform">↗</span>
          </Link>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/member' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150',
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30 font-bold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-white' : 'text-slate-400')} />
                  <span>{item.label}</span>
                </div>
                {item.href === '/member/notifications' && unreadCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Identity & Logout Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/80 space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center font-bold text-xs text-emerald-300">
              {unwrappedUser?.name ? unwrappedUser.name.slice(0, 2).toUpperCase() : 'ME'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-100 truncate">{unwrappedUser?.name || 'Member'}</div>
              <div className="text-[10px] text-emerald-400 font-mono font-bold truncate">
                {t.layout.memberIdLabel} {memberNo}
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full text-xs font-semibold text-slate-400 hover:text-red-300 hover:bg-red-950/40 border border-slate-800 hover:border-red-900/50 cursor-pointer h-8 transition-colors flex items-center justify-center gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>{t.layout.signOut}</span>
          </Button>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. MOBILE TOP APP BAR (Screens < 1024px)                  */}
      {/* ======================================================== */}
      <header className="lg:hidden sticky top-0 z-40 bg-slate-900 text-white h-14 px-3.5 flex items-center justify-between border-b border-slate-800 shadow-md print:hidden">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
            aria-label="Open member drawer"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/member" className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0">
              আ
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white leading-tight truncate">{t.layout.brand}</div>
              <div className="text-[9px] text-emerald-400 font-mono leading-tight">{t.layout.portalSubtitle}</div>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile Top Language Switcher */}
          <button
            type="button"
            onClick={toggleLang}
            className="px-2 py-1 rounded-md text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
            title={isBn ? 'Switch to English' : 'বাংলায় রূপান্তর করুন'}
          >
            <Globe className="h-3 w-3 text-emerald-400" />
            <span>{isBn ? 'EN' : 'বাংলা'}</span>
          </button>

          <Link
            href="/member/notifications"
            className="relative p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-slate-900 animate-pulse" />
            )}
          </Link>
          <Link
            href="/member/profile"
            className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold text-emerald-300"
          >
            <div className="w-5 h-5 rounded-full bg-emerald-700 text-white font-bold text-[10px] flex items-center justify-center">
              {unwrappedUser?.name ? unwrappedUser.name.slice(0, 1).toUpperCase() : 'M'}
            </div>
            <span className="text-[10px] font-mono text-slate-300 hidden xs:inline">{memberNo}</span>
          </Link>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 3. MOBILE OFF-CANVAS DRAWER                              */}
      {/* ======================================================== */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex animate-in fade-in duration-200 print:hidden">
          <div className="w-[82vw] max-w-[300px] h-[100dvh] bg-slate-900 text-slate-100 flex flex-col shadow-2xl border-r border-slate-800 animate-in slide-in-from-left duration-250">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-sm">
                  আ
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{t.layout.brand}</div>
                  <div className="text-[10px] text-emerald-400 font-mono">{t.layout.memberIdLabel} {memberNo}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleLang}
                  className="px-2 py-1 rounded-md text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700"
                >
                  {isBn ? 'EN' : 'বাং'}
                </button>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Member Identity Card */}
            <div className="p-3.5 bg-slate-950/40 border-b border-slate-800/80">
              <div className="text-xs font-bold text-white truncate">{unwrappedUser?.name || 'Member'}</div>
              <div className="text-[11px] text-slate-400 truncate">{unwrappedUser?.email || ''}</div>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== '/member' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={cn(
                      'flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all',
                      isActive
                        ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/40'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    {item.href === '/member/notifications' && unreadCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                );
              })}

              <div className="pt-2">
                <Link
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 hover:bg-emerald-900/40"
                >
                  <span className="flex items-center gap-2">
                    <ExternalLink className="h-3.5 w-3.5" /> {t.layout.viewLiveWebsite}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-emerald-400" />
                </Link>
              </div>
            </nav>

            {/* Logout Footer */}
            <div className="p-3 border-t border-slate-800 bg-slate-950">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="w-full text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-950/50 border border-red-900/40 h-8.5 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <LogOut className="h-3.5 w-3.5" /> {t.layout.signOut}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. MAIN CONTENT AREA                                     */}
      {/* ======================================================== */}
      <main className="flex-1 w-full max-w-full overflow-x-hidden p-3.5 sm:p-5 lg:p-6 pb-24 lg:pb-6 print:p-0 min-w-0">
        {children}
      </main>

      {/* ======================================================== */}
      {/* 5. PERSISTENT MOBILE BOTTOM NAVIGATION (Screens < 1024px) */}
      {/* ======================================================== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 h-16 pb-safe flex items-center justify-around shadow-lg print:hidden">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/member' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-bold transition-all relative',
                isActive
                  ? 'text-emerald-700 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              )}
            >
              <div className="relative">
                <Icon className={cn('h-5 w-5 transition-transform', isActive ? 'scale-110 text-emerald-700' : 'text-slate-400')} />
                {item.hasBadge && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white" />
                )}
              </div>
              <span className="mt-0.5 leading-tight">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-0 w-8 h-0.5 bg-emerald-600 rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
