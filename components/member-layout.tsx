'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { MEMBER_NAV_ITEMS } from '@/lib/nav';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/authSlice';
import { useLogoutMutation } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  CreditCard,
  Receipt,
  User,
  Bell,
  LogOut,
  Building2,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  '/member': LayoutDashboard,
  '/member/transactions': CreditCard,
  '/member/receipts': Receipt,
  '/member/profile': User,
  '/member/notifications': Bell,
};

export function MemberLayout({ children }: { children: React.ReactNode }) {
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const [logoutApi] = useLogoutMutation();

  const unwrappedUser = (user as any)?.data || user;
  const memberNo =
    unwrappedUser?.member_profile?.member_no || unwrappedUser?.member_no || 'Member';

  const handleLogout = async () => {
    try {
      await logoutApi().unwrap();
    } catch {}
    dispatch(logout());
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Member Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0 print:hidden border-r border-slate-800 shadow-xl">
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/60 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white tracking-wide">Al-Amanah</div>
            <div className="text-[10px] text-emerald-400 font-medium tracking-wider uppercase">Member Portal</div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {MEMBER_NAV_ITEMS.map((item) => {
            const Icon = ICON_MAP[item.href] || LayoutDashboard;
            const isActive = pathname === item.href || (item.href !== '/member' && pathname.startsWith(item.href));

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
                <span>{item.label}</span>
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
                ID: {memberNo}
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
