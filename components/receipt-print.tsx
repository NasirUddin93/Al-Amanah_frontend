import React from 'react';
import type { Receipt } from '@/types';
import { formatDateTime } from '@/lib/utils';

export interface PaymentReferenceItem {
  ref: string;
  amount?: number;
  date?: string;
}

export interface ExtendedReceipt extends Receipt {
  isPartial?: boolean;
  totalPaidAmount?: number;
  previousPaidAmount?: number;
  totalDueAmount?: number;
  totalAssignedAmount?: number;
  installmentAmount?: number;
  previousReferences?: (string | PaymentReferenceItem)[];
}

export function ReceiptPrintArea({ receipt }: { receipt: (Receipt & { [key: string]: any }) | null }) {
  if (!receipt) return null;

  const desc = receipt.transaction?.description || '';
  const trxAny = (receipt.transaction || {}) as any;

  // Determine settlement timestamp
  const rawSettledTime =
    receipt.updated_at ||
    trxAny?.updated_at ||
    receipt.created_at ||
    trxAny?.created_at ||
    receipt.receipt_date;

  // Extract receipt photo uploaded at (slip received time)
  const rawSlipUploadedTime =
    trxAny?.receipt_photo_uploaded_at ||
    (receipt as any)?.receipt_photo_uploaded_at;

  // Extract billing due date
  const billingDueDate =
    trxAny?.transaction_date ||
    (receipt as any)?.transaction_date ||
    receipt.receipt_date;

  // Determine who settled / confirmed the payment
  const confirmedByStaff =
    receipt.confirmed_by ||
    receipt.creator ||
    trxAny?.last_modified_by ||
    trxAny?.updated_by ||
    trxAny?.created_by ||
    receipt.created_by;

  const staffName =
    typeof confirmedByStaff === 'object' && confirmedByStaff?.name
      ? confirmedByStaff.name
      : typeof confirmedByStaff === 'string'
      ? confirmedByStaff
      : 'Super Admin';

  const staffRole =
    typeof confirmedByStaff === 'object' && confirmedByStaff?.role
      ? confirmedByStaff.role.replace(/_/g, ' ')
      : 'Admin';

  const staffId =
    typeof confirmedByStaff === 'object'
      ? confirmedByStaff.member_no ? `#${confirmedByStaff.member_no}` : (confirmedByStaff.id ? `#${confirmedByStaff.id}` : '')
      : '';
  
  // 1. Installment amount paid in this specific receipt
  const installmentAmount = Number(receipt.installmentAmount || receipt.amount || 0);

  // 2. Target and cumulative amounts
  let totalTargetAmount = Number(receipt.totalAssignedAmount || 0);
  let cumulativePaidAmount = Number(receipt.totalPaidAmount || 0);
  let previousPaidAmount = Number(receipt.previousPaidAmount || 0);
  let remainingDueAmount = receipt.totalDueAmount !== undefined ? Number(receipt.totalDueAmount) : undefined;

  // If total target not explicitly provided, attempt to parse from description
  if (!totalTargetAmount) {
    const matchTotal = desc.match(/of\s+BDT\s+([\d,]+)/i);
    if (matchTotal) {
      totalTargetAmount = Number(matchTotal[1].replace(/,/g, ''));
    }
  }

  if (remainingDueAmount === undefined) {
    const trxStatus = (receipt.transaction as any)?.status;
    if (/remaining due/i.test(desc) && (!trxStatus || trxStatus === 'paid')) {
      remainingDueAmount = 0;
    } else {
      const matchDue = desc.match(/Due:\s*BDT\s*([\d,]+)/i);
      if (matchDue) {
        remainingDueAmount = Number(matchDue[1].replace(/,/g, ''));
      }
    }
  }

  // Fallbacks for cumulative and previous amounts
  if (cumulativePaidAmount === 0) {
    if (totalTargetAmount > 0 && remainingDueAmount !== undefined && remainingDueAmount > 0) {
      cumulativePaidAmount = Math.max(0, totalTargetAmount - remainingDueAmount);
    } else {
      cumulativePaidAmount = installmentAmount;
    }
  }

  if (previousPaidAmount === 0 && cumulativePaidAmount > installmentAmount) {
    previousPaidAmount = cumulativePaidAmount - installmentAmount;
  }

  if (totalTargetAmount === 0) {
    if (remainingDueAmount !== undefined && remainingDueAmount > 0) {
      totalTargetAmount = cumulativePaidAmount + remainingDueAmount;
    } else {
      totalTargetAmount = cumulativePaidAmount;
    }
  }

  if (remainingDueAmount === undefined) {
    remainingDueAmount = Math.max(0, totalTargetAmount - cumulativePaidAmount);
  }

  // Critical fix: A receipt is only PARTIALLY PAID if there is actually remaining due > 0 and target > paid
  let isPartial = false;
  if (remainingDueAmount > 0 && totalTargetAmount > cumulativePaidAmount) {
    isPartial = true;
  } else if (receipt.isPartial === true && remainingDueAmount > 0) {
    isPartial = true;
  } else {
    isPartial = false;
    remainingDueAmount = 0;
  }

  // Extract user-inputted transaction reference (e.g. bKash/Nagad/Bank Ref inputted during slip submission or settlement)
  let inputtedTrxRef = 
    receipt.transaction?.member_trx_reference || 
    (receipt as any).member_trx_reference ||
    (receipt as any).transaction_reference ||
    (receipt as any).reference ||
    '';

  let previousReferences: (string | PaymentReferenceItem)[] = Array.isArray(receipt.previousReferences) ? receipt.previousReferences : [];

  if (desc) {
    const refMatches = Array.from(desc.matchAll(/Ref:\s*([^|\n-]+)/gi)).map(m => m[1].trim()).filter(Boolean);
    if (!inputtedTrxRef && refMatches.length > 0) {
      inputtedTrxRef = refMatches[refMatches.length - 1];
    }
    if (previousReferences.length === 0 && refMatches.length > 1) {
      previousReferences = refMatches.slice(0, -1);
    }
  }

  // Transaction reference value to display based on inputted value
  const displayTrxRef = inputtedTrxRef || receipt.transaction?.transaction_no || '-';

  // Clean Receipt / Transaction Identifier: Prioritize the parent monthly demand transaction ID to match reports
  let displayReceiptNo = receipt.demandTrxNo || receipt.receipt_no || '';
  if (displayReceiptNo.startsWith('RCT-TRX-')) {
    displayReceiptNo = receipt.transaction?.transaction_no || displayReceiptNo.replace(/^RCT-/, '');
  } else if (!displayReceiptNo) {
    displayReceiptNo = receipt.transaction?.transaction_no || receipt.transaction?.month || '-';
  }

  const documentId = `AM-RCT-${receipt.member?.member_no || receipt.member?.id || '001'}-${new Date().getFullYear()}`;
  const issueDateFormatted = formatDateTime(rawSettledTime);

  return (
    <div className="hidden print:block bg-white p-8 max-w-2xl mx-auto text-slate-900 font-sans">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;600;700;800&display=swap');
        
        .mono-figures {
          font-family: 'JetBrains Mono', monospace !important;
          font-variant-numeric: tabular-nums;
          white-space: nowrap !important;
        }

        .bengali-font {
          font-family: 'Hind Siliguri', sans-serif !important;
        }

        @media print {
          @page {
            size: A4 portrait !important;
            margin: 10mm 12mm !important;
          }
          html, body {
            background: #ffffff !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `,
        }}
      />

      {/* 1. MASTER LETTERHEAD & EXECUTIVE METADATA */}
      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '12px' }}>
        {/* Top Security Ribbon */}
        <div
          style={{
            backgroundColor: '#064e3b',
            backgroundImage: 'linear-gradient(90deg, #022c22 0%, #064e3b 60%, #047857 100%)',
            color: '#ffffff',
            padding: '6px 12px',
            borderRadius: '4px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.04em',
            borderBottom: '2px solid #10b981',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#34d399' }}></span>
            <span style={{ color: '#d1fae5' }}>AL-AMANAH AUDITED FINANCIAL STATEMENT</span>
            <span style={{ color: '#6ee7b7' }}>•</span>
            <span style={{ color: '#a7f3d0', fontWeight: 500 }}>ESTABLISHED JULY 01, 2026</span>
          </div>
          <div className="mono-figures" style={{ color: '#ffffff', fontSize: '10px' }}>
            RECONCILED AUDIT EDITION
          </div>
        </div>

        {/* Letterhead Branding */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0 8px 0', borderBottom: '2px solid #064e3b', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <div
              className="bengali-font"
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '8px',
                backgroundColor: '#064e3b',
                border: '2px solid #059669',
                boxShadow: '0 2px 5px rgba(6,78,59,0.25)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 900,
                flexShrink: 0,
              }}
            >
              আ
            </div>
            <div>
              <h1 style={{ fontSize: '17px', fontWeight: 900, color: '#022c22', margin: 0, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
                Al-Amanah Savings &amp; Welfare Society
              </h1>
              <div className="bengali-font" style={{ fontSize: '13px', fontWeight: 700, color: '#047857', marginTop: '1px' }}>
                আল-আমানাহ সঞ্চয় ও কল্যাণ সোসাইটি — ঐক্যই শক্তি
              </div>
              <div style={{ fontSize: '9.5px', color: '#475569', marginTop: '3px', lineHeight: 1.35 }}>
                <div style={{ fontWeight: 500 }}>
                  📍 Munshihati (2nd Floor, Holy Touch Ideal School), Kamrangirchar, Dhaka – 1211
                </div>
                <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                  Reg: <strong style={{ color: '#0f172a' }}>COOP-DHK-2018/8892</strong> &nbsp;•&nbsp; TIN: <strong style={{ color: '#0f172a' }}>7781-9920-01</strong> &nbsp;•&nbsp; Non-Political • Mutual-Aid
                </div>
              </div>
            </div>
          </div>

          {/* Statement ID Card Box */}
          <div
            style={{
              border: '1.5px solid #065f46',
              borderRadius: '6px',
              padding: '6px 10px',
              minWidth: '195px',
              backgroundColor: '#f0fdf4',
              boxShadow: '0 2px 4px rgba(6,78,59,0.05)',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #86efac', paddingBottom: '3px', marginBottom: '3px' }}>
              <span style={{ fontSize: '8.5px', fontWeight: 800, textTransform: 'uppercase', color: '#064e3b', letterSpacing: '0.04em' }}>Document ID</span>
              <span className="mono-figures" style={{ fontSize: '10.5px', fontWeight: 800, color: '#022c22' }}>
                {documentId}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginTop: '3px' }}>
              <span style={{ color: '#475569', fontWeight: 600 }}>Issue Date:</span>
              <span className="mono-figures" style={{ fontWeight: 700, color: '#0f172a' }}>{issueDateFormatted.split(',')[0]}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginTop: '3px' }}>
              <span style={{ color: '#475569', fontWeight: 600, paddingRight: '4px' }}>Scope:</span>
              <span style={{ fontWeight: 700, color: '#047857' }}>
                Official Money Receipt
              </span>
            </div>
          </div>
        </div>

        {/* Statement Subject Banner */}
        <div
          style={{
            backgroundColor: '#022c22',
            backgroundImage: 'linear-gradient(90deg, #022c22 0%, #064e3b 100%)',
            color: '#ffffff',
            borderRadius: '6px',
            padding: '6px 10px',
            margin: '6px 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '8px', fontWeight: 800, color: '#34d399', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '1px' }}>
              Statement Scope
            </div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#ffffff' }}>
              {receipt.member?.name ? `${receipt.member.name} - Official Subscription & Money Receipt` : 'Official Member Subscription & Money Receipt'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '8px', fontWeight: 600, color: '#a7f3d0', textTransform: 'uppercase', marginBottom: '1px' }}>Billing Period</div>
            <div style={{ fontSize: '10.5px', fontWeight: 600, color: '#e2e8f0' }}>
              {receipt.transaction?.month || 'Subscription Cycle'}
            </div>
          </div>
        </div>

        {/* Shariah Motto Card */}
        <div
          style={{
            backgroundColor: '#ecfdf5',
            borderLeft: '4px solid #059669',
            borderRight: '1px solid #a7f3d0',
            borderTop: '1px solid #a7f3d0',
            borderBottom: '1px solid #a7f3d0',
            borderRadius: '4px',
            padding: '5px 10px',
            marginBottom: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '9.5px', color: '#064e3b', fontStyle: 'italic', fontWeight: 500 }}>
            &ldquo;And those who are faithfully true to their trusts (Amanat) and to their covenants.&rdquo;
          </span>
          <span style={{ color: '#047857', fontWeight: 800, fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Surah Al-Mu&rsquo;minun [23:8] • 100% Shariah Compliant
          </span>
        </div>
      </div>

      {/* Paid / Partially Paid Status Stamp & Top Meta */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
        <div>
          <div className="text-xs text-slate-500 uppercase font-semibold">Receipt No</div>
          <div className="text-base font-bold font-mono text-slate-900">{displayReceiptNo}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Billing Due: <span className="font-semibold text-slate-700">{billingDueDate}</span>
          </div>
        </div>

        {/* Prominent Status Badge (Paid vs Partially Paid) */}
        {isPartial ? (
          <div className="border-2 border-purple-700 bg-purple-50 px-4 py-1.5 rounded text-center">
            <span className="text-sm font-black text-purple-900 tracking-widest uppercase block">
              ⚡ PARTIALLY PAID
            </span>
            <span className="text-[10px] text-purple-700 font-semibold uppercase block">
              Status: Partial Settlement
            </span>
          </div>
        ) : (
          <div className="border-2 border-emerald-700 bg-emerald-50 px-4 py-1.5 rounded text-center">
            <span className="text-sm font-black text-emerald-800 tracking-widest uppercase block">
              ✓ PAID
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold uppercase block">
              Status: Cleared in Full
            </span>
          </div>
        )}

        <div className="text-right">
          <div className="text-[10px] text-slate-500 uppercase font-semibold">Settled Date &amp; Time</div>
          <div className="text-xs font-bold text-slate-900 font-mono">{formatDateTime(rawSettledTime)}</div>
          {rawSlipUploadedTime && (
            <div className="text-[10px] text-blue-800 font-medium mt-0.5">
              Slip Received: <span className="font-mono">{formatDateTime(rawSlipUploadedTime)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Receipt Details Table */}
      <div className="space-y-3 text-sm">
        <div className="flex justify-between py-1.5 border-b border-slate-100 items-center">
          <span className="text-slate-600 font-medium">Received From (Member):</span>
          <span className="font-bold text-slate-900">
            {receipt.member?.name || 'Member'} {receipt.member?.member_no ? `(${receipt.member.member_no})` : ''}
          </span>
        </div>

        <div className="flex justify-between py-1.5 border-b border-slate-100 items-center">
          <span className="text-slate-600 font-medium">Settled / Confirmed By:</span>
          <span className="font-bold text-slate-900 flex items-center gap-1.5">
            <span>{staffName}</span>
            <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 uppercase">
              {staffRole} {staffId}
            </span>
          </span>
        </div>

        <div className="flex justify-between py-1.5 border-b border-slate-100 items-center">
          <span className="text-slate-600 font-medium">Settlement Date &amp; Time:</span>
          <span className="font-mono font-bold text-emerald-900 text-xs">
            {formatDateTime(rawSettledTime)}
          </span>
        </div>

        {rawSlipUploadedTime && (
          <div className="flex justify-between py-1.5 border-b border-slate-100 items-center">
            <span className="text-slate-600 font-medium">Payment Slip Received Time:</span>
            <span className="font-mono font-semibold text-blue-900 text-xs">
              {formatDateTime(rawSlipUploadedTime)}
            </span>
          </div>
        )}

        <div className="flex justify-between py-1.5 border-b border-slate-100 items-center">
          <span className="text-slate-600 font-medium">Billing Due Date:</span>
          <span className="font-medium text-slate-800">
            {billingDueDate}
          </span>
        </div>

        <div className="flex justify-between items-start py-1.5 border-b border-slate-100">
          <span className="text-slate-600 font-medium">Transaction Reference:</span>
          <div className="text-right font-mono">
            <div className="flex items-center justify-end gap-1.5 flex-wrap">
              <span className="text-slate-900 font-bold">{displayTrxRef}</span>
              <span className="text-xs font-bold text-purple-900 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                BDT {installmentAmount.toLocaleString()}
              </span>
              {isPartial && previousReferences.length > 0 && (
                <span className="text-[10px] text-purple-700 font-semibold uppercase tracking-wide">
                  (This Installment)
                </span>
              )}
            </div>
            {previousReferences.length > 0 && (
              <div className="text-xs text-slate-600 mt-2 pt-1.5 border-t border-slate-100 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider text-right">
                  Previous Payment Reference{previousReferences.length > 1 ? 's' : ''}:
                </span>
                {previousReferences.map((item, idx) => {
                  const refText = typeof item === 'string' ? item : item.ref;
                  const amt = typeof item === 'object' ? item.amount : undefined;
                  return (
                    <div key={idx} className="flex items-center justify-end gap-1.5 text-slate-700 font-medium">
                      <span className="text-slate-400 text-[11px]">#{idx + 1}:</span>
                      <strong className="text-slate-900">{refText}</strong>
                      {amt !== undefined && (
                        <span className="text-slate-600 font-semibold text-[11px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          BDT {amt.toLocaleString()}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between py-1.5 border-b border-slate-100">
          <span className="text-slate-600 font-medium">Payment Purpose / Month:</span>
          <span className="font-medium text-slate-800">
            {receipt.transaction?.month || receipt.transaction?.description || 'Monthly / Society Contribution'}
          </span>
        </div>

        <div className="flex justify-between py-1.5 border-b border-slate-100">
          <span className="text-slate-600 font-medium">Payment Method:</span>
          <span className="capitalize font-semibold text-slate-800">
            {receipt.payment_method ? receipt.payment_method.replace(/_/g, ' ') : 'Cash'}
          </span>
        </div>

        <div className="flex justify-between py-1.5 border-b border-slate-100">
          <span className="text-slate-600 font-medium">Payment Status:</span>
          <span className={`font-bold uppercase ${isPartial ? 'text-purple-800' : 'text-emerald-700'}`}>
            {isPartial ? 'Partially Paid (Installment)' : 'Paid in Full'}
          </span>
        </div>

        {/* Admin / Accountant Comments or Settlement Remarks */}
        {(() => {
          const trxAny = (receipt.transaction || {}) as any;
          const rawAdminNote =
            (receipt as any).admin_note ||
            (receipt as any).accountant_note ||
            (receipt as any).admin_comment ||
            (receipt as any).accountant_comment ||
            (receipt as any).staff_comment ||
            (receipt as any).notes ||
            (receipt as any).note ||
            trxAny?.admin_note ||
            trxAny?.accountant_note ||
            trxAny?.admin_comment ||
            trxAny?.accountant_comment ||
            trxAny?.staff_comment ||
            trxAny?.notes ||
            trxAny?.note;

          let noteFromDesc = '';
          if (desc && /(?:admin|accountant|officer|staff)?\s*note:\s*/i.test(desc)) {
            const match = desc.match(/(?:admin|accountant|officer|staff)?\s*note:\s*([^|\n-]+)/i);
            if (match && match[1]) {
              noteFromDesc = match[1].trim();
            }
          }

          const rawCombined = rawAdminNote || noteFromDesc;
          if (!rawCombined) return null;

          // Strip redundant leading prefixes
          let cleanNote = String(rawCombined).trim();
          cleanNote = cleanNote.replace(/^(?:(?:admin|accountant|staff)\s+)?(?:note|remarks|comment)s?\s*[:\-–—]\s*/i, '').trim();
          cleanNote = cleanNote.replace(/(?:^|\|\s*)Ref:\s*[^|\n-]+(?:\s*\||$)/gi, '').trim();
          cleanNote = cleanNote.replace(/^\|\s*|\s*\|$/g, '').trim();

          if (!cleanNote || cleanNote === '-') return null;

          return (
            <div className="flex justify-between py-2 border-b border-slate-100 items-start bg-slate-50/50 px-2 rounded-md my-0.5">
              <span className="text-slate-700 font-bold text-xs uppercase tracking-wide flex items-center gap-1">
                Admin / Accountant Comments:
              </span>
              <span className="font-semibold text-slate-900 text-right max-w-[65%] text-xs leading-relaxed">
                {cleanNote}
              </span>
            </div>
          );
        })()}

        {/* Member Note / Comment */}
        {(() => {
          const rawComment =
            (receipt.transaction as any)?.member_comment ||
            (receipt as any).member_comment ||
            (receipt as any).comment;

          let noteFromDesc = '';
          if (!rawComment && desc && /note:\s*/i.test(desc) && !/(?:admin|accountant|officer)\s*note:\s*/i.test(desc)) {
            const match = desc.match(/(?:Note|Comment):\s*([^|\n]+)/i);
            if (match && match[1]) {
              noteFromDesc = match[1].trim();
            }
          }

          const rawCombined = rawComment || noteFromDesc;
          if (!rawCombined) return null;

          let cleanComment = String(rawCombined).trim();
          cleanComment = cleanComment.replace(/^(?:member\s+)?(?:comment|note|remarks)s?\s*[:\-–—]\s*/i, '').trim();
          cleanComment = cleanComment.replace(/(?:^|\|\s*)Ref:\s*[^|\n-]+(?:\s*\||$)/gi, '').trim();

          if (!cleanComment || cleanComment === '-') return null;

          return (
            <div className="flex justify-between py-1.5 border-b border-slate-100 items-start">
              <span className="text-slate-600 font-medium">Member Comment / Note:</span>
              <span className="font-medium text-slate-700 italic text-right max-w-[65%]">
                &ldquo;{cleanComment}&rdquo;
              </span>
            </div>
          );
        })()}

        {/* Amount Breakdown Box */}
        {isPartial ? (
          <div className="mt-6 p-4 rounded-lg bg-purple-50/60 border border-purple-200 space-y-2">
            <div className="flex justify-between items-center pb-2 border-b border-purple-200/80">
              <span className="text-xs font-bold text-purple-900 uppercase tracking-wide">Paid (This Installment):</span>
              <span className="text-lg font-black text-purple-950 font-mono">
                BDT {installmentAmount.toLocaleString()}
              </span>
            </div>

            {previousPaidAmount > 0 && (
              <div className="flex justify-between items-center text-xs text-slate-700 pt-0.5">
                <span className="font-semibold text-slate-600">Previous Total Amount Paid:</span>
                <span className="font-bold font-mono text-slate-900">
                  BDT {previousPaidAmount.toLocaleString()}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center text-xs text-emerald-800 pt-0.5">
              <span className="font-bold">Total Paid (Cumulative):</span>
              <span className="font-bold font-mono text-emerald-900">
                BDT {cumulativePaidAmount.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-700 pt-0.5">
              <span className="font-semibold text-slate-600">Total Demand Target:</span>
              <span className="font-bold font-mono text-slate-900">
                BDT {totalTargetAmount.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs text-purple-900 font-bold pt-2 border-t border-purple-200">
              <span className="uppercase tracking-wider">Remaining Due Amount:</span>
              <span className="font-mono text-sm text-purple-950 font-black">
                BDT {remainingDueAmount.toLocaleString()}
              </span>
            </div>
          </div>
        ) : previousPaidAmount > 0 ? (
          <div className="mt-6 p-4 rounded-lg bg-emerald-50/70 border border-emerald-200 space-y-2">
            <div className="flex justify-between items-center pb-2 border-b border-emerald-200/80">
              <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide">Paid (This Final Installment):</span>
              <span className="text-lg font-black text-emerald-950 font-mono">
                BDT {installmentAmount.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-700 pt-0.5">
              <span className="font-semibold text-slate-600">Previously Paid Installment(s):</span>
              <span className="font-bold font-mono text-slate-900">
                BDT {previousPaidAmount.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-700 pt-0.5">
              <span className="font-semibold text-slate-600">Total Demand Target:</span>
              <span className="font-bold font-mono text-slate-900">
                BDT {totalTargetAmount.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs text-emerald-900 font-bold pt-2 border-t border-emerald-200">
              <span className="uppercase tracking-wider">Total Amount Cleared in Full:</span>
              <span className="font-mono text-base text-emerald-950 font-black">
                BDT {cumulativePaidAmount.toLocaleString()}
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-6 p-4 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center">
            <span className="text-base font-bold text-slate-800 uppercase tracking-wide">Total Amount Paid:</span>
            <span className="text-2xl font-black text-slate-900 font-mono">
              BDT {installmentAmount.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Footer Signatures & Staff Audit Details */}
      <div className="mt-16 pt-6 flex justify-between text-xs text-slate-700">
        <div className="text-center w-56">
          <div className="border-t-2 border-slate-800 pt-1.5 font-bold text-slate-900 text-sm">
            {staffName}
          </div>
          <div className="text-[11px] text-emerald-900 font-semibold capitalize mt-0.5">
            {staffRole} {staffId ? `(${staffId})` : ''}
          </div>
          <div className="text-[10px] text-slate-600 font-mono mt-0.5">
            Settled: {formatDateTime(rawSettledTime)}
          </div>
          <span className="text-[9px] text-slate-500 uppercase tracking-wider block mt-1 font-bold">
            Authorized Collector / Settled By
          </span>
        </div>

        <div className="text-center w-56">
          <div className="border-t-2 border-slate-800 pt-1.5 font-bold text-slate-900 text-sm">
            {receipt.member?.name || 'Member'}
          </div>
          <div className="text-[11px] text-slate-700 font-medium mt-0.5">
            Member ID: {receipt.member?.member_no || 'Unassigned'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Official Signature / Acknowledgment
          </div>
          <span className="text-[9px] text-slate-500 uppercase tracking-wider block mt-1 font-bold">
            Member Signature
          </span>
        </div>
      </div>

      <div className="mt-10 text-center text-[10px] text-slate-400">
        This is a computer-generated official receipt issued by Al-Amanah Society.
      </div>
    </div>
  );
}

