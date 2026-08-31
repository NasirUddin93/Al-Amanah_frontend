'use client';

import React from 'react';

export interface PrintRowItem {
  serial: string | number;
  date: string;
  description: string;
  transactionNo: string;
  refNo: string;
  status: string;
  paidAmount: number;
  dueAmount: number;
  assessedAmount?: number;
  balanceAmount?: number;
}

export interface PrintMonthSection {
  monthTitle: string;
  campaignTrxNo?: string;
  subTotalPaid: number;
  subTotalDue: number;
  subTotalAssessed?: number;
  rows: PrintRowItem[];
}

export interface PrintSection {
  memberId?: string | number;
  memberName?: string;
  memberNo?: string;
  memberRole?: string;
  memberHeader: string;
  memberSubHeader?: string;
  monthSections: PrintMonthSection[];
  memberTotalPaid: number;
  memberTotalDue: number;
  memberTotalAssessed?: number;
}

export interface PrintingReportData {
  level: 1 | 2 | 3;
  title: string;
  subtitle?: string;
  date: string;
  meta?: Record<string, string | number>;
  summaryStats?: {
    totalDemand: number;
    totalPaid: number;
    totalDue: number;
    recoveryRate: number;
    totalMembers: number;
    totalRecords: number;
    paidCount?: number;
    dueCount?: number;
  };
  sections: PrintSection[];
  grandTotalPaid: number;
  grandTotalDue: number;
  totalRecords: number;
}

interface ReportPrintAreaProps {
  report: PrintingReportData | null;
  preview?: boolean;
}

/**
 * Standalone, modular printable financial statement component for Al-Amanah.
 * High-legibility +33% font scale with clean member card spacing and multi-page continuation.
 */
