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
  isPartial?: boolean;
}

export interface PrintMonthSection {
  monthTitle: string;
  campaignTrxNo?: string;
  subTotalPaid: number;
  subTotalDue: number;
  subTotalAssessed?: number;
  paymentMethod?: string;
  billingDueDate?: string;
  settledTime?: string;
  slipReceivedTime?: string;
  confirmedBy?: string;
  confirmedRole?: string;
  adminComment?: string;
  memberComment?: string;
  previousReferences?: string[];
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
  report?: PrintingReportData | null;
  preview?: boolean;
}

/**
 * SAMPLE 3-MEMBER DATASET (40 Transactions, 8 Billing Cycles)
 * Used for live preview and testing design layouts.
 */
export const SAMPLE_3_MEMBER_REPORT: PrintingReportData = {
  level: 1,
  title: 'Consolidated General Ledger & Subscription Audit Report',
  subtitle: 'Fiscal Period Q3-2026 (July 2026 – September 2026)',
  date: 'September 01, 2026',
  summaryStats: {
    totalDemand: 125000,
    totalPaid: 113500,
    totalDue: 11500,
    recoveryRate: 90.8,
    totalMembers: 3,
    totalRecords: 40,
    paidCount: 36,
    dueCount: 4,
  },
  grandTotalPaid: 113500,
  grandTotalDue: 11500,
  totalRecords: 40,
  sections: [
    // MEMBER 1: ABDULLAH AL MAMUN — 3 Billing Cycles
    {
      memberId: 'MEM-001',
      memberNo: 'MEM-001',
      memberName: 'ABDULLAH AL MAMUN',
      memberRole: 'General Member',
      memberHeader: 'ABDULLAH AL MAMUN',
      memberSubHeader: 'General Member • আল-আমানাহ সাধারণ সদস্য • Phone: 01711-000001',
      memberTotalAssessed: 45000,
      memberTotalPaid: 42000,
      memberTotalDue: 3000,
      monthSections: [
        {
          monthTitle: 'JULY 2026',
          campaignTrxNo: 'CAM-2026-07',
          subTotalAssessed: 15000,
          subTotalPaid: 15000,
          subTotalDue: 0,
          paymentMethod: 'Bank Transfer (Islami Bank)',
          billingDueDate: '2026-07-01',
          settledTime: '02 Jul 2026, 11:30 AM',
          confirmedBy: 'Super Admin',
          confirmedRole: 'Super Admin #1',
          rows: [
            { serial: 1, date: '2026-07-02', description: 'Monthly contribution', transactionNo: 'TXN-101', refNo: 'REF-1001', status: 'paid', assessedAmount: 5000, paidAmount: 5000, dueAmount: 0 },
            { serial: 2, date: '2026-07-10', description: 'Welfare contribution', transactionNo: 'TXN-102', refNo: 'REF-1002', status: 'paid', assessedAmount: 3000, paidAmount: 3000, dueAmount: 0 },
            { serial: 3, date: '2026-07-16', description: 'Savings contribution', transactionNo: 'TXN-103', refNo: 'REF-1003', status: 'paid', assessedAmount: 4000, paidAmount: 4000, dueAmount: 0 },
            { serial: 4, date: '2026-07-22', description: 'Education Fund Aid', transactionNo: 'TXN-104', refNo: 'REF-1004', status: 'paid', assessedAmount: 1500, paidAmount: 1500, dueAmount: 0 },
            { serial: 5, date: '2026-07-29', description: 'Emergency Medical Reserve', transactionNo: 'TXN-105', refNo: 'REF-1005', status: 'paid', assessedAmount: 1500, paidAmount: 1500, dueAmount: 0 },
          ],
        },
        {
          monthTitle: 'AUGUST 2026',
          campaignTrxNo: 'CAM-2026-08',
          subTotalAssessed: 15000,
          subTotalPaid: 12000,
          subTotalDue: 3000,
          paymentMethod: 'bKash Merchant',
          billingDueDate: '2026-08-01',
          settledTime: '01 Aug 2026, 04:15 PM',
          confirmedBy: 'Accountant Staff',
          confirmedRole: 'Accountant #2',
          rows: [
            { serial: 1, date: '2026-08-01', description: 'Monthly contribution', transactionNo: 'TXN-106', refNo: 'REF-1001', status: 'paid', assessedAmount: 5000, paidAmount: 5000, dueAmount: 0 },
            { serial: 2, date: '2026-08-15', description: 'Welfare contribution', transactionNo: 'TXN-107', refNo: 'REF-1002', status: 'due', assessedAmount: 3000, paidAmount: 0, dueAmount: 3000 },
            { serial: 3, date: '2026-08-25', description: 'Savings contribution', transactionNo: 'TXN-108', refNo: 'REF-1003', status: 'paid', assessedAmount: 4000, paidAmount: 4000, dueAmount: 0 },
            { serial: 4, date: '2026-08-28', description: 'Education Fund Aid', transactionNo: 'TXN-109', refNo: 'REF-1004', status: 'paid', assessedAmount: 1500, paidAmount: 1500, dueAmount: 0 },
            { serial: 5, date: '2026-08-30', description: 'Community Sanitation Drive', transactionNo: 'TXN-110', refNo: 'REF-1005', status: 'paid', assessedAmount: 1500, paidAmount: 1500, dueAmount: 0 },
          ],
        },
        {
          monthTitle: 'SEPTEMBER 2026',
          campaignTrxNo: 'CAM-2026-09',
          subTotalAssessed: 15000,
          subTotalPaid: 15000,
          subTotalDue: 0,
          paymentMethod: 'Cash Deposit',
          billingDueDate: '2026-09-01',
          settledTime: '01 Sep 2026, 10:00 AM',
          confirmedBy: 'Super Admin',
          confirmedRole: 'Super Admin #1',
          rows: [
            { serial: 1, date: '2026-09-01', description: 'Monthly contribution', transactionNo: 'TXN-111', refNo: 'REF-1001', status: 'paid', assessedAmount: 5000, paidAmount: 5000, dueAmount: 0 },
            { serial: 2, date: '2026-09-08', description: 'Welfare contribution', transactionNo: 'TXN-112', refNo: 'REF-1002', status: 'paid', assessedAmount: 3000, paidAmount: 3000, dueAmount: 0 },
            { serial: 3, date: '2026-09-15', description: 'Savings contribution', transactionNo: 'TXN-113', refNo: 'REF-1003', status: 'paid', assessedAmount: 4000, paidAmount: 4000, dueAmount: 0 },
            { serial: 4, date: '2026-09-22', description: 'Education Fund Aid', transactionNo: 'TXN-114', refNo: 'REF-1004', status: 'paid', assessedAmount: 1500, paidAmount: 1500, dueAmount: 0 },
            { serial: 5, date: '2026-09-28', description: 'Quarterly Maintenance Fee', transactionNo: 'TXN-115', refNo: 'REF-1005', status: 'paid', assessedAmount: 1500, paidAmount: 1500, dueAmount: 0 },
          ],
        },
      ],
    },

    // MEMBER 2: MD. RAKIB HASAN — 2 Billing Cycles
    {
      memberId: 'MEM-002',
      memberNo: 'MEM-002',
      memberName: 'MD. RAKIB HASAN',
      memberRole: 'General Member',
      memberHeader: 'MD. RAKIB HASAN',
      memberSubHeader: 'General Member • আল-আমানাহ সাধারণ সদস্য • Phone: 01819-000002',
      memberTotalAssessed: 38000,
      memberTotalPaid: 33500,
      memberTotalDue: 4500,
      monthSections: [
        {
          monthTitle: 'AUGUST 2026',
          campaignTrxNo: 'CAM-2026-08',
          subTotalAssessed: 19000,
          subTotalPaid: 14500,
          subTotalDue: 4500,
          paymentMethod: 'bKash / Nagad',
          billingDueDate: '2026-08-01',
          settledTime: '02 Aug 2026, 03:20 PM',
          rows: [
            { serial: 1, date: '2026-08-02', description: 'Monthly contribution', transactionNo: 'TXN-201', refNo: 'REF-2001', status: 'paid', assessedAmount: 9000, paidAmount: 9000, dueAmount: 0 },
            { serial: 2, date: '2026-08-16', description: 'Welfare contribution', transactionNo: 'TXN-202', refNo: 'REF-2002', status: 'partial', isPartial: true, assessedAmount: 4000, paidAmount: 1500, dueAmount: 2500 },
            { serial: 3, date: '2026-08-20', description: 'Savings contribution', transactionNo: 'TXN-203', refNo: 'REF-2003', status: 'paid', assessedAmount: 2000, paidAmount: 2000, dueAmount: 0 },
            { serial: 4, date: '2026-08-26', description: 'Education Support Fund', transactionNo: 'TXN-204', refNo: 'REF-2004', status: 'paid', assessedAmount: 2000, paidAmount: 2000, dueAmount: 0 },
            { serial: 5, date: '2026-08-30', description: 'Community Welfare Levy', transactionNo: 'TXN-205', refNo: 'REF-2005', status: 'due', assessedAmount: 2000, paidAmount: 0, dueAmount: 2000 },
          ],
        },
        {
          monthTitle: 'SEPTEMBER 2026',
          campaignTrxNo: 'CAM-2026-09',
          subTotalAssessed: 19000,
          subTotalPaid: 19000,
          subTotalDue: 0,
          paymentMethod: 'Bank Deposit',
          billingDueDate: '2026-09-01',
          settledTime: '03 Sep 2026, 12:45 PM',
          rows: [
            { serial: 1, date: '2026-09-03', description: 'Monthly contribution', transactionNo: 'TXN-206', refNo: 'REF-2001', status: 'paid', assessedAmount: 9000, paidAmount: 9000, dueAmount: 0 },
            { serial: 2, date: '2026-09-10', description: 'Welfare contribution', transactionNo: 'TXN-207', refNo: 'REF-2002', status: 'paid', assessedAmount: 4000, paidAmount: 4000, dueAmount: 0 },
            { serial: 3, date: '2026-09-17', description: 'Savings contribution', transactionNo: 'TXN-208', refNo: 'REF-2003', status: 'paid', assessedAmount: 2000, paidAmount: 2000, dueAmount: 0 },
            { serial: 4, date: '2026-09-24', description: 'Education Support Fund', transactionNo: 'TXN-209', refNo: 'REF-2004', status: 'paid', assessedAmount: 2000, paidAmount: 2000, dueAmount: 0 },
            { serial: 5, date: '2026-09-30', description: 'Digital Services Subscription', transactionNo: 'TXN-210', refNo: 'REF-2005', status: 'paid', assessedAmount: 2000, paidAmount: 2000, dueAmount: 0 },
          ],
        },
      ],
    },

    // MEMBER 3: SABBIR AHMED — 3 Billing Cycles
    {
      memberId: 'MEM-003',
      memberNo: 'MEM-003',
      memberName: 'SABBIR AHMED',
      memberRole: 'General Member',
      memberHeader: 'SABBIR AHMED',
      memberSubHeader: 'General Member • আল-আমানাহ সাধারণ সদস্য • Phone: 01912-000003',
      memberTotalAssessed: 42000,
      memberTotalPaid: 38000,
      memberTotalDue: 4000,
      monthSections: [
        {
          monthTitle: 'JULY 2026',
          campaignTrxNo: 'CAM-2026-07',
          subTotalAssessed: 14000,
          subTotalPaid: 14000,
          subTotalDue: 0,
          paymentMethod: 'Cash',
          billingDueDate: '2026-07-01',
          settledTime: '04 Jul 2026, 02:00 PM',
          rows: [
            { serial: 1, date: '2026-07-04', description: 'Monthly contribution', transactionNo: 'TXN-301', refNo: 'REF-3001', status: 'paid', assessedAmount: 8000, paidAmount: 8000, dueAmount: 0 },
            { serial: 2, date: '2026-07-12', description: 'Welfare contribution', transactionNo: 'TXN-302', refNo: 'REF-3002', status: 'paid', assessedAmount: 2000, paidAmount: 2000, dueAmount: 0 },
            { serial: 3, date: '2026-07-18', description: 'Savings contribution', transactionNo: 'TXN-303', refNo: 'REF-3003', status: 'paid', assessedAmount: 2000, paidAmount: 2000, dueAmount: 0 },
            { serial: 4, date: '2026-07-24', description: 'Youth IT Skill Fund', transactionNo: 'TXN-304', refNo: 'REF-3004', status: 'paid', assessedAmount: 1000, paidAmount: 1000, dueAmount: 0 },
            { serial: 5, date: '2026-07-30', description: 'Healthcare Aid Levy', transactionNo: 'TXN-305', refNo: 'REF-3005', status: 'paid', assessedAmount: 1000, paidAmount: 1000, dueAmount: 0 },
          ],
        },
        {
          monthTitle: 'AUGUST 2026',
          campaignTrxNo: 'CAM-2026-08',
          subTotalAssessed: 14000,
          subTotalPaid: 10000,
          subTotalDue: 4000,
          paymentMethod: 'bKash',
          billingDueDate: '2026-08-01',
          settledTime: '03 Aug 2026, 05:10 PM',
          rows: [
            { serial: 1, date: '2026-08-03', description: 'Monthly contribution', transactionNo: 'TXN-306', refNo: 'REF-3001', status: 'paid', assessedAmount: 8000, paidAmount: 8000, dueAmount: 0 },
            { serial: 2, date: '2026-08-20', description: 'Welfare contribution', transactionNo: 'TXN-307', refNo: 'REF-3002', status: 'due', assessedAmount: 4000, paidAmount: 0, dueAmount: 4000 },
            { serial: 3, date: '2026-08-24', description: 'Savings contribution', transactionNo: 'TXN-308', refNo: 'REF-3003', status: 'paid', assessedAmount: 1000, paidAmount: 1000, dueAmount: 0 },
            { serial: 4, date: '2026-08-27', description: 'Youth IT Skill Fund', transactionNo: 'TXN-309', refNo: 'REF-3004', status: 'paid', assessedAmount: 500, paidAmount: 500, dueAmount: 0 },
            { serial: 5, date: '2026-08-31', description: 'Healthcare Aid Levy', transactionNo: 'TXN-310', refNo: 'REF-3005', status: 'paid', assessedAmount: 500, paidAmount: 500, dueAmount: 0 },
          ],
        },
        {
          monthTitle: 'SEPTEMBER 2026',
          campaignTrxNo: 'CAM-2026-09',
          subTotalAssessed: 14000,
          subTotalPaid: 14000,
          subTotalDue: 0,
          paymentMethod: 'Bank Transfer',
          billingDueDate: '2026-09-01',
          settledTime: '02 Sep 2026, 09:40 AM',
          rows: [
            { serial: 1, date: '2026-09-02', description: 'Monthly contribution', transactionNo: 'TXN-311', refNo: 'REF-3001', status: 'paid', assessedAmount: 8000, paidAmount: 8000, dueAmount: 0 },
            { serial: 2, date: '2026-09-09', description: 'Welfare contribution', transactionNo: 'TXN-312', refNo: 'REF-3002', status: 'paid', assessedAmount: 2000, paidAmount: 2000, dueAmount: 0 },
            { serial: 3, date: '2026-09-16', description: 'Savings contribution', transactionNo: 'TXN-313', refNo: 'REF-3003', status: 'paid', assessedAmount: 2000, paidAmount: 2000, dueAmount: 0 },
            { serial: 4, date: '2026-09-23', description: 'Youth IT Skill Fund', transactionNo: 'TXN-314', refNo: 'REF-3004', status: 'paid', assessedAmount: 1000, paidAmount: 1000, dueAmount: 0 },
            { serial: 5, date: '2026-09-29', description: 'Annual Welfare Audit Fee', transactionNo: 'TXN-315', refNo: 'REF-3005', status: 'paid', assessedAmount: 1000, paidAmount: 1000, dueAmount: 0 },
          ],
        },
      ],
    },
  ],
};

