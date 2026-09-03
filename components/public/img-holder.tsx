'use client';
import React from 'react';
import { useLanguage } from '@/components/language-context';

export default function ImgHolder({ label, size, height = 420, className = '' }: { label: string; size?: string; height?: number; className?: string }) {
  const { isBn } = useLanguage();
  return (
    <div className={`img-holder ${className}`} style={{ height }}>
      <span className="cam">📷</span>
      {label}
      {size && <small>{isBn ? `প্রস্তাবিত মাপ: ${size}` : `Recommended: ${size}`}</small>}
    </div>
  );
}