export function ReportPrintArea({ report, preview = false }: ReportPrintAreaProps) {
  if (!report) return null;

  return (
    <div className={preview ? "w-full bg-white text-slate-900 mx-auto font-sans" : "hidden print:block print:w-full bg-white text-slate-900 mx-auto font-sans"}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        
        .report-print-root, .report-print-root * { box-sizing: border-box; margin: 0; padding: 0; }

        @media print {
          html, body, #__next, .min-h-screen, .print-preview-container, .report-print-root {
            background: #ffffff !important;
            background-color: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            color: #0f172a !important;
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            box-shadow: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 5mm 6mm;
          }
          table {
            page-break-inside: auto !important;
            break-inside: auto !important;
            width: 100% !important;
            border-collapse: collapse !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          thead {
            display: table-header-group !important;
          }
          .member-folio-card {
            margin-top: 12px !important;
            margin-bottom: 8px !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
          }
          .print-page-break-before {
            page-break-before: always !important;
            break-before: page !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}} />

      <div className="report-print-root" style={{ width: '100%', minHeight: '100%', background: '#ffffff', backgroundColor: '#ffffff', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {/* 1. HEADER BANNER */}
        <div style={{ border: '1.5px solid #6ee7b7', borderRadius: 4, overflow: 'hidden' }}>
          {/* Topbar */}
          <div
            style={{ backgroundColor: '#065f46', color: '#fff', padding: '4px 12px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}
          >
            <span style={{ color: '#d1fae5' }}>📍 Munshihati (2nd Floor, Holy Touch Ideal School), Kamrangirchar, Dhaka – 1211</span>
            <span style={{ color: '#d1fae5' }}>Established: <strong style={{ color: '#a7f3d0' }}>July 01, 2026</strong> • Non-Political • Mutual-Aid • Welfare</span>
          </div>

          {/* Main Branding */}
          <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, borderBottom: '1px solid #ecfdf5' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              {/* Logo */}
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
                  <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', padding: '2px 6px', borderRadius: 4, background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>OFFICIAL STATEMENT</span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#065f46', fontFamily: "'Hind Siliguri', sans-serif", marginTop: 2 }}>আল-আমানাহ সঞ্চয় ও কল্যাণ সোসাইটি — ঐক্যই শক্তি</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginTop: 2 }}>{report.title}</div>
                <div style={{ fontSize: '10.5px', color: '#64748b', display: 'flex', gap: 8, marginTop: 2 }}>
                  <span><strong>Reg:</strong> COOP-DHK-2018/8892</span><span>•</span><span><strong>TIN:</strong> 7781-9920-01</span><span>•</span><span>Dhaka, Bangladesh</span>
                </div>
              </div>
            </div>
            {/* Statement ID Box */}
            <div style={{ border: '1px solid #a7f3d0', borderRadius: 4, padding: '6px 8px', minWidth: 230, fontSize: '11.5px', background: '#f8fbf9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #a7f3d0', paddingBottom: 3, marginBottom: 3 }}>
                <span style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '9.5px', color: '#064e3b' }}>Statement ID:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '12px', color: '#0f172a' }}>AM-STMT-{report.level === 1 ? 'ALL' : (report.sections[0]?.memberNo || '001')}-2026</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}><span style={{ color: '#64748b' }}>Issue Date:</span><span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{report.date}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}><span style={{ color: '#64748b' }}>Scope:</span><span style={{ fontWeight: 600, maxWidth: 140, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{report.subtitle || 'Society Complete Ledger'}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}><span style={{ color: '#64748b' }}>Accounts:</span><span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#047857' }}>{report.summaryStats?.totalMembers || report.sections.length} Members ({report.totalRecords} Rec)</span></div>
            </div>
          </div>

          {/* Motto */}
          <div style={{ padding: '3px 12px', borderTop: '1px solid #d1fae5', borderLeft: '3px solid #10b981', background: '#f0fdf4', fontSize: '11px', display: 'flex', justifyContent: 'space-between', color: '#334155', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
            <em>&ldquo;And those who are faithfully true to their trusts (Amanat) and to their covenants.&rdquo;</em>
            <strong style={{ color: '#047857', fontSize: '10px' }}>— Surah Al-Mu&rsquo;minun [23:8] • 100% Shariah-Compliant</strong>
          </div>
        </div>

        {/* 2. STATS OVERVIEW DECK */}
        {report.summaryStats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5, marginTop: 6, pageBreakInside: 'avoid' }}>
            <div style={{ padding: '6px 8px', border: '1px solid #d1fae5', borderRadius: 4, textAlign: 'center' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Gross Demand Assessed</div>
              <div style={{ fontSize: '16px', fontWeight: 900, fontFamily: 'monospace', color: '#0f172a', margin: '2px 0' }}>BDT {report.summaryStats.totalDemand.toLocaleString()}</div>
              <div style={{ fontSize: '9.5px', color: '#94a3b8' }}>Total member dues billed</div>
            </div>
            <div style={{ padding: '6px 8px', border: '1px solid #86efac', borderRadius: 4, textAlign: 'center', background: '#f0fdf4', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#064e3b', textTransform: 'uppercase' }}>Realized Collections</div>
              <div style={{ fontSize: '16px', fontWeight: 900, fontFamily: 'monospace', color: '#047857', margin: '2px 0' }}>BDT {report.summaryStats.totalPaid.toLocaleString()}</div>
              <div style={{ fontSize: '9.5px', color: '#047857', fontWeight: 700 }}>{report.summaryStats.recoveryRate.toFixed(1)}% Settled ({report.summaryStats.paidCount} tx)</div>
            </div>
            <div style={{ padding: '6px 8px', border: '1px solid #fde68a', borderRadius: 4, textAlign: 'center', background: '#fffbeb', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#78350f', textTransform: 'uppercase' }}>Outstanding Dues</div>
              <div style={{ fontSize: '16px', fontWeight: 900, fontFamily: 'monospace', color: '#78350f', margin: '2px 0' }}>BDT {report.summaryStats.totalDue.toLocaleString()}</div>
              <div style={{ fontSize: '9.5px', color: '#92400e', fontWeight: 700 }}>{report.summaryStats.totalDue > 0 ? `${report.summaryStats.dueCount} pending dues` : 'Cleared'}</div>
            </div>
            <div style={{ padding: '6px 8px', border: '1px solid #d1fae5', borderRadius: 4, textAlign: 'center', background: '#f8fbf9', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>Audited Ledger Scope</div>
              <div style={{ fontSize: '16px', fontWeight: 900, fontFamily: 'monospace', color: '#064e3b', margin: '2px 0' }}>{report.summaryStats.totalMembers} Member{report.summaryStats.totalMembers > 1 ? 's' : ''}</div>
              <div style={{ fontSize: '9.5px', color: '#64748b' }}>{report.summaryStats.totalRecords} transaction entries</div>
            </div>
          </div>
        )}

        {/* 3. MEMBER FOLIO CARDS (member 2+ starts on a new page during print) */}
        {report.sections
          .filter((sec) => sec.monthSections && sec.monthSections.some((ms) => ms.rows && ms.rows.length > 0))
          .map((sec, secIdx) => {
            const totalAssessed = sec.memberTotalAssessed ?? (sec.memberTotalPaid + sec.memberTotalDue);
            return (
              <div
                key={secIdx}
                className={secIdx > 0 ? "member-folio-card print-page-break-before" : "member-folio-card"}
                style={{
                  border: '1.5px solid #d1fae5',
                  borderRadius: 4,
                  overflow: 'hidden',
                  marginTop: secIdx === 0 ? 8 : 16,
                  marginBottom: 8,
                }}
              >
                {/* Member Header */}
                <div style={{ backgroundColor: '#064e3b', color: '#fff', padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #047857', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px', color: '#064e3b', background: '#d1fae5', fontFamily: "'Hind Siliguri', sans-serif" }}>স</div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '16.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.025em' }}>{sec.memberName || sec.memberHeader}</span>
                        <span style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: '#047857', color: '#a7f3d0' }}>ID: {sec.memberNo || 'MEM'}</span>
                      </div>
                      {sec.memberSubHeader && <div style={{ fontSize: '12.5px', color: '#a7f3d0', marginTop: 2 }}>{sec.memberSubHeader}</div>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, fontFamily: 'monospace', fontSize: '13.5px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 4, background: 'rgba(6,78,59,0.8)', color: '#d1fae5', border: '1px solid #047857' }}>Assessed: <strong style={{ color: '#fff' }}>BDT {totalAssessed.toLocaleString()}</strong></span>
                    <span style={{ padding: '3px 10px', borderRadius: 4, background: '#10b981', color: '#fff', fontWeight: 700 }}>Settled: BDT {sec.memberTotalPaid.toLocaleString()}</span>
                    <span style={{ padding: '3px 10px', borderRadius: 4, fontWeight: 700, background: sec.memberTotalDue > 0 ? '#fef3c7' : '#047857', color: sec.memberTotalDue > 0 ? '#92400e' : '#a7f3d0' }}>Due: BDT {sec.memberTotalDue.toLocaleString()}</span>
                  </div>
                </div>

                {/* Tables by Billing Period */}
                {sec.monthSections.map((mSec, mIdx) => (
                  <div
                    key={mIdx}
                    style={{
                      marginTop: mIdx > 0 ? 16 : 6,
                      borderTop: mIdx > 0 ? '1.5px solid #a7f3d0' : 'none',
                    }}
                  >
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                      <thead style={{ display: 'table-header-group' }}>
                        {/* Billing Period Header */}
                        <tr style={{ background: '#f0fdf4', borderTop: '1px solid #d1fae5', borderBottom: '1px solid #d1fae5', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
                          <td colSpan={7} style={{ padding: '5px 10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13.5px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, color: '#064e3b', textTransform: 'uppercase' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669', display: 'inline-block' }}></span>
                                Billing Period: {mSec.monthTitle}
                                {mSec.campaignTrxNo && <span style={{ fontFamily: 'monospace', fontSize: '11.5px', padding: '1px 6px', borderRadius: 3, border: '1px solid #86efac', background: '#fff', color: '#047857', fontWeight: 700 }}>Campaign #{mSec.campaignTrxNo}</span>}
                              </div>
                              <div style={{ fontFamily: 'monospace', fontSize: '13.5px', color: '#047857', fontWeight: 700 }}>
                                Settled: BDT {mSec.subTotalPaid.toLocaleString()}
                                {mSec.subTotalDue > 0 && <span style={{ marginLeft: 10, color: '#92400e', fontWeight: 700 }}>Due: BDT {mSec.subTotalDue.toLocaleString()}</span>}
                              </div>
                            </div>
                          </td>
                        </tr>
                        <tr style={{ background: '#f8fbf9', color: '#065f46', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #a7f3d0', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
                          <th style={{ padding: '6px 10px', textAlign: 'center', width: 32 }}>#</th>
                          <th style={{ padding: '6px 10px', textAlign: 'left', width: 95 }}>Date</th>
                          <th style={{ padding: '6px 10px', textAlign: 'left', width: 170 }}>Reference ID</th>
                          <th style={{ padding: '6px 10px', textAlign: 'center', width: 90 }}>Status</th>
                          <th style={{ padding: '6px 10px', textAlign: 'right', width: 120 }}>Assessed (৳)</th>
                          <th style={{ padding: '6px 10px', textAlign: 'right', width: 120 }}>Settled (৳)</th>
                          <th style={{ padding: '6px 10px', textAlign: 'right', width: 120 }}>Balance (৳)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Data Rows */}
                        {mSec.rows.map((row, rIdx) => {
                          const st = row.status.toLowerCase();
                          const isPaid = st.includes('paid') && !st.includes('partial');
                          const isPartial = st.includes('partial');
                          const isRejected = st.includes('rejected');
                          const statusStyle = isPaid
                            ? { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', dot: '#059669', label: 'Settled' }
                            : isPartial ? { bg: '#faf5ff', color: '#6b21a8', border: '#e9d5ff', dot: '#7c3aed', label: 'Partial' }
                            : isRejected ? { bg: '#fef2f2', color: '#991b1b', border: '#fecaca', dot: '#dc2626', label: 'Rejected' }
                            : { bg: '#fffbeb', color: '#92400e', border: '#fde68a', dot: '#d97706', label: 'Due' };

                          return (
                            <tr key={rIdx} style={{ borderBottom: '1px solid #f1f5f9', background: rIdx % 2 === 1 ? '#fbfdfc' : '#fff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
                              <td style={{ padding: '6px 10px', textAlign: 'center', fontFamily: 'monospace', color: '#94a3b8', fontSize: '13px' }}>{row.serial}</td>
                              <td style={{ padding: '6px 10px', textAlign: 'left', fontFamily: 'monospace', color: '#475569', fontSize: '13px' }}>{row.date}</td>
                              <td style={{ padding: '6px 10px', textAlign: 'left', fontFamily: 'monospace', color: '#334155', fontSize: '13px' }}>
                                <span style={{ fontWeight: 600 }}>{row.refNo && row.refNo !== '-' ? row.refNo : '-'}</span>
                              </td>
                              <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 9999, fontSize: '11.5px', fontWeight: 700, border: `1px solid ${statusStyle.border}`, background: statusStyle.bg, color: statusStyle.color }}>
                                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusStyle.dot, display: 'inline-block' }}></span>
                                  {statusStyle.label}
                                </span>
                              </td>
                              <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: '#1e293b', fontSize: '13.5px' }}>{(row.assessedAmount ?? (row.paidAmount + row.dueAmount)).toLocaleString()}</td>
                              <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: '13.5px', color: row.paidAmount > 0 ? '#047857' : '#94a3b8' }}>{row.paidAmount > 0 ? row.paidAmount.toLocaleString() : '0.00'}</td>
                              <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: '13.5px', color: row.dueAmount > 0 ? '#b45309' : '#94a3b8' }}>{row.dueAmount > 0 ? row.dueAmount.toLocaleString() : '0.00'}</td>
                            </tr>
                          );
                        })}

                        {/* Subtotal */}
                        <tr style={{ background: '#f8fbf9', borderTop: '1px solid #d1fae5', borderBottom: '1px solid #d1fae5', fontWeight: 700, fontSize: '13px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
                          <td colSpan={4} style={{ padding: '5px 10px', textAlign: 'right', textTransform: 'uppercase', color: '#475569' }}>{mSec.monthTitle} Period Subtotal:</td>
                          <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#0f172a', fontSize: '13.5px' }}>{(mSec.subTotalAssessed ?? (mSec.subTotalPaid + mSec.subTotalDue)).toLocaleString()}</td>
                          <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#047857', fontSize: '13.5px' }}>{mSec.subTotalPaid.toLocaleString()}</td>
                          <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: 'monospace', color: mSec.subTotalDue > 0 ? '#b45309' : '#64748b', fontSize: '13.5px' }}>{mSec.subTotalDue.toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            );
          })}

        {/* 4. SETTLEMENT BAR */}
        <div style={{ marginTop: 10, borderRadius: 5, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', color: '#fff', background: '#064e3b', pageBreakInside: 'avoid', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
          <div>
            <div style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a7f3d0' }}>Al-Amanah Audited Portfolio Summary</div>
            <div style={{ fontSize: '12px', color: '#6ee7b7', marginTop: 2 }}>Reconciled against bank account ledgers and physical resolution books</div>
          </div>
          <div style={{ display: 'flex', gap: 18, fontFamily: 'monospace', fontSize: '15px' }}>
            <span>Total Assessed: <strong style={{ color: '#fff' }}>BDT {((report.summaryStats?.totalDemand) ?? (report.grandTotalPaid + report.grandTotalDue)).toLocaleString()}</strong></span>
            <span style={{ color: '#a7f3d0', fontWeight: 700 }}>Settled: BDT {report.grandTotalPaid.toLocaleString()}</span>
            <span style={{ color: report.grandTotalDue > 0 ? '#fde68a' : '#6ee7b7', fontWeight: 700 }}>Net Due: BDT {report.grandTotalDue.toLocaleString()}</span>
          </div>
        </div>

        {/* 5. SIGNATURES */}
        <div style={{ marginTop: 22, paddingTop: 12, borderTop: '1px solid #a7f3d0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36, pageBreakInside: 'avoid' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Accounts &amp; Record Verification</div>
            <div style={{ paddingTop: 24, borderBottom: '1px solid #cbd5e1' }}></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#334155', marginTop: 4 }}>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>Executive Finance Desk</span>
              <span style={{ fontFamily: 'monospace', color: '#047857' }}>Verified Cleared</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>President / Authorized Board Signatory</div>
            <div style={{ paddingTop: 24, borderBottom: '1px solid #cbd5e1' }}></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#334155', marginTop: 4 }}>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>Al-Amanah Executive Council</span>
              <span style={{ fontFamily: 'monospace', color: '#047857' }}>Approved • Sealed</span>
            </div>
          </div>
        </div>

        {/* Micro-Footer */}
        <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'monospace' }}>
          <span>Al-Amanah Savings &amp; Welfare Society • Electronic Ledger Document</span>
          <span>Munshihati, Kamrangirchar, Dhaka – 1211</span>
          <span>Immutable Audit Record</span>
        </div>
      </div>
    </div>
  );
}
