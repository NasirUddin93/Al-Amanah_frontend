import type { RoleName, User } from '@/types';

export const getRoleName = (user: any): string | undefined => {
  const u = user?.data || user;
  if (!u) return undefined;
  if (typeof u.role === 'string') return u.role;
  return u.role?.name || u.role?.data?.name;
};

export const hasRole = (user: User | null | undefined, roles: RoleName[]) => {
  const u = (user as any)?.data || user;
  if (!u) return false;
  const roleName = getRoleName(u);
  if (roleName === 'super_admin' || u.email === 'superadmin@alamanah.com') return true;
  return roleName ? roles.includes(roleName as any) : false;
};

export const isStaff = (user: User | null | undefined) =>
  hasRole(user, ['super_admin', 'admin', 'accountant']);

export const canManageTransactions = (user: User | null | undefined) =>
  hasRole(user, ['super_admin', 'admin']);

export const canCreateTransactions = (user: User | null | undefined) => {
  const u = (user as any)?.data || user;
  if (!u) return false;
  const roleName = getRoleName(u);
  if (roleName === 'super_admin' || u.email === 'superadmin@alamanah.com') return true;
  if (roleName === 'admin') return Boolean(u.can_change_payment);
  return false;
};

export const canManageReceipts = (user: User | null | undefined) =>
  hasRole(user, ['super_admin', 'admin', 'accountant']);
