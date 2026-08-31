import type { RoleName } from '@/types';

export interface NavItem {
  label: string;
  href: string;
  roles?: RoleName[];
  icon?: string;
  badge?: string;
}

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Users & Members', href: '/admin/users', roles: ['super_admin', 'admin'] },
  { label: 'Billing & Demands', href: '/admin/transactions', roles: ['super_admin', 'admin'] },
  { label: 'Receipts & Slips', href: '/admin/receipts', roles: ['super_admin', 'admin', 'accountant'] },
  { label: 'Reports', href: '/admin/reports', roles: ['super_admin', 'admin', 'accountant'] },
  { label: 'Expenses', href: '/admin/meeting-expenses', roles: ['super_admin', 'admin', 'accountant'] },
  { label: 'FDRs', href: '/admin/fdrs', roles: ['super_admin', 'admin'], badge: 'Soon' },
  { label: 'Settings', href: '/admin/settings', roles: ['super_admin', 'admin'] },
  { label: 'Activity Logs', href: '/admin/activity-logs', roles: ['super_admin'] },
];

export const ACCOUNTS_NAV_ITEMS: NavItem[] = [
  { label: 'Accounts Dashboard', href: '/accounts' },
  { label: 'Receipts & Slips', href: '/accounts/receipts' },
  { label: 'Billing & Demands', href: '/accounts/transactions' },
  { label: 'Financial Reports', href: '/accounts/reports' },
  { label: 'Expenses', href: '/accounts/meeting-expenses' },
  { label: 'FDR Investments', href: '/accounts/fdrs', badge: 'Soon' },
  { label: 'Notifications', href: '/accounts/notifications' },
];

export const MEMBER_NAV_ITEMS: NavItem[] = [
  { label: 'My Dashboard', href: '/member' },
  { label: 'My Subscriptions & Receipts', href: '/member/transactions' },
  { label: 'Financial Reports', href: '/member/reports' },
  { label: 'My Profile', href: '/member/profile' },
  { label: 'Notifications', href: '/member/notifications' },
];

// Fallback legacy support
export const NAV_ITEMS: NavItem[] = ADMIN_NAV_ITEMS;
