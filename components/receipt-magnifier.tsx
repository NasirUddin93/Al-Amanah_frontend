'use client';
import React, { useState } from 'react';
import { ZoomIn, Eye, ExternalLink, XCircle, AlertCircle } from 'lucide-react';

interface ReceiptSlipButtonProps {
  photoUrl: string;
  title?: string;
  date?: string;
  isRejected?: boolean;
  isPartial?: boolean;
  isSlipReceived?: boolean;
  rejectionReason?: string | null;
  onClick: () => void;
  className?: string;
}

export function ReceiptSlipThumbnail({
  photoUrl,
  title,
  date,
  isRejected = false,
  isPartial = false,
  isSlipReceived = false,
  rejectionReason,
  onClick,
  className = '',
}: ReceiptSlipButtonProps) {
  // Determine primary style theme based on status
  const theme = isRejected
    ? {
        btn: 'border-red-300 bg-red-50 hover:bg-red-100 text-red-900',
        imgBorder: 'border-red-400',
        hoverBorder: 'border-red-500/80',
        text: 'Slip (Rejected)',
        icon: <XCircle className="h-3.5 w-3.5 text-red-600 opacity-90 group-hover/btn:opacity-100 transition-opacity" />,
        labelColor: 'text-red-400',
      }
    : isPartial
    ? {
        btn: 'border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-900',
        imgBorder: 'border-purple-400',
        hoverBorder: 'border-purple-500/60',
        text: 'Slip (Partial)',
        icon: <ZoomIn className="h-3 w-3 text-purple-700 opacity-80 group-hover/btn:opacity-100 transition-opacity" />,
        labelColor: 'text-purple-300',
      }
    : isSlipReceived
    ? {
        btn: 'border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-900',
        imgBorder: 'border-blue-400',
        hoverBorder: 'border-blue-500/70',
        text: 'Receipt Slip',
        icon: <ZoomIn className="h-3 w-3 text-blue-700 opacity-80 group-hover/btn:opacity-100 transition-opacity" />,
        labelColor: 'text-blue-300',
      }
    : {
        btn: 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900',
        imgBorder: 'border-emerald-400',
        hoverBorder: 'border-emerald-500/50',
        text: 'Receipt Slip',
        icon: <ZoomIn className="h-3 w-3 text-emerald-700 opacity-80 group-hover/btn:opacity-100 transition-opacity" />,
        labelColor: 'text-emerald-300',
      };

  return (
    <div className={`relative group/slip inline-block ${className}`}>
      <button
        type="button"
        onClick={onClick}
        className={`group/btn relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg border cursor-pointer shadow-2xs transition-all text-xs font-bold ${theme.btn}`}
      >
        <div className={`w-6 h-6 rounded overflow-hidden bg-slate-900 shrink-0 border ${theme.imgBorder}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt="Slip" className="w-full h-full object-cover group-hover/btn:scale-110 transition-transform duration-200" />
        </div>
        <span>{theme.text}</span>
        {theme.icon}
      </button>

      {/* Floating Hover Magnifier Card */}
      <div className={`pointer-events-none opacity-0 invisible group-hover/slip:opacity-100 group-hover/slip:visible transition-all duration-200 ease-out absolute bottom-full left-0 mb-2 z-50 w-72 p-2.5 bg-slate-950/95 backdrop-blur-md rounded-xl shadow-2xl border transform -translate-y-1 ${theme.hoverBorder}`}>
        <div className="relative w-full h-48 rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center border border-slate-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt="Magnified Slip Preview"
            className="w-full h-full object-contain transform hover:scale-125 transition-transform duration-200"
          />
        </div>
        
        {isRejected && (
          <div className="mt-1.5 p-1.5 bg-red-950/80 rounded border border-red-800/80 text-[10px] text-red-200">
            <div className="font-bold flex items-center gap-1 text-red-400">
              <XCircle className="h-3 w-3 text-red-400" /> Payment Slip Rejected
            </div>
            {rejectionReason && (
              <div className="mt-0.5 text-red-200 italic">
                Reason: {rejectionReason}
              </div>
            )}
          </div>
        )}

        {isPartial && !isRejected && (
          <div className="mt-1.5 p-1.5 bg-purple-950/80 rounded border border-purple-800/80 text-[10px] text-purple-200">
            <div className="font-bold flex items-center gap-1 text-purple-300">
              Partial Payment Slip
            </div>
          </div>
        )}

        {isSlipReceived && !isRejected && !isPartial && (
          <div className="mt-1.5 p-1.5 bg-blue-950/80 rounded border border-blue-800/80 text-[10px] text-blue-200">
            <div className="font-bold flex items-center gap-1 text-blue-300">
              Received Payment Slip (Pending Verification)
            </div>
          </div>
        )}

        <div className="mt-1.5 px-1 flex items-center justify-between text-[10px] font-mono">
          <span className={`flex items-center gap-1 ${theme.labelColor}`}>
            <ZoomIn className="h-3 w-3" /> Hover Magnifier
          </span>
          <span className="text-slate-400">Click to open &amp; view</span>
        </div>
        {date && <div className="text-[9px] text-slate-400 px-1 pt-0.5">{date}</div>}
      </div>
    </div>
  );
}

interface MagnifiableImageProps {
  src: string;
  alt?: string;
  zoomScale?: number;
  isRejected?: boolean;
  className?: string;
  imgClassName?: string;
}

export function MagnifiableModalImage({
  src,
  alt = 'Receipt Proof',
  zoomScale = 2.5,
  isRejected = false,
  className = '',
  imgClassName = '',
}: MagnifiableImageProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [coords, setCoords] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - left) / width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - top) / height) * 100));
    setCoords({ x, y });
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
      className={`relative w-full min-h-[380px] max-h-[620px] bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center cursor-crosshair shadow-inner border select-none group ${
        isRejected ? 'border-red-600/70' : 'border-slate-700'
      } ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={`max-h-[600px] w-auto max-w-full object-contain transition-transform duration-100 ease-out ${imgClassName}`}
        style={{
          transformOrigin: `${coords.x}% ${coords.y}%`,
          transform: isHovered ? `scale(${zoomScale})` : 'scale(1)',
        }}
      />

      {/* Floating Loupe Badge Indicator */}
      <div className={`absolute bottom-3 left-3 bg-black/75 backdrop-blur-md text-white text-[11px] px-3 py-1.5 rounded-full flex items-center gap-1.5 pointer-events-none font-medium border transition-opacity duration-200 ${
        isRejected ? 'border-red-500/50 text-red-300' : 'border-white/20 text-white'
      } ${isHovered ? 'opacity-30' : 'opacity-100'}`}>
        <ZoomIn className={`h-3.5 w-3.5 ${isRejected ? 'text-red-400' : 'text-emerald-400'}`} />
        <span>Hover mouse to magnify ({zoomScale}x Zoom Lens)</span>
      </div>
    </div>
  );
}
