'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ADMIN_NAV_ITEMS } from '@/lib/nav';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/authSlice';
import { useLogoutMutation } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  FileText,
  Calendar,
  PiggyBank,
  Settings,
  Activity,
  LogOut,
  ShieldCheck,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  '/admin': LayoutDashboard,
  '/admin/users': Users,
  '/admin/transactions': CreditCard,
  '/admin/receipts': Receipt,
  '/admin/reports': FileText,
  '/admin/meeting-expenses': Calendar,
  '/admin/fdrs': PiggyBank,
  '/admin/settings': Settings,
  '/admin/activity-logs': Activity,
};

export function AdminLayout({ children }: { children: React.ReactNode }) {
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

  const isSuperAdmin =
    roleName === 'super_admin' || unwrappedUser?.email === 'superadmin@alamanah.com';

  const items = ADMIN_NAV_ITEMS.filter((item) => {
    if (isSuperAdmin) return true;
    if (!item.roles) return true;
    return roleName ? item.roles.includes(roleName as any) : false;
  });

  const handleLogout = async () => {
    try {
      await logoutApi().unwrap();
    } catch {}
    dispatch(logout());
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Admin Sidebar */}
      <aside className="w-64 h-screen sticky top-0 bg-slate-900 text-slate-100 flex flex-col shrink-0 print:hidden border-r border-slate-800 shadow-xl z-20">
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white tracking-wide truncate">Al-Amanah Admin</div>
              <div className="text-[10px] text-emerald-400 font-medium tracking-wider uppercase truncate">Management Portal</div>
            </div>
          </div>
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
              View Live Website
            </span>
            <span className="text-[10px] text-emerald-300 font-bold group-hover:translate-x-0.5 transition-transform">↗</span>
          </Link>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const Icon = ICON_MAP[item.href] || LayoutDashboard;
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150',
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30 font-bold'
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
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-emerald-400">
              {unwrappedUser?.name ? unwrappedUser.name.slice(0, 2).toUpperCase() : 'AD'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-100 truncate">{unwrappedUser?.name || 'Administrator'}</div>
              <div className="text-[10px] text-emerald-400 font-mono capitalize truncate">
                {roleName?.replace(/_/g, ' ') || 'Admin'}
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
