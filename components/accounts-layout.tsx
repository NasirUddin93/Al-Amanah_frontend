'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ACCOUNTS_NAV_ITEMS } from '@/lib/nav';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/authSlice';
import { useLogoutMutation } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Receipt,
  CreditCard,
  FileText,
  Calendar,
  PiggyBank,
  Bell,
  LogOut,
  Landmark,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  '/accounts': LayoutDashboard,
  '/accounts/receipts': Receipt,
  '/accounts/transactions': CreditCard,
  '/accounts/reports': FileText,
  '/accounts/meeting-expenses': Calendar,
  '/accounts/fdrs': PiggyBank,
  '/accounts/notifications': Bell,
};

export function AccountsLayout({ children }: { children: React.ReactNode }) {
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const [logoutApi] = useLogoutMutation();

  const unwrappedUser = (user as any)?.data || user;
  const roleName =
    typeof unwrappedUser?.role === 'string'
      ? unwrappedUser.role
      : unwrappedUser?.role?.name || (unwrappedUser?.role as any)?.data?.name;

  const handleLogout = async () => {
    try {
      await logoutApi().unwrap();
    } catch {}
    dispatch(logout());
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Accounts Sidebar */}
      <aside className="w-64 h-screen sticky top-0 bg-slate-900 text-slate-100 flex flex-col shrink-0 print:hidden border-r border-slate-800 shadow-xl z-20">
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-teal-400 font-bold shrink-0">
              <Landmark className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white tracking-wide truncate">Al-Amanah Accounts</div>
              <div className="text-[10px] text-teal-400 font-medium tracking-wider uppercase truncate">Finance &amp; Audit Portal</div>
            </div>
          </div>
        </div>

        {/* Quick Website Switcher */}
        <div className="px-3 pt-3 pb-1">
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-teal-400 bg-teal-950/40 hover:bg-teal-900/50 border border-teal-800/60 transition-colors shadow-2xs group"
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
              View Live Website
            </span>
            <span className="text-[10px] text-teal-300 font-bold group-hover:translate-x-0.5 transition-transform">↗</span>
          </Link>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {ACCOUNTS_NAV_ITEMS.map((item) => {
            const Icon = ICON_MAP[item.href] || LayoutDashboard;
            const isActive = pathname === item.href || (item.href !== '/accounts' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150',
                  isActive
                    ? 'bg-teal-700 text-white shadow-md shadow-teal-950/40 font-bold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-white' : 'text-slate-400')} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Identity & Logout Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/80 space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-teal-400">
              {unwrappedUser?.name ? unwrappedUser.name.slice(0, 2).toUpperCase() : 'AC'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-100 truncate">{unwrappedUser?.name || 'Accounts Officer'}</div>
              <div className="text-[10px] text-teal-400 font-mono capitalize truncate">
                {roleName?.replace(/_/g, ' ') || 'Accountant'}
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
            <span>Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 overflow-auto print:p-0">{children}</main>
    </div>
  );
}
