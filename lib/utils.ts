import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBDT(amount: number | string | null | undefined): string {
  const num = Number(amount) || 0;
  return `BDT ${num.toLocaleString('en-US')}`;
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const raw = String(dateStr).trim();
    const iso = raw.includes('T') ? raw : raw.replace(' ', 'T');
    const d = new Date(iso);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return String(dateStr);
  }
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const raw = String(dateStr).trim();
    const iso = raw.includes('T') ? raw : raw.replace(' ', 'T');
    const d = new Date(iso);
    if (isNaN(d.getTime())) return raw.slice(0, 10);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  } catch {
    return String(dateStr).slice(0, 10);
  }
}

export function getSecurePhotoUrl(url: string | null | undefined, token?: string | null): string {
  if (!url) return '';
  if (url.startsWith('data:')) return url;

  const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);

  if (url.includes('/api/id-photos/') && activeToken && !url.includes('token=')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}token=${encodeURIComponent(activeToken)}`;
  }

  return url;
}