/**
 * Standalone, high-fidelity printable financial statement and receipt component for Al-Amanah.
 * Strictly formatted for A4 print and aligned with /admin/receipts for single month views.
 */
export function ReportPrintArea({ report, preview = false }: ReportPrintAreaProps) {
  // Use passed report if available; otherwise use SAMPLE_3_MEMBER_REPORT in preview mode
  const activeReport = report || (preview ? SAMPLE_3_MEMBER_REPORT : null);
  if (!activeReport) return null;

  const totalDemand =
    activeReport.summaryStats?.totalDemand ?? (activeReport.grandTotalPaid + activeReport.grandTotalDue);
  const recoveryRate =
    activeReport.summaryStats?.recoveryRate ??
    (totalDemand > 0 ? (activeReport.grandTotalPaid / totalDemand) * 100 : 100);

  const formatBDT = (amount: number = 0) =>
    `৳ ${amount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const activeSections = (activeReport.sections || []).filter(
    (sec) => sec.monthSections && sec.monthSections.some((ms) => ms.rows && ms.rows.length > 0)
  );

  const totalBillingCycles = activeSections.reduce(
    (acc, sec) => acc + (sec.monthSections?.length || 0),
    0
  );

  const documentId = `AM-STMT-${activeReport.level === 1 ? 'ALL' : (activeReport.sections[0]?.memberNo || '001')}-2026`;

  // =========================================================================
  // LEVEL 3: FULL-FIDELITY OFFICIAL MONEY RECEIPT (MATCHING /admin/receipts PRINT)
  // =========================================================================
  if (activeReport.level === 3) {
    const memberSec = activeSections[0];
    const monthSec = memberSec?.monthSections[0];
    const isPaid = (monthSec?.subTotalDue || 0) === 0 && (monthSec?.subTotalPaid || 0) > 0;
    const isPartial = (monthSec?.subTotalDue || 0) > 0 && (monthSec?.subTotalPaid || 0) > 0;
    const isDue = (monthSec?.subTotalPaid || 0) === 0;

    const displayReceiptNo =
      monthSec?.campaignTrxNo ||
      `RCT-${memberSec?.memberNo || '001'}-${(monthSec?.monthTitle || 'MONTH').replace(/\s+/g, '-')}`;

    const billingDueDate = monthSec?.billingDueDate || activeReport.date;
    const settledTime = monthSec?.settledTime || activeReport.date;
    const slipReceivedTime = monthSec?.slipReceivedTime;
    const staffName = monthSec?.confirmedBy || 'Super Admin';
    const staffRole = monthSec?.confirmedRole || 'Super Admin #1';
    const paymentMethod = monthSec?.paymentMethod || 'Cash / Bank';
    const firstRowRef = monthSec?.rows?.find((r) => r.refNo && r.refNo !== '-')?.refNo || '-';

    const installmentAmount = monthSec?.subTotalPaid || 0;
    const totalTargetAmount = monthSec?.subTotalAssessed ?? ((monthSec?.subTotalPaid || 0) + (monthSec?.subTotalDue || 0));
    const remainingDueAmount = monthSec?.subTotalDue || 0;

    return (
      <div
        className={
          preview
            ? 'w-full max-w-2xl mx-auto font-sans bg-white p-8 border border-slate-300 rounded-lg shadow-lg text-slate-900'
            : 'hidden print:block bg-white p-8 max-w-2xl mx-auto text-slate-900 font-sans'
        }
        style={{
          boxSizing: 'border-box',
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
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
                  {`AM-STMT-${memberSec?.memberNo || '001'}-2026`}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginTop: '3px' }}>
                <span style={{ color: '#475569', fontWeight: 600 }}>Issue Date:</span>
                <span className="mono-figures" style={{ fontWeight: 700, color: '#0f172a' }}>{activeReport.date}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginTop: '3px' }}>
                <span style={{ color: '#475569', fontWeight: 600, paddingRight: '4px' }}>Scope:</span>
                <span style={{ fontWeight: 700, color: '#047857' }}>
                  1 Member (1 Billing Cycle)
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
                {activeReport.title}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '8px', fontWeight: 600, color: '#a7f3d0', textTransform: 'uppercase', marginBottom: '1px' }}>Billing Period</div>
              <div style={{ fontSize: '10.5px', fontWeight: 600, color: '#e2e8f0' }}>
                {monthSec?.monthTitle || 'Current Month'}
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

        {/* 2. Paid / Partially Paid Status Stamp & Top Meta */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
          <div>
            <div className="text-xs text-slate-500 uppercase font-semibold">Receipt No</div>
            <div className="text-base font-bold font-mono text-slate-900">{displayReceiptNo}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Billing Due: <span className="font-semibold text-slate-700">{billingDueDate}</span>
            </div>
          </div>

          {/* Prominent Status Badge */}
          {isPartial ? (
            <div className="border-2 border-purple-700 bg-purple-50 px-4 py-1.5 rounded text-center">
              <span className="text-sm font-black text-purple-900 tracking-widest uppercase block">
                ⚡ PARTIALLY PAID
              </span>
              <span className="text-[10px] text-purple-700 font-semibold uppercase block">
                Status: Partial Settlement
              </span>
            </div>
          ) : isPaid ? (
            <div className="border-2 border-emerald-700 bg-emerald-50 px-4 py-1.5 rounded text-center">
              <span className="text-sm font-black text-emerald-800 tracking-widest uppercase block">
                ✓ PAID
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold uppercase block">
                Status: Cleared in Full
              </span>
            </div>
          ) : (
            <div className="border-2 border-amber-700 bg-amber-50 px-4 py-1.5 rounded text-center">
              <span className="text-sm font-black text-amber-800 tracking-widest uppercase block">
                ⏳ OUTSTANDING DUE
              </span>
              <span className="text-[10px] text-amber-700 font-semibold uppercase block">
                Status: Pending Collection
              </span>
            </div>
          )}

          <div className="text-right">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Settled Date &amp; Time</div>
            <div className="text-xs font-bold text-slate-900 font-mono">{settledTime}</div>
            {slipReceivedTime && (
              <div className="text-[10px] text-blue-800 font-medium mt-0.5">
                Slip Received: <span className="font-mono">{slipReceivedTime}</span>
              </div>
            )}
          </div>
        </div>

        {/* 3. Receipt Details Table (Key-Value Rows) */}
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-1.5 border-b border-slate-100 items-center">
            <span className="text-slate-600 font-medium">Received From (Member):</span>
            <span className="font-bold text-slate-900">
              {memberSec?.memberName || memberSec?.memberHeader} {memberSec?.memberNo ? `(${memberSec.memberNo})` : ''}
            </span>
          </div>

          <div className="flex justify-between py-1.5 border-b border-slate-100 items-center">
            <span className="text-slate-600 font-medium">Settled / Confirmed By:</span>
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <span>{staffName}</span>
              <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 uppercase">
                {staffRole}
              </span>
            </span>
          </div>

          <div className="flex justify-between py-1.5 border-b border-slate-100 items-center">
            <span className="text-slate-600 font-medium">Settlement Date &amp; Time:</span>
            <span className="font-mono font-bold text-emerald-900 text-xs">
              {settledTime}
            </span>
          </div>

          {slipReceivedTime && (
            <div className="flex justify-between py-1.5 border-b border-slate-100 items-center">
              <span className="text-slate-600 font-medium">Payment Slip Received Time:</span>
              <span className="font-mono font-semibold text-blue-900 text-xs">
                {slipReceivedTime}
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
                <span className="text-slate-900 font-bold">{firstRowRef}</span>
                <span className="text-xs font-bold text-purple-900 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                  BDT {installmentAmount.toLocaleString()}
                </span>
                {isPartial && (
                  <span className="text-[10px] text-purple-700 font-semibold uppercase tracking-wide">
                    (This Installment)
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-between py-1.5 border-b border-slate-100">
            <span className="text-slate-600 font-medium">Payment Purpose / Month:</span>
            <span className="font-medium text-slate-800">
              {monthSec?.monthTitle || 'Monthly / Society Contribution'}
            </span>
          </div>

          <div className="flex justify-between py-1.5 border-b border-slate-100">
            <span className="text-slate-600 font-medium">Payment Method:</span>
            <span className="capitalize font-semibold text-slate-800">
              {paymentMethod}
            </span>
          </div>

          <div className="flex justify-between py-1.5 border-b border-slate-100">
            <span className="text-slate-600 font-medium">Payment Status:</span>
            <span className={`font-bold uppercase ${isPartial ? 'text-purple-800' : isPaid ? 'text-emerald-700' : 'text-amber-800'}`}>
              {isPartial ? 'Partially Paid (Installment)' : isPaid ? 'Paid in Full' : 'Outstanding Due'}
            </span>
          </div>

          {monthSec?.adminComment && (
            <div className="flex justify-between py-2 border-b border-slate-100 items-start bg-slate-50/50 px-2 rounded-md my-0.5">
              <span className="text-slate-700 font-bold text-xs uppercase tracking-wide flex items-center gap-1">
                Admin / Accountant Comments:
              </span>
              <span className="font-semibold text-slate-900 text-right max-w-[65%] text-xs leading-relaxed">
                {monthSec.adminComment}
              </span>
            </div>
          )}

          {monthSec?.memberComment && (
            <div className="flex justify-between py-1.5 border-b border-slate-100 items-start">
              <span className="text-slate-600 font-medium">Member Comment / Note:</span>
              <span className="font-medium text-slate-700 italic text-right max-w-[65%]">
                &ldquo;{monthSec.memberComment}&rdquo;
              </span>
            </div>
          )}
        </div>

        {/* 4. Itemized Transaction Breakdown Table (if multiple rows exist) */}
        {monthSec && monthSec.rows && monthSec.rows.length > 1 && (
          <div className="mt-5">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Itemized Subscription Breakdown
            </div>
            <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '10.5px', border: '1px solid #cbd5e1' }}>
              <thead>
                <tr style={{ backgroundColor: '#064e3b', color: '#ffffff', textTransform: 'uppercase', fontSize: '8.5px', fontWeight: 800, letterSpacing: '0.03em' }}>
                  <th style={{ width: '6%', padding: '5px 4px', textAlign: 'center', border: '1px solid #047857' }}>#</th>
                  <th style={{ width: '15%', padding: '5px 6px', textAlign: 'left', border: '1px solid #047857' }}>Date</th>
                  <th style={{ width: '31%', padding: '5px 6px', textAlign: 'left', border: '1px solid #047857' }}>Reference ID</th>
                  <th style={{ width: '12%', padding: '5px 4px', textAlign: 'center', border: '1px solid #047857' }}>Status</th>
                  <th style={{ width: '12%', padding: '5px 6px', textAlign: 'right', border: '1px solid #047857' }}>Assessed</th>
                  <th style={{ width: '12%', padding: '5px 6px', textAlign: 'right', border: '1px solid #047857' }}>Settled</th>
                  <th style={{ width: '12%', padding: '5px 6px', textAlign: 'right', border: '1px solid #047857' }}>Due</th>
                </tr>
              </thead>
              <tbody>
                {monthSec.rows.map((row, rIdx) => {
                  const st = (row.status || '').toLowerCase();
                  const isRPaid = (st.includes('paid') || st.includes('settled') || row.paidAmount > 0) && row.dueAmount === 0 && !row.isPartial;
                  const isRPartial = row.isPartial || st.includes('partial');
                  const isRRejected = st.includes('rejected');

                  return (
                    <tr
                      key={rIdx}
                      style={{
                        backgroundColor: rIdx % 2 === 1 ? '#f8fafc' : '#ffffff',
                        borderBottom: '1px solid #e2e8f0',
                      }}
                    >
                      <td className="mono-figures" style={{ padding: '5px 4px', textAlign: 'center', color: '#64748b', border: '1px solid #e2e8f0', fontWeight: 600 }}>
                        {row.serial}
                      </td>
                      <td className="mono-figures" style={{ padding: '5px 6px', color: '#334155', border: '1px solid #e2e8f0', fontWeight: 600 }}>
                        {row.date}
                      </td>
                      <td className="mono-figures" style={{ padding: '5px 6px', border: '1px solid #e2e8f0', color: '#0f172a', fontWeight: 700, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                        {row.refNo && row.refNo !== '-' ? row.refNo : '-'}
                      </td>
                      <td style={{ padding: '5px 4px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '1px 5px',
                            borderRadius: '9999px',
                            fontSize: '8px',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            backgroundColor: isRPaid ? '#d1fae5' : isRPartial ? '#f3e8ff' : isRRejected ? '#fee2e2' : '#fef3c7',
                            color: isRPaid ? '#065f46' : isRPartial ? '#6b21a8' : isRRejected ? '#991b1b' : '#92400e',
                            border: `1px solid ${isRPaid ? '#10b981' : isRPartial ? '#a855f7' : isRRejected ? '#ef4444' : '#f59e0b'}`,
                          }}
                        >
                          {isRPaid ? 'Settled' : isRPartial ? 'Partial' : isRRejected ? 'Rejected' : 'Pending'}
                        </span>
                      </td>
                      <td className="mono-figures" style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 700, color: '#0f172a', border: '1px solid #e2e8f0' }}>
                        {formatBDT(row.assessedAmount ?? (row.paidAmount + row.dueAmount))}
                      </td>
                      <td className="mono-figures" style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 800, color: '#047857', border: '1px solid #e2e8f0' }}>
                        {row.paidAmount > 0 ? formatBDT(row.paidAmount) : '—'}
                      </td>
                      <td className="mono-figures" style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 800, color: row.dueAmount > 0 ? '#b45309' : '#64748b', border: '1px solid #e2e8f0' }}>
                        {row.dueAmount > 0 ? formatBDT(row.dueAmount) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Amount Breakdown Box (Exact layout from /admin/receipts) */}
        {isPartial ? (
          <div className="mt-6 p-4 rounded-lg bg-purple-50/60 border border-purple-200 space-y-2">
            <div className="flex justify-between items-center pb-2 border-b border-purple-200/80">
              <span className="text-xs font-bold text-purple-900 uppercase tracking-wide">Paid (This Installment):</span>
              <span className="text-lg font-black text-purple-950 font-mono">
                BDT {installmentAmount.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs text-emerald-800 pt-0.5">
              <span className="font-bold">Total Paid (Cumulative):</span>
              <span className="font-bold font-mono text-emerald-900">
                BDT {installmentAmount.toLocaleString()}
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

        {/* 6. Footer Signatures & Staff Audit Details (Exact layout from /admin/receipts) */}
        <div className="mt-16 pt-6 flex justify-between text-xs text-slate-700">
          <div className="text-center w-56">
            <div className="border-t-2 border-slate-800 pt-1.5 font-bold text-slate-900 text-sm">
              {staffName}
            </div>
            <div className="text-[11px] text-emerald-900 font-semibold capitalize mt-0.5">
              {staffRole}
            </div>
            <div className="text-[10px] text-slate-600 font-mono mt-0.5">
              Settled: {settledTime}
            </div>
            <span className="text-[9px] text-slate-500 uppercase tracking-wider block mt-1 font-bold">
              Authorized Collector / Settled By
            </span>
          </div>

          <div className="text-center w-56">
            <div className="border-t-2 border-slate-800 pt-1.5 font-bold text-slate-900 text-sm">
              {memberSec?.memberName || 'Member'}
            </div>
            <div className="text-[11px] text-slate-700 font-medium mt-0.5">
              Member ID: {memberSec?.memberNo || 'Unassigned'}
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

  // =========================================================================
  // LEVEL 1 & 2: FULL AUDITED FINANCIAL STATEMENT & FOLIO LEDGER
  // =========================================================================
  return (
    <div
      className={
        preview
          ? 'w-full max-w-[210mm] mx-auto font-sans'
          : 'hidden print:block print:w-full bg-white text-slate-900 mx-auto font-sans'
      }
      style={{
        width: '100%',
        boxSizing: 'border-box',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;600;700;800&display=swap');

        /* 1. Global Box-Sizing & A4 Dimensions */
        *, *::before, *::after {
          box-sizing: border-box !important;
        }

        .statement-sheet-page {
          width: 210mm;
          max-width: 100%;
          min-height: 297mm;
          background: #ffffff !important;
          color: #0f172a !important;
          box-sizing: border-box;
          padding: 8mm 10mm;
          display: flex;
          flex-direction: column;
          position: relative;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }

        .mono-figures {
          font-family: 'JetBrains Mono', monospace !important;
          font-variant-numeric: tabular-nums;
          white-space: nowrap !important;
        }

        .bengali-font {
          font-family: 'Hind Siliguri', sans-serif !important;
        }

        /* 2. Strict A4 Print Stylesheet with Repeating Continued Headers */
        @media print {
          @page {
            size: A4 portrait !important;
            margin: 6mm 8mm !important;
          }

          html, body, #__next, .min-h-screen, .print-preview-container {
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .statement-sheet-page {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
            padding: 0 !important;
            margin: 0 auto !important;
            page-break-inside: auto !important;
          }

          .member-folio-container {
            page-break-inside: auto !important;
            break-inside: auto !important;
            overflow: visible !important;
            margin-top: 10px !important;
            margin-bottom: 10px !important;
          }

          .member-folio-container:first-of-type,
          .member-folio-container:first-child {
            margin-top: 0 !important;
            page-break-before: auto !important;
            break-before: auto !important;
          }

          .member-folio-container:not(:first-child),
          .print-page-break-before {
            page-break-before: always !important;
            break-before: page !important;
            margin-top: 0 !important;
          }

          .member-master-table {
            width: 100% !important;
            max-width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
          }

          .member-master-table > thead {
            display: table-header-group !important;
          }

          .member-master-table > tbody {
            display: table-row-group !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
          }

          .month-row {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .month-cycle-container {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-bottom: 8px !important;
          }

          .member-header-banner {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          .grand-summary-bar, .signature-section {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          table {
            width: 100% !important;
            max-width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
          }

          thead {
            display: table-header-group !important;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `,
        }}
      />

      <div
        className="statement-sheet-page"
        style={{
          boxShadow: preview ? '0 20px 40px -15px rgba(0,0,0,0.15)' : 'none',
          borderRadius: preview ? '8px' : '0',
          border: preview ? '1px solid #cbd5e1' : 'none',
          margin: '0 auto',
        }}
      >
        {/* ========================================================================= */}
        {/* 1. MASTER LETTERHEAD & EXECUTIVE METADATA                                  */}
        {/* ========================================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
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
                <span className="mono-figures" style={{ fontWeight: 700, color: '#0f172a' }}>{activeReport.date}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginTop: '3px' }}>
                <span style={{ color: '#475569', fontWeight: 600, paddingRight: '4px' }}>Scope:</span>
                <span style={{ fontWeight: 700, color: '#047857' }}>
                  {activeSections.length} Member{activeSections.length > 1 ? 's' : ''} ({totalBillingCycles} Cycle{totalBillingCycles > 1 ? 's' : ''})
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
                {activeReport.title}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '8px', fontWeight: 600, color: '#a7f3d0', textTransform: 'uppercase', marginBottom: '1px' }}>Audit Period</div>
              <div style={{ fontSize: '10.5px', fontWeight: 600, color: '#e2e8f0' }}>
                {activeReport.subtitle || 'Fiscal Year 2026'}
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

          {/* 4-Card Executive KPI Matrix */}
          {activeReport.summaryStats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '8px' }}>
              {/* Total Demand */}
              <div style={{ border: '1.5px solid #cbd5e1', borderRadius: '6px', padding: '6px 8px', backgroundColor: '#f8fafc' }}>
                <div style={{ fontSize: '8.5px', fontWeight: 800, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.03em', marginBottom: '2px' }}>
                  Gross Demand Assessed
                </div>
                <div className="mono-figures" style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a', margin: '2px 0' }}>
                  {formatBDT(activeReport.summaryStats.totalDemand)}
                </div>
                <div style={{ fontSize: '8px', color: '#64748b', fontWeight: 600 }}>Total Assessed Dues</div>
              </div>

              {/* Collections */}
              <div style={{ border: '1.5px solid #10b981', borderRadius: '6px', padding: '6px 8px', backgroundColor: '#f0fdf4' }}>
                <div style={{ fontSize: '8.5px', fontWeight: 800, textTransform: 'uppercase', color: '#064e3b', letterSpacing: '0.03em', marginBottom: '2px' }}>
                  Realized Collections
                </div>
                <div className="mono-figures" style={{ fontSize: '14px', fontWeight: 900, color: '#047857', margin: '2px 0' }}>
                  {formatBDT(activeReport.summaryStats.totalPaid)}
                </div>
                <div style={{ fontSize: '8px', color: '#047857', fontWeight: 700 }}>
                  {recoveryRate.toFixed(1)}% Settled ({activeReport.summaryStats.paidCount ?? activeReport.totalRecords} tx)
                </div>
              </div>

              {/* Dues */}
              <div style={{ border: '1.5px solid #f59e0b', borderRadius: '6px', padding: '6px 8px', backgroundColor: '#fffbeb' }}>
                <div style={{ fontSize: '8.5px', fontWeight: 800, textTransform: 'uppercase', color: '#92400e', letterSpacing: '0.03em', marginBottom: '2px' }}>
                  Outstanding Dues
                </div>
                <div className="mono-figures" style={{ fontSize: '14px', fontWeight: 900, color: '#b45309', margin: '2px 0' }}>
                  {formatBDT(activeReport.summaryStats.totalDue)}
                </div>
                <div style={{ fontSize: '8px', color: '#b45309', fontWeight: 700 }}>
                  {activeReport.summaryStats.totalDue > 0 ? `${activeReport.summaryStats.dueCount ?? 'Pending'} Items` : 'Fully Settled'}
                </div>
              </div>

              {/* Scope */}
              <div style={{ border: '1.5px solid #64748b', borderRadius: '6px', padding: '6px 8px', backgroundColor: '#f8fafc' }}>
                <div style={{ fontSize: '8.5px', fontWeight: 800, textTransform: 'uppercase', color: '#334155', letterSpacing: '0.03em', marginBottom: '2px' }}>
                  Audited Scope
                </div>
                <div className="mono-figures" style={{ fontSize: '14px', fontWeight: 900, color: '#022c22', margin: '2px 0' }}>
                  {activeReport.summaryStats.totalMembers} <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#475569' }}>Member{activeReport.summaryStats.totalMembers > 1 ? 's' : ''}</span>
                </div>
                <div style={{ fontSize: '8px', color: '#64748b', fontWeight: 600 }}>{activeReport.summaryStats.totalRecords} Verified Records</div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 2. DYNAMIC MEMBER FOLIO SECTIONS (WITH REPEATING CONTINUED HEADERS)        */}
        {/* ========================================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {activeSections.map((sec, secIdx) => {
            const totalAssessed = sec.memberTotalAssessed ?? (sec.memberTotalPaid + sec.memberTotalDue);

            return (
              <div
                key={secIdx}
                className={secIdx > 0 ? 'member-folio-container print-page-break-before' : 'member-folio-container'}
                style={{
                  border: '1.5px solid #064e3b',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.04)',
                  marginTop: secIdx === 0 ? 0 : undefined,
                }}
              >
                {/* MASTER TABLE: thead automatically re-prints on subsequent pages if member tables spill over */}
                <table className="member-master-table" style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
                  <thead style={{ display: 'table-header-group' }}>
                    <tr>
                      <th style={{ padding: 0, fontWeight: 'normal', textAlign: 'left', border: 'none' }}>
                        {/* MEMBER HEADER (2-ROW DESIGN WITH CONTINUED MARKING) */}
                        <div
                          className="member-header-banner"
                          style={{
                            backgroundColor: '#064e3b',
                            color: '#ffffff',
                            padding: '8px 12px',
                            borderBottom: '2px solid #047857',
                          }}
                        >
                          {/* LINE 1: FULL MEMBER NAME & ID BADGE & CONTINUED BADGE */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div
                                className="bengali-font"
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '4px',
                                  backgroundColor: '#34d399',
                                  color: '#064e3b',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 800,
                                  fontSize: '13px',
                                  flexShrink: 0,
                                }}
                              >
                                {secIdx + 1}
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '13.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em', color: '#ffffff' }}>
                                    {sec.memberName || sec.memberHeader}
                                  </span>
                                  <span className="mono-figures" style={{ fontSize: '10px', fontWeight: 800, backgroundColor: '#022c22', color: '#a7f3d0', padding: '1px 6px', borderRadius: '4px', border: '1px solid #059669' }}>
                                    ID: #{sec.memberNo || `MEM-00${secIdx + 1}`}
                                  </span>
                                  {sec.memberRole && (
                                    <span style={{ fontSize: '9.5px', fontWeight: 700, backgroundColor: 'rgba(255,255,255,0.12)', color: '#d1fae5', padding: '1px 5px', borderRadius: '3px' }}>
                                      {sec.memberRole}
                                    </span>
                                  )}
                                  <span
                                    style={{
                                      fontSize: '9px',
                                      fontWeight: 800,
                                      letterSpacing: '0.03em',
                                      textTransform: 'uppercase',
                                      backgroundColor: '#047857',
                                      color: '#a7f3d0',
                                      padding: '1px 6px',
                                      borderRadius: '3px',
                                      border: '1px solid #10b981',
                                    }}
                                  >
                                    Folio Ledger (Continued)
                                  </span>
                                </div>
                                {sec.memberSubHeader && (
                                  <div className="bengali-font" style={{ fontSize: '11px', color: '#a7f3d0', marginTop: '1px', fontWeight: 500 }}>
                                    {sec.memberSubHeader}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* LINE BREAK SEPARATOR */}
                          <div style={{ borderTop: '1px solid rgba(52, 211, 153, 0.3)', margin: '6px 0 5px 0' }}></div>

                          {/* LINE 2: FINANCIAL SUMMARY CHIPS */}
                          <div className="mono-figures" style={{ display: 'flex', gap: '8px', fontSize: '10.5px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#022c22', color: '#d1fae5', border: '1px solid #059669' }}>
                              Gross Demand: <strong style={{ color: '#ffffff' }}>{formatBDT(totalAssessed)}</strong>
                            </span>
                            <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#059669', color: '#ffffff', fontWeight: 800 }}>
                              Realized Settled: {formatBDT(sec.memberTotalPaid)}
                            </span>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor: sec.memberTotalDue > 0 ? '#fef3c7' : '#047857',
                                color: sec.memberTotalDue > 0 ? '#92400e' : '#a7f3d0',
                                fontWeight: 800,
                                border: sec.memberTotalDue > 0 ? '1px solid #f59e0b' : '1px solid #059669',
                              }}
                            >
                              Outstanding Due: {formatBDT(sec.memberTotalDue)}
                            </span>
                          </div>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sec.monthSections.map((mSec, mIdx) => (
                      <tr key={mIdx} className="month-row" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <td style={{ padding: '4px 6px', border: 'none' }}>
                          <div className="month-cycle-container">
                            {/* Period Subheader Banner */}
                            <div
                              style={{
                                backgroundColor: '#ecfdf5',
                                border: '1px solid #a7f3d0',
                                borderRadius: '4px 4px 0 0',
                                padding: '6px 10px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '10.5px',
                                gap: '8px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                <span style={{ fontWeight: 800, color: '#064e3b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                                  📋 Billing Period: {mSec.monthTitle}
                                </span>
                                {mSec.campaignTrxNo && (
                                  <span className="mono-figures" style={{ fontSize: '9px', fontWeight: 700, color: '#047857', backgroundColor: '#ffffff', padding: '1px 5px', borderRadius: '3px', border: '1px solid #86efac', whiteSpace: 'nowrap' }}>
                                    Ref #{mSec.campaignTrxNo}
                                  </span>
                                )}
                              </div>
                              <div className="mono-figures" style={{ fontWeight: 800, fontSize: '10.5px', whiteSpace: 'nowrap', display: 'flex', gap: '8px' }}>
                                <span style={{ color: '#047857' }}>Settled: {formatBDT(mSec.subTotalPaid)}</span>
                                {mSec.subTotalDue > 0 && (
                                  <span style={{ color: '#b45309' }}>Due: {formatBDT(mSec.subTotalDue)}</span>
                                )}
                              </div>
                            </div>

                            {/* Data Table (Strict 100% Column Percentages) */}
                            <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '10.5px', border: '1px solid #cbd5e1' }}>
                              <thead style={{ display: 'table-header-group' }}>
                                <tr style={{ backgroundColor: '#064e3b', color: '#ffffff', textTransform: 'uppercase', fontSize: '8.5px', fontWeight: 800, letterSpacing: '0.03em' }}>
                                  <th style={{ width: '5%', padding: '5px 4px', textAlign: 'center', border: '1px solid #047857' }}>#</th>
                                  <th style={{ width: '12%', padding: '5px 6px', textAlign: 'left', border: '1px solid #047857' }}>Date</th>
                                  <th style={{ width: '35%', padding: '5px 6px', textAlign: 'left', border: '1px solid #047857' }}>Reference ID</th>
                                  <th style={{ width: '12%', padding: '5px 4px', textAlign: 'center', border: '1px solid #047857' }}>Status</th>
                                  <th style={{ width: '12%', padding: '5px 6px', textAlign: 'right', border: '1px solid #047857' }}>Assessed</th>
                                  <th style={{ width: '12%', padding: '5px 6px', textAlign: 'right', border: '1px solid #047857' }}>Settled</th>
                                  <th style={{ width: '12%', padding: '5px 6px', textAlign: 'right', border: '1px solid #047857' }}>Due</th>
                                </tr>
                              </thead>
                              <tbody>
                                {mSec.rows.map((row, rIdx) => {
                                  const st = (row.status || '').toLowerCase();
                                  const isPaid = (st.includes('paid') || st.includes('settled') || row.paidAmount > 0) && row.dueAmount === 0 && !row.isPartial;
                                  const isPartial = row.isPartial || st.includes('partial');
                                  const isRejected = st.includes('rejected');

                                  return (
                                    <tr
                                      key={rIdx}
                                      style={{
                                        backgroundColor: rIdx % 2 === 1 ? '#f8fafc' : '#ffffff',
                                        borderBottom: '1px solid #e2e8f0',
                                      }}
                                    >
                                      <td className="mono-figures" style={{ padding: '5px 4px', textAlign: 'center', color: '#64748b', border: '1px solid #e2e8f0', fontWeight: 600 }}>
                                        {row.serial}
                                      </td>
                                      <td className="mono-figures" style={{ padding: '5px 6px', color: '#334155', border: '1px solid #e2e8f0', fontWeight: 600 }}>
                                        {row.date}
                                      </td>
                                      <td className="mono-figures" style={{ padding: '5px 6px', border: '1px solid #e2e8f0', color: '#0f172a', fontWeight: 700, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                                        {row.refNo && row.refNo !== '-' ? row.refNo : '-'}
                                      </td>
                                      <td style={{ padding: '5px 4px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                                        <span
                                          style={{
                                            display: 'inline-block',
                                            padding: '2px 5px',
                                            borderRadius: '9999px',
                                            fontSize: '8.5px',
                                            fontWeight: 800,
                                            textTransform: 'uppercase',
                                            backgroundColor: isPaid ? '#d1fae5' : isPartial ? '#f3e8ff' : isRejected ? '#fee2e2' : '#fef3c7',
                                            color: isPaid ? '#065f46' : isPartial ? '#6b21a8' : isRejected ? '#991b1b' : '#92400e',
                                            border: `1px solid ${isPaid ? '#10b981' : isPartial ? '#a855f7' : isRejected ? '#ef4444' : '#f59e0b'}`,
                                          }}
                                        >
                                          {isPaid ? 'Settled' : isPartial ? 'Partial' : isRejected ? 'Rejected' : 'Pending'}
                                        </span>
                                      </td>
                                      <td className="mono-figures" style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 700, color: '#0f172a', border: '1px solid #e2e8f0' }}>
                                        {formatBDT(row.assessedAmount ?? (row.paidAmount + row.dueAmount))}
                                      </td>
                                      <td className="mono-figures" style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 800, color: '#047857', border: '1px solid #e2e8f0' }}>
                                        {row.paidAmount > 0 ? formatBDT(row.paidAmount) : '—'}
                                      </td>
                                      <td className="mono-figures" style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 800, color: row.dueAmount > 0 ? '#b45309' : '#64748b', border: '1px solid #e2e8f0' }}>
                                        {row.dueAmount > 0 ? formatBDT(row.dueAmount) : '—'}
                                      </td>
                                    </tr>
                                  );
                                })}

                                {/* Subtotal Row */}
                                <tr style={{ backgroundColor: '#ecfdf5', fontWeight: 800, borderTop: '2px solid #059669', borderBottom: '2px solid #059669' }}>
                                  <td colSpan={4} style={{ padding: '6px 8px', textAlign: 'right', color: '#064e3b', textTransform: 'uppercase', fontSize: '9.5px', border: '1px solid #a7f3d0' }}>
                                    {mSec.monthTitle} Period Subtotal:
                                  </td>
                                  <td className="mono-figures" style={{ padding: '6px 6px', textAlign: 'right', color: '#022c22', border: '1px solid #a7f3d0' }}>
                                    {formatBDT(mSec.subTotalAssessed ?? (mSec.subTotalPaid + mSec.subTotalDue))}
                                  </td>
                                  <td className="mono-figures" style={{ padding: '6px 6px', textAlign: 'right', color: '#047857', border: '1px solid #a7f3d0' }}>
                                    {formatBDT(mSec.subTotalPaid)}
                                  </td>
                                  <td className="mono-figures" style={{ padding: '6px 6px', textAlign: 'right', color: mSec.subTotalDue > 0 ? '#b45309' : '#047857', border: '1px solid #a7f3d0' }}>
                                    {formatBDT(mSec.subTotalDue)}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* 3. RECONCILIATION SUMMARY, SIGNATURES & SECURITY FOOTER                   */}
        {/* ========================================================================= */}
        <div style={{ marginTop: '18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Master Audited Reconciliation Bar */}
          <div
            className="grand-summary-bar"
            style={{
              backgroundColor: '#022c22',
              backgroundImage: 'linear-gradient(135deg, #022c22 0%, #064e3b 100%)',
              border: '2px solid #059669',
              borderRadius: '6px',
              padding: '12px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
              color: '#ffffff',
            }}
          >
            <div>
              <div style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', color: '#34d399', letterSpacing: '0.05em', marginBottom: '2px' }}>
                Al-Amanah Audited Portfolio Consolidated Grand Summary
              </div>
              <div style={{ fontSize: '9.5px', color: '#d1fae5' }}>
                Audited across all {activeSections.length} member account{activeSections.length !== 1 ? 's' : ''} &amp; {totalBillingCycles} billing cycle{totalBillingCycles !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="mono-figures" style={{ display: 'flex', gap: '14px', textAlign: 'right' }}>
              <div>
                <div style={{ fontSize: '8px', textTransform: 'uppercase', color: '#a7f3d0', fontWeight: 700, marginBottom: '1px' }}>Total Assessed</div>
                <div style={{ fontSize: '14px', fontWeight: 900, color: '#ffffff' }}>{formatBDT(totalDemand)}</div>
              </div>
              <div style={{ borderLeft: '1px solid #059669', paddingLeft: '12px' }}>
                <div style={{ fontSize: '8px', textTransform: 'uppercase', color: '#34d399', fontWeight: 700, marginBottom: '1px' }}>Total Realized</div>
                <div style={{ fontSize: '14px', fontWeight: 900, color: '#34d399' }}>{formatBDT(activeReport.grandTotalPaid)}</div>
              </div>
              <div style={{ borderLeft: '1px solid #059669', paddingLeft: '12px' }}>
                <div style={{ fontSize: '8px', textTransform: 'uppercase', color: '#fde68a', fontWeight: 700, marginBottom: '1px' }}>Net Outstanding</div>
                <div style={{ fontSize: '14px', fontWeight: 900, color: activeReport.grandTotalDue > 0 ? '#fde68a' : '#34d399' }}>
                  {formatBDT(activeReport.grandTotalDue)}
                </div>
              </div>
            </div>
          </div>

          {/* Dual Verification Cards with Seal Badges */}
          <div className="signature-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Accounts Desk */}
            <div
              style={{
                border: '1.5px solid #cbd5e1',
                borderRadius: '6px',
                padding: '10px 12px',
                backgroundColor: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: '95px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '9.5px', fontWeight: 800, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.04em' }}>
                  Prepared &amp; Verified By
                </span>
                <span style={{ fontSize: '8px', fontWeight: 800, backgroundColor: '#d1fae5', color: '#065f46', padding: '1px 5px', borderRadius: '3px', border: '1px solid #10b981' }}>
                  ACCOUNTS DESK
                </span>
              </div>
              <div style={{ borderBottom: '1.5px dashed #94a3b8', margin: '8px 0 4px 0' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#0f172a' }}>Executive Finance Officer</div>
                  <div style={{ fontSize: '8.5px', color: '#64748b', marginTop: '1px' }}>Al-Amanah Accounts Directorate</div>
                </div>
                <span className="mono-figures" style={{ fontSize: '9px', fontWeight: 700, color: '#047857' }}>Verified Cleared</span>
              </div>
            </div>

            {/* Board Seal */}
            <div
              style={{
                border: '1.5px solid #065f46',
                borderRadius: '6px',
                padding: '10px 12px',
                backgroundColor: '#f0fdf4',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: '95px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '9.5px', fontWeight: 800, textTransform: 'uppercase', color: '#064e3b', letterSpacing: '0.04em' }}>
                  Authorized Governance Seal
                </span>
                <span style={{ fontSize: '8px', fontWeight: 800, backgroundColor: '#064e3b', color: '#ffffff', padding: '1px 5px', borderRadius: '3px' }}>
                  EXECUTIVE COUNCIL
                </span>
              </div>
              <div style={{ borderBottom: '1.5px dashed #059669', margin: '8px 0 4px 0' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#022c22' }}>President / General Secretary</div>
                  <div style={{ fontSize: '8.5px', color: '#047857', marginTop: '1px' }}>Governing Executive Board</div>
                </div>
                <span className="mono-figures" style={{ fontSize: '9px', fontWeight: 700, color: '#047857' }}>Approved &amp; Sealed</span>
              </div>
            </div>
          </div>

          {/* Micro Security Footer */}
          <div
            style={{
              borderTop: '1.5px solid #cbd5e1',
              paddingTop: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '8.5px',
              color: '#64748b',
              textTransform: 'uppercase',
              fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >
            <span>Electronic Audit Document • Munshihati, Kamrangirchar, Dhaka – 1211</span>
            <span className="mono-figures">Security Checksum: #{documentId}</span>
            <span style={{ color: '#047857' }}>End of Official Statement</span>
          </div>
        </div>
      </div>
    </div>
  );
}