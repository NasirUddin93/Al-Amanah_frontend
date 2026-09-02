'use client';
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { loginSchema, type LoginValues } from '@/lib/schemas';
import { useLoginMutation } from '@/lib/api';
import { useAppDispatch } from '@/store/hooks';
import { setCredentials } from '@/store/authSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';

export default function LoginPage() {
  const [login, { isLoading, error }] = useLoginMutation();
  const dispatch = useAppDispatch();
  const router = useRouter();

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  const routeUserByRole = (userObj: any) => {
    const unwrapped = userObj?.data || userObj;
    const roleName = typeof unwrapped?.role === 'string' ? unwrapped.role : unwrapped?.role?.name || unwrapped?.role?.data?.name;
    if (roleName === 'member') {
      router.push('/member');
    } else if (roleName === 'accountant') {
      router.push('/accounts');
    } else {
      router.push('/admin');
    }
  };

  const onSubmit = async (values: LoginValues) => {
    try {
      const res = await login(values).unwrap();
      dispatch(setCredentials(res));
      routeUserByRole(res.user);
    } catch { /* error shown below */ }
  };

  const handleQuickLogin = async () => {
    setValue('email', 'superadmin@alamanah.com');
    setValue('password', '11111111');
    try {
      const res = await login({
        email: 'superadmin@alamanah.com',
        password: '11111111',
      }).unwrap();
      dispatch(setCredentials(res));
      routeUserByRole(res.user);
    } catch {}
  };

  const apiError = (error as any)?.data?.message;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md shadow-lg border-slate-200">
        <CardHeader className="space-y-1 text-center sm:text-left">
          <CardTitle className="text-2xl font-bold text-slate-900">Al-Amanah Society</CardTitle>
          <CardDescription>Sign in to your member or admin account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="you@example.com" {...register('email')} className="bg-white" />
              {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" placeholder="********" {...register('password')} className="bg-white" />
              {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
            </div>
            {apiError && <p className="text-sm text-red-600">{apiError}</p>}
            <Button className="w-full cursor-pointer h-10 font-semibold" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500 font-medium">Quick Access</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleQuickLogin}
            disabled={isLoading}
            className="w-full bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-900 cursor-pointer text-xs font-semibold py-2"
          >
            ⚡ 1-Click Login (Super Admin)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
