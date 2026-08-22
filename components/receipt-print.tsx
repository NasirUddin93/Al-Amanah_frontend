import React from 'react';
import type { Receipt } from '@/types';

export function ReceiptPrintArea({ receipt }: { receipt: Receipt | null }) {
  if (!receipt) return null;

  return (
    <div className="hidden print:block bg-white p-8">
      <div className="text-center border-b-2 border-slate-800 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Al-Amanah Society</h1>
        <p className="text-sm font-semibold text-slate-700">Payment Receipt</p>
      </div>

      <div className="space-y-2 text-sm text-slate-800">
        <p><span className="font-semibold">Receipt No:</span> {receipt.receipt_no}</p>
        <p><span className="font-semibold">Date:</span> {receipt.receipt_date}</p>
        <p><span className="font-semibold">Member:</span> {receipt.member?.name} ({receipt.member?.member_no ?? '-'})</p>
        <p><span className="font-semibold">Transaction:</span> {receipt.transaction?.transaction_no ?? '-'}</p>
        <p><span className="font-semibold">Payment Method:</span> <span className="capitalize">{receipt.payment_method?.replace('_', ' ')}</span></p>
        <p className="text-xl mt-6 font-bold text-slate-900">Amount: BDT {Number(receipt.amount).toLocaleString()}</p>
      </div>

      <div className="mt-24 flex justify-between text-sm text-slate-700">
        <p className="text-center">______________________<br />Receiver Signature</p>
        <p className="text-center">______________________<br />Member Signature</p>
      </div>
    </div>
  );
}
