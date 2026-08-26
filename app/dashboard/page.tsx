'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';

export default function DashboardRedirectPage() {
  const user = useAppSelector((s) => s.auth.user);
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    const unwrapped = (user as any)?.data || user;
    const roleName = typeof unwrapped?.role === 'string' ? unwrapped.role : unwrapped?.role?.name || unwrapped?.role?.data?.name;
    if (roleName === 'member') {
      router.replace('/member');
    } else if (roleName === 'accountant') {
      router.replace('/accounts');
    } else {
      router.replace('/admin');
    }
  }, [user, router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-2">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Redirecting to your portal...</p>
      </div>
    </div>
  );
}
