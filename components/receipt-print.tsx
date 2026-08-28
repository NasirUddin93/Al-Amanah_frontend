import React from 'react';
import type { Receipt } from '@/types';

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
  
  // Detect partial payment either from explicitly attached props or from description text
  let isPartial = Boolean(receipt.isPartial);
  if (!isPartial && (/partial payment/i.test(desc) || /remaining due/i.test(desc))) {
    isPartial = true;
  }

  // Parse total and due if not explicitly provided
  let parsedAssigned = 0;
  let parsedDue = 0;
  const matchTotal = desc.match(/of\s+BDT\s+([\d,]+)/i);
  if (matchTotal) {
    parsedAssigned = Number(matchTotal[1].replace(/,/g, ''));
  }
  const matchDue = desc.match(/Due:\s*BDT\s*([\d,]+)/i);
  if (matchDue) {
    parsedDue = Number(matchDue[1].replace(/,/g, ''));
  }

  const installmentAmount = Number(receipt.installmentAmount || receipt.amount || 0);

  // Overall demand target
  let totalTargetAmount = Number(receipt.totalAssignedAmount || parsedAssigned || 0);

  // Snapshot amounts for this specific payment record
  let cumulativePaidAmount = Number(receipt.totalPaidAmount || 0);
  let previousPaidAmount = Number(receipt.previousPaidAmount || 0);
  let remainingDueAmount = Number(receipt.totalDueAmount !== undefined ? receipt.totalDueAmount : 0);

  if (cumulativePaidAmount === 0) {
    if (parsedAssigned > 0 && parsedDue > 0) {
      cumulativePaidAmount = parsedAssigned - parsedDue;
    } else {
      cumulativePaidAmount = installmentAmount;
    }
  }

  if (previousPaidAmount === 0 && cumulativePaidAmount > installmentAmount) {
    previousPaidAmount = cumulativePaidAmount - installmentAmount;
  }

  if (totalTargetAmount === 0) {
    if (parsedAssigned > 0) {
      totalTargetAmount = parsedAssigned;
    } else if (remainingDueAmount > 0) {
      totalTargetAmount = cumulativePaidAmount + remainingDueAmount;
    } else {
      totalTargetAmount = cumulativePaidAmount;
    }
  }

  if (remainingDueAmount === 0 && totalTargetAmount > cumulativePaidAmount) {
    remainingDueAmount = Math.max(0, totalTargetAmount - cumulativePaidAmount);
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

  return (
    <div className="hidden print:block bg-white p-8 max-w-2xl mx-auto text-slate-900 font-sans">
      {/* Header */}
      <div className="text-center border-b-2 border-slate-800 pb-5 mb-6">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">Al-Amanah Society</h1>
        <p className="text-xs font-semibold text-slate-600 tracking-wider uppercase mt-0.5">Official Money Receipt</p>
      </div>

      {/* Paid / Partially Paid Status Stamp & Top Meta */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
        <div>
          <div className="text-xs text-slate-500 uppercase font-semibold">Receipt No</div>
          <div className="text-base font-bold font-mono text-slate-900">{displayReceiptNo}</div>
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
          <div className="text-xs text-slate-500 uppercase font-semibold">Payment Date</div>
          <div className="text-sm font-bold text-slate-900">{receipt.receipt_date}</div>
        </div>
      </div>

      {/* Receipt Details Table */}
      <div className="space-y-3 text-sm">
        <div className="flex justify-between py-1.5 border-b border-slate-100">
          <span className="text-slate-600 font-medium">Received From (Member):</span>
          <span className="font-bold text-slate-900">
            {receipt.member?.name || 'Member'} {receipt.member?.member_no ? `(${receipt.member.member_no})` : ''}
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
        ) : (
          <div className="mt-6 p-4 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center">
            <span className="text-base font-bold text-slate-800 uppercase tracking-wide">Total Amount Paid:</span>
            <span className="text-2xl font-black text-slate-900 font-mono">
              BDT {installmentAmount.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Footer Signatures */}
      <div className="mt-20 pt-8 flex justify-between text-xs text-slate-700">
        <div className="text-center">
          <div className="w-44 border-t border-slate-800 pt-1.5 font-semibold">Authorized Collector / Admin</div>
          <span className="text-[10px] text-slate-500">Al-Amanah Management</span>
        </div>

        <div className="text-center">
          <div className="w-44 border-t border-slate-800 pt-1.5 font-semibold">Member Signature</div>
          <span className="text-[10px] text-slate-500">Received By Member</span>
        </div>
      </div>

      <div className="mt-10 text-center text-[10px] text-slate-400">
        This is a computer-generated official receipt issued by Al-Amanah Society.
      </div>
    </div>
  );
}

