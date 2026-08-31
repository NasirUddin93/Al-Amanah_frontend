'use client';

import React from 'react';

export interface ExpenseLineItem {
  label: string;
  qty?: number;
  unit_price?: number;
  value: number;
  notes?: string;
}

export interface ParsedExpenseData {
  id: number;
  title: string;
  expense_date: string;
  created_at?: string;
  amount: number;
  category: string;
  voucher_no: string;
  items: ExpenseLineItem[];
  notes?: string;
  prepared_by?: string;
  created_by?: string;
  created_by_id?: number;
  creator?: {
    id: number;
    name: string;
    email?: string;
    member_no?: string;
    role?: string;
  };
}

// Convert amount number to English words
function numberToWordsBDT(num: number): string {
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n: number): string {
    if (n === 0) return 'Zero';
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + inWords(n % 10000000) : '');
  }

  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);

  let str = inWords(intPart) + ' Taka';
  if (decPart > 0) {
    str += ' and ' + inWords(decPart) + ' Paisa';
  }
  return str + ' Only';
}

/**
 * 1. Individual Expense Voucher Print Component
 */
export function ExpenseVoucherPrintArea({ voucher }: { voucher: ParsedExpenseData | null }) {
  if (!voucher) return null;

  const totalAmount = Number(voucher.amount || 0);
  const amountInWords = numberToWordsBDT(totalAmount);
  const creatorName = voucher.creator?.name || voucher.created_by || voucher.prepared_by || 'Admin / Accounts Desk';
  const creatorId = voucher.creator?.member_no ? `ID: ${voucher.creator.member_no}` : (voucher.created_by_id ? `ID: ${voucher.created_by_id}` : (voucher.creator?.id ? `ID: ${voucher.creator.id}` : 'Staff'));

  return (
    <div className="expense-voucher-print-container hidden print:block">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          html, body, #__next, .min-h-screen, .report-print-root, .expense-voucher-print-container {
            background: #ffffff !important;
            background-color: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}} />

      <div style={{ width: '100%', minHeight: '100%', background: '#ffffff', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {/* 1. OFFICIAL HEADER BANNER */}
        <div style={{ border: '1.5px solid #6ee7b7', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ backgroundColor: '#065f46', color: '#fff', padding: '4px 12px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
            <span style={{ color: '#d1fae5' }}>📍 Munshihati (2nd Floor, Holy Touch Ideal School), Kamrangirchar, Dhaka – 1211</span>
            <span style={{ color: '#d1fae5' }}>Established: <strong style={{ color: '#a7f3d0' }}>July 01, 2026</strong> • Non-Political • Mutual-Aid • Welfare</span>
          </div>

          <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, borderBottom: '1px solid #ecfdf5' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div
                style={{
                  width: 46, height: 46, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(135deg, #10b981, #047857)', color: '#fff', fontWeight: 900, fontSize: 24,
                  fontFamily: "'Hind Siliguri', sans-serif", border: '1.5px solid #065f46', flexShrink: 0,
                  WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
                } as React.CSSProperties}
              >আ</div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#020617' }}>Al-Amanah Savings &amp; Welfare Society</span>
                  <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', padding: '2px 6px', borderRadius: 4, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>PAYMENT / EXPENSE VOUCHER</span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#065f46', fontFamily: "'Hind Siliguri', sans-serif", marginTop: 2 }}>আল-আমানাহ সঞ্চয় ও কল্যাণ সোসাইটি — ঐক্যই শক্তি</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginTop: 2 }}>OFFICIAL SOCIETY DISBURSEMENT &amp; EXPENSE VOUCHER</div>
              </div>
            </div>

            {/* Voucher Metadata Box */}
            <div style={{ border: '1px solid #a7f3d0', borderRadius: 4, padding: '6px 10px', minWidth: 230, fontSize: '11.5px', background: '#f8fbf9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #a7f3d0', paddingBottom: 3, marginBottom: 3 }}>
                <span style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '9.5px', color: '#064e3b' }}>Voucher No:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '12px', color: '#0f172a' }}>{voucher.voucher_no || `EXP-${voucher.id.toString().padStart(4, '0')}`}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}><span style={{ color: '#64748b' }}>Date &amp; Time:</span><span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{voucher.created_at || voucher.expense_date}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                <span style={{ color: '#64748b' }}>Recorded By:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{creatorName} <span style={{ fontFamily: 'monospace', fontSize: '10.5px', color: '#047857' }}>({creatorId})</span></span>
              </div>
            </div>
          </div>

          <div style={{ padding: '3px 12px', borderTop: '1px solid #d1fae5', borderLeft: '3px solid #10b981', background: '#f0fdf4', fontSize: '11px', display: 'flex', justifyContent: 'space-between', color: '#334155', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
            <em>&ldquo;And those who are faithfully true to their trusts (Amanat) and to their covenants.&rdquo;</em>
            <strong style={{ color: '#047857', fontSize: '10px' }}>— Surah Al-Mu&rsquo;minun [23:8] • Verified Shariah Compliant</strong>
          </div>
        </div>

        {/* 2. EXPENSE TITLE & PURPOSE CARD */}
        <div style={{ marginTop: 10, border: '1.5px solid #d1fae5', borderRadius: 4, padding: '8px 14px', background: '#f8fbf9' }}>
          <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Purpose of Expenditure / Event Title</div>
          <div style={{ fontSize: '16.5px', fontWeight: 800, color: '#064e3b', marginTop: 2 }}>{voucher.title}</div>
          {voucher.notes && <div style={{ fontSize: '12px', color: '#475569', marginTop: 3 }}><strong>Notes/Reference:</strong> {voucher.notes}</div>}
        </div>

        {/* 3. ITEMIZED EXPENSES TABLE */}
        <div style={{ marginTop: 12, border: '1.5px solid #d1fae5', borderRadius: 4, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#065f46', color: '#ffffff', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
                <th style={{ padding: '7px 10px', textAlign: 'center', width: 40 }}>#</th>
                <th style={{ padding: '7px 12px', textAlign: 'left' }}>Particulars / Item Description</th>
                <th style={{ padding: '7px 8px', textAlign: 'center', width: 70 }}>Qty</th>
                <th style={{ padding: '7px 10px', textAlign: 'right', width: 120 }}>Unit Rate (৳)</th>
                <th style={{ padding: '7px 12px', textAlign: 'right', width: 140 }}>Amount (BDT ৳)</th>
              </tr>
            </thead>
            <tbody>
              {voucher.items && voucher.items.length > 0 ? (
                voucher.items.map((item, idx) => {
                  const qty = Number(item.qty) > 0 ? Number(item.qty) : 1;
                  const itemVal = Number(item.value || 0);
                  const unitRate = item.unit_price !== undefined && Number(item.unit_price) > 0
                    ? Number(item.unit_price)
                    : (qty > 1 ? itemVal / qty : itemVal);

                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 1 ? '#fbfdfc' : '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
                      <td style={{ padding: '7px 10px', textAlign: 'center', fontFamily: 'monospace', color: '#64748b', fontSize: '13px' }}>{idx + 1}</td>
                      <td style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 600, color: '#0f172a', fontSize: '13.5px' }}>
                        {item.label}
                        {item.notes && <span style={{ display: 'block', fontSize: '11.5px', color: '#64748b', fontWeight: 400, marginTop: 1 }}>{item.notes}</span>}
                      </td>
                      <td style={{ padding: '7px 8px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: '#334155', fontSize: '13.5px' }}>
                        {qty}
                      </td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#475569', fontSize: '13px' }}>
                        {unitRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '7px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#064e3b', fontSize: '14px' }}>
                        {itemVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '7px 10px', textAlign: 'center', fontFamily: 'monospace' }}>1</td>
                  <td style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 600 }}>{voucher.title}</td>
                  <td style={{ padding: '7px 8px', textAlign: 'center', fontFamily: 'monospace' }}>1</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'monospace' }}>{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                    {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              )}

              {/* Subtotal / Net Total Row */}
              <tr style={{ background: '#f0fdf4', borderTop: '2px solid #059669', borderBottom: '2px solid #059669', fontWeight: 800, fontSize: '14px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
                <td colSpan={4} style={{ padding: '8px 12px', textAlign: 'right', textTransform: 'uppercase', color: '#064e3b' }}>
                  Total Expenditure Disbursed:
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#064e3b', fontSize: '16px' }}>
                  BDT {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 4. AMOUNT IN WORDS BOX */}
        <div style={{ marginTop: 10, padding: '8px 12px', background: '#f8fbf9', border: '1px solid #a7f3d0', borderRadius: 4, fontSize: '13px', color: '#0f172a' }}>
          <strong>Amount in Words:</strong> <span style={{ fontStyle: 'italic', fontWeight: 700, color: '#065f46' }}>{amountInWords}</span>
        </div>

        {/* 5. VERIFICATION & APPROVAL SIGNATURE DESKS */}
        <div style={{ marginTop: 32, paddingTop: 12, borderTop: '1px solid #a7f3d0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, pageBreakInside: 'avoid' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>1. Prepared &amp; Added By</div>
            <div style={{ paddingTop: 30, borderBottom: '1px solid #94a3b8' }}></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#334155', marginTop: 4 }}>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>{creatorName} <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#047857' }}>({creatorId})</span></span>
              <span style={{ fontFamily: 'monospace', color: '#047857' }}>Submitted</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>2. Audited &amp; Checked</div>
            <div style={{ paddingTop: 30, borderBottom: '1px solid #94a3b8' }}></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#334155', marginTop: 4 }}>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>Accounts Officer</span>
              <span style={{ fontFamily: 'monospace', color: '#047857' }}>Verified</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>3. Approved &amp; Passed</div>
            <div style={{ paddingTop: 30, borderBottom: '1px solid #94a3b8' }}></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#334155', marginTop: 4 }}>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>President / Secretary</span>
              <span style={{ fontFamily: 'monospace', color: '#047857' }}>Authorized • Sealed</span>
            </div>
          </div>
        </div>

        {/* Micro-Footer */}
        <div style={{ marginTop: 16, paddingTop: 8, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'monospace' }}>
          <span>Al-Amanah Savings &amp; Welfare Society • Expense Voucher</span>
          <span>Munshihati, Kamrangirchar, Dhaka</span>
          <span>Official Disbursement Record</span>
        </div>
      </div>
    </div>
  );
}

/**
 * 2. Compiled Expenses Ledger Report Print Component
 */
export function ExpensesReportPrintArea({
  expenses,
  title = 'Official Society Expenses & Disbursement Audit Ledger',
  subtitle = 'Comprehensive Society Expenditure Statement',
}: {
  expenses: ParsedExpenseData[] | null;
  title?: string;
  subtitle?: string;
}) {
  if (!expenses || expenses.length === 0) return null;

  const grandTotal = expenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
  const totalLineItems = expenses.reduce((acc, e) => acc + (e.items?.length || 1), 0);
  const currentDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="expenses-report-print-container hidden print:block">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          html, body, #__next, .min-h-screen, .expenses-report-print-container {
            background: #ffffff !important;
            background-color: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}} />

      <div style={{ width: '100%', minHeight: '100%', background: '#ffffff', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {/* Header */}
        <div style={{ border: '1.5px solid #6ee7b7', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ backgroundColor: '#065f46', color: '#fff', padding: '4px 12px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#d1fae5' }}>📍 Munshihati, Kamrangirchar, Dhaka – 1211</span>
            <span style={{ color: '#d1fae5' }}>Established: <strong style={{ color: '#a7f3d0' }}>July 01, 2026</strong> • Official Expenditure Audit</span>
          </div>

          <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, borderBottom: '1px solid #ecfdf5' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div
                style={{
                  width: 46, height: 46, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(135deg, #10b981, #047857)', color: '#fff', fontWeight: 900, fontSize: 24,
                  fontFamily: "'Hind Siliguri', sans-serif", border: '1.5px solid #065f46', flexShrink: 0,
                }}
              >আ</div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#020617' }}>Al-Amanah Savings &amp; Welfare Society</span>
                  <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', padding: '2px 6px', borderRadius: 4, background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>EXPENSES AUDIT REPORT</span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#065f46', fontFamily: "'Hind Siliguri', sans-serif", marginTop: 2 }}>আল-আমানাহ সঞ্চয় ও কল্যাণ সোসাইটি — খরচ ও ব্যয় বিবরণী</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginTop: 2 }}>{title}</div>
              </div>
            </div>

            <div style={{ border: '1px solid #a7f3d0', borderRadius: 4, padding: '6px 10px', minWidth: 200, fontSize: '11.5px', background: '#f8fbf9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #a7f3d0', paddingBottom: 3, marginBottom: 3 }}>
                <span style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '9.5px', color: '#064e3b' }}>Report Scope:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>EXP-LEDGER-2026</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}><span style={{ color: '#64748b' }}>Date:</span><span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{currentDate}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}><span style={{ color: '#64748b' }}>Vouchers:</span><span style={{ fontWeight: 700, color: '#047857' }}>{expenses.length} Vouchers</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}><span style={{ color: '#64748b' }}>Line Items:</span><span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{totalLineItems} Items</span></div>
            </div>
          </div>
        </div>

        {/* Summary Stats Deck */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 8, pageBreakInside: 'avoid' }}>
          <div style={{ padding: '6px 10px', border: '1px solid #d1fae5', borderRadius: 4, textAlign: 'center', background: '#f0fdf4' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#065f46', textTransform: 'uppercase' }}>Gross Expenses Incurred</div>
            <div style={{ fontSize: '17px', fontWeight: 900, fontFamily: 'monospace', color: '#064e3b', margin: '2px 0' }}>BDT {grandTotal.toLocaleString()}</div>
            <div style={{ fontSize: '9.5px', color: '#047857' }}>Total audited disbursements</div>
          </div>
          <div style={{ padding: '6px 10px', border: '1px solid #a7f3d0', borderRadius: 4, textAlign: 'center', background: '#f8fbf9' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>Total Expense Vouchers</div>
            <div style={{ fontSize: '17px', fontWeight: 900, fontFamily: 'monospace', color: '#0f172a', margin: '2px 0' }}>{expenses.length} Sheets</div>
            <div style={{ fontSize: '9.5px', color: '#64748b' }}>Audited Society Expenditure</div>
          </div>
          <div style={{ padding: '6px 10px', border: '1px solid #d1fae5', borderRadius: 4, textAlign: 'center', background: '#f8fbf9' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>Average Expense / Sheet</div>
            <div style={{ fontSize: '17px', fontWeight: 900, fontFamily: 'monospace', color: '#0f172a', margin: '2px 0' }}>
              BDT {expenses.length > 0 ? Math.round(grandTotal / expenses.length).toLocaleString() : '0'}
            </div>
            <div style={{ fontSize: '9.5px', color: '#64748b' }}>Per approved voucher</div>
          </div>
        </div>

        {/* Ledger Table */}
        <div style={{ marginTop: 12, border: '1.5px solid #d1fae5', borderRadius: 4, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
            <thead>
              <tr style={{ background: '#065f46', color: '#fff', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '6px 10px', textAlign: 'center', width: 35 }}>#</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', width: 105 }}>Date &amp; Time</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', width: 130 }}>Voucher #</th>
                <th style={{ padding: '6px 10px', textAlign: 'left' }}>Expense Title &amp; Line Items Breakdown</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', width: 160 }}>Added By (ID &amp; Name)</th>
                <th style={{ padding: '6px 10px', textAlign: 'right', width: 140 }}>Amount (৳)</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp, idx) => {
                const cName = exp.creator?.name || exp.created_by || exp.prepared_by || 'Admin';
                const cId = exp.creator?.member_no ? `ID: ${exp.creator.member_no}` : (exp.created_by_id ? `ID: ${exp.created_by_id}` : (exp.creator?.id ? `ID: ${exp.creator.id}` : ''));

                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 1 ? '#fbfdfc' : '#ffffff' }}>
                    <td style={{ padding: '6px 10px', textAlign: 'center', fontFamily: 'monospace', color: '#64748b', fontSize: '13px' }}>{idx + 1}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'left', fontFamily: 'monospace', color: '#475569', fontSize: '12px' }}>
                      <div>{exp.expense_date}</div>
                      {exp.created_at && exp.created_at.length > 10 && (
                        <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                          {new Date(exp.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'left', fontFamily: 'monospace', fontWeight: 700, color: '#064e3b', fontSize: '13px' }}>{exp.voucher_no || `EXP-${exp.id.toString().padStart(4, '0')}`}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'left' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{exp.title}</div>
                      {exp.items && exp.items.length > 0 && (
                        <div style={{ marginTop: 2, paddingLeft: 8, borderLeft: '2px solid #a7f3d0', fontSize: '12px', color: '#475569' }}>
                          {exp.items.map((it, itIdx) => (
                            <div key={itIdx} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                              <span>• {it.label}</span>
                              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>৳{Number(it.value || 0).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'left' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '12px' }}>{cName}</div>
                      {cId && <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#047857', fontWeight: 600 }}>{cId}</div>}
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#064e3b', fontSize: '14px' }}>
                      {Number(exp.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}

              {/* Grand Total Row */}
              <tr style={{ background: '#f0fdf4', borderTop: '2px solid #059669', borderBottom: '2px solid #059669', fontWeight: 800, fontSize: '14px' }}>
                <td colSpan={5} style={{ padding: '8px 10px', textAlign: 'right', textTransform: 'uppercase', color: '#064e3b' }}>
                  Grand Total Audited Expenses:
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#064e3b', fontSize: '16px' }}>
                  BDT {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Settlement Summary Bar */}
        <div style={{ marginTop: 10, borderRadius: 5, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', color: '#fff', background: '#064e3b', pageBreakInside: 'avoid' }}>
          <div>
            <div style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a7f3d0' }}>Al-Amanah Audited Expenditures Ledger</div>
            <div style={{ fontSize: '12px', color: '#6ee7b7', marginTop: 2 }}>Reconciled against physical cash book and payment resolution minutes</div>
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: 800, color: '#fff' }}>
            Total Disbursed: BDT {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Signatures */}
        <div style={{ marginTop: 24, paddingTop: 12, borderTop: '1px solid #a7f3d0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36, pageBreakInside: 'avoid' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Accounts Verification</div>
            <div style={{ paddingTop: 24, borderBottom: '1px solid #cbd5e1' }}></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#334155', marginTop: 4 }}>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>Executive Finance Desk</span>
              <span style={{ fontFamily: 'monospace', color: '#047857' }}>Audited &amp; Reconciled</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>President / General Secretary</div>
            <div style={{ paddingTop: 24, borderBottom: '1px solid #cbd5e1' }}></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#334155', marginTop: 4 }}>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>Al-Amanah Executive Council</span>
              <span style={{ fontFamily: 'monospace', color: '#047857' }}>Approved • Sealed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

