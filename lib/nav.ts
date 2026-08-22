import type { RoleName } from '@/types';

export interface NavItem { label: string; href: string; roles?: RoleName[] }

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Users', href: '/dashboard/users', roles: ['super_admin'] },
  { label: 'Transactions', href: '/dashboard/transactions' },
  { label: 'Receipts', href: '/dashboard/receipts' },
  { label: 'Reports', href: '/dashboard/reports', roles: ['super_admin', 'admin'] },
  { label: 'Meeting Expenses', href: '/dashboard/meeting-expenses', roles: ['super_admin', 'admin'] },
  { label: 'FDRs', href: '/dashboard/fdrs' },
  { label: 'Settings', href: '/dashboard/settings', roles: ['super_admin', 'admin'] },
  { label: 'Activity Logs', href: '/dashboard/activity-logs', roles: ['super_admin'] },
  { label: 'Notifications', href: '/dashboard/notifications' },
  { label: 'My Profile', href: '/dashboard/profile', roles: ['member'] },
];
