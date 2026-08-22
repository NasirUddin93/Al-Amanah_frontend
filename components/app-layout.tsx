'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { NAV_ITEMS } from '@/lib/nav';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/authSlice';
import { useLogoutMutation } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function AppLayout({ children }: { children: React.ReactNode }) {
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

  // Super Admin has access to all management sections; other roles filter by permitted roles
  const items = NAV_ITEMS.filter((item) => {
    if (isSuperAdmin) return true;
    if (!item.roles) return true;
    return roleName ? item.roles.includes(roleName as any) : false;
  });

  const handleLogout = async () => {
    try { await logoutApi().unwrap(); } catch {}
    dispatch(logout());
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0 print:hidden">
        <div className="p-4 text-lg font-bold border-b border-slate-800 tracking-wide text-white">
          Al-Amanah Society
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'block px-3 py-2 rounded-md text-sm transition-colors',
                pathname === item.href ? 'bg-slate-700 text-white font-semibold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-800 bg-slate-950/50">
          <div className="text-sm mb-2 text-slate-200">
            {unwrappedUser?.name || 'User'}{' '}
            <span className="text-slate-400 text-xs">({roleName || (isSuperAdmin ? 'super_admin' : 'Member')})</span>
          </div>
          <Button variant="secondary" className="w-full text-xs font-semibold cursor-pointer" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto print:p-0">{children}</main>
    </div>
  );
}
