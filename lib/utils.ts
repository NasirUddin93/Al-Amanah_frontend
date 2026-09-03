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

const BENGALI_DIGITS: Record<string, string> = {
  '0': '০',
  '1': '১',
  '2': '২',
  '3': '৩',
  '4': '৪',
  '5': '৫',
  '6': '৬',
  '7': '৭',
  '8': '৮',
  '9': '৯',
};

export function toBengaliDigits(numStr: string | number | null | undefined): string {
  if (numStr === null || numStr === undefined) return '';
  return String(numStr).replace(/[0-9]/g, (d) => BENGALI_DIGITS[d] || d);
}

const MONTH_NAMES_MAP: Record<string, string> = {
  january: 'জানুয়ারি',
  february: 'ফেব্রুয়ারি',
  march: 'মার্চ',
  april: 'এপ্রিল',
  may: 'মে',
  june: 'জুন',
  july: 'জুলাই',
  august: 'আগস্ট',
  september: 'সেপ্টেম্বর',
  october: 'অক্টোবর',
  november: 'নভেম্বর',
  december: 'ডিসেম্বর',
  jan: 'জানু',
  feb: 'ফেব্রু',
  mar: 'মার্চ',
  apr: 'এপ্রিল',
  jun: 'জুন',
  jul: 'জুলাই',
  aug: 'আগস্ট',
  sep: 'সেপ্টে',
  oct: 'অক্টো',
  nov: 'নভে',
  dec: 'ডিসে',
};

export function formatMonthI18n(monthStr: string | null | undefined, isBn: boolean): string {
  if (!monthStr) return '';
  if (!isBn) return String(monthStr);

  let result = String(monthStr);
  for (const [en, bn] of Object.entries(MONTH_NAMES_MAP)) {
    result = result.replace(new RegExp(`\\b${en}\\b`, 'gi'), bn);
  }

  const isoMatch = result.match(/^(\d{4})-(\d{2})$/);
  if (isoMatch) {
    const year = toBengaliDigits(isoMatch[1]);
    const monthNum = parseInt(isoMatch[2], 10);
    const bnMonths = [
      '',
      'জানুয়ারি',
      'ফেব্রুয়ারি',
      'মার্চ',
      'এপ্রিল',
      'মে',
      'জুন',
      'জুলাই',
      'আগস্ট',
      'সেপ্টেম্বর',
      'অক্টোবর',
      'নভেম্বর',
      'ডিসেম্বর',
    ];
    if (monthNum >= 1 && monthNum <= 12) {
      return `${bnMonths[monthNum]} ${year}`;
    }
  }

  return toBengaliDigits(result);
}

export function formatPaymentCategoryI18n(category: string | null | undefined, isBn: boolean): string {
  if (!category) return isBn ? 'সাধারণ চাঁদা' : 'General Subscription';
  const clean = category.toLowerCase().trim();
  if (clean === 'monthly_payment' || clean === 'monthly' || clean === 'monthly payment') {
    return isBn ? 'মাসিক চাঁদা' : 'Monthly Subscription';
  }
  if (clean === 'one_time' || clean === 'one time' || clean === 'one-time' || clean === 'one_time_payment') {
    return isBn ? 'এককালীন পেমেন্ট' : 'One-Time Payment';
  }
  if (clean === 'admission_fee' || clean === 'admission') {
    return isBn ? 'সদস্য ভর্তি ফি' : 'Admission Fee';
  }
  if (clean === 'welfare_fund' || clean === 'welfare') {
    return isBn ? 'কল্যাণ তহবিল' : 'Welfare Fund';
  }
  if (clean === 'special_fund' || clean === 'special') {
    return isBn ? 'বিশেষ তহবিল' : 'Special Fund';
  }
  if (clean === 'share_capital' || clean === 'share') {
    return isBn ? 'শেয়ার মূলধন' : 'Share Capital';
  }
  return category.replace(/_/g, ' ');
}

export function formatDemandTitleI18n(
  title: string | null | undefined,
  month: string | null | undefined,
  category: string | null | undefined,
  isBn: boolean
): string {
  if (!isBn) {
    if (category === 'monthly_payment' && month) {
      return `Monthly Subscription (${month})`;
    }
    if (month) {
      return `Subscription for ${month}`;
    }
    return title || 'Society Payment Demand';
  }

  if (category === 'monthly_payment' && month) {
    return `মাসিক চাঁদা (${formatMonthI18n(month, true)})`;
  }
  if (category === 'one_time') {
    return title && title !== 'Society Payment Demand' ? title : 'এককালীন পেমেন্ট';
  }
  if (month) {
    return `মাসিক চাঁদা — ${formatMonthI18n(month, true)}`;
  }
  if (title) {
    if (title.toLowerCase().includes('monthly subscription')) {
      const insideParen = title.match(/\(([^)]+)\)/);
      if (insideParen && insideParen[1]) {
        return `মাসিক চাঁদা (${formatMonthI18n(insideParen[1], true)})`;
      }
      return 'মাসিক চাঁদা';
    }
    if (title.toLowerCase().includes('subscription for')) {
      const rest = title.replace(/subscription for/i, '').trim();
      return `মাসিক চাঁদা — ${formatMonthI18n(rest, true)}`;
    }
    return title;
  }
  return 'সোসাইটি চাঁদা নির্ধারণ';
}

