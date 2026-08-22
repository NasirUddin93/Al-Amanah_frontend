import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBDT(amount: number | string | null | undefined): string {
  const num = Number(amount) || 0;
  return `BDT ${num.toLocaleString('en-US')}`;
}
