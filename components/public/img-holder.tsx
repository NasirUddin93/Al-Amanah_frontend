import React from 'react';

export default function ImgHolder({ label, size, height = 420, className = '' }: { label: string; size?: string; height?: number; className?: string }) {
  return (
    <div className={`img-holder ${className}`} style={{ height }}>
      <span className="cam">📷</span>
      {label}
      {size && <small>Recommended: {size}</small>}
    </div>
  );
}
