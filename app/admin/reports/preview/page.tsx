'use client';

import React, { useState } from 'react';
import { RoleGate } from '@/components/role-gate';
import { ReportPrintArea, type PrintingReportData } from '@/components/report-print';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// Sample mock data for live design preview
const SAMPLE_REPORT_DATA: PrintingReportData = {
  level: 1,
  title: 'All Members Official Financial Audit & Transaction Ledger Statement',
  subtitle: 'Society Complete Ledger (45 Accounts)',
  date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
  summaryStats: {
    totalDemand: 450000,
    totalPaid: 432000,
    totalDue: 18000,
    recoveryRate: 96.0,
    totalMembers: 3,
    totalRecords: 6,
    paidCount: 5,
    dueCount: 1,
  },
  sections: [
    {
      memberId: 1,
      memberName: 'Mohammad Rehan Chowdhury',
      memberNo: '1042',
      memberRole: 'Executive Member',
      memberHeader: 'Mohammad Rehan Chowdhury',
      memberSubHeader: 'Member ID: #1042 • Phone: 01711-000001 • Executive Member',
      memberTotalPaid: 150000,
      memberTotalDue: 0,
      memberTotalAssessed: 150000,
      monthSections: [
        {
          monthTitle: 'July 2026',
          campaignTrxNo: 'CMP-2026-07',
          subTotalPaid: 100000,
          subTotalDue: 0,
          subTotalAssessed: 100000,
          rows: [
            {
              serial: 1,
              date: '05 Jul 2026',
              description: 'July 2026 Monthly Subscription Deposit',
              transactionNo: 'TRX-20260705-001',
              refNo: 'BRAC-DEP-8891',
              status: 'paid',
              paidAmount: 100000,
              dueAmount: 0,
              assessedAmount: 100000,
              balanceAmount: 0,
            },
          ],
        },
        {
          monthTitle: 'August 2026',
          campaignTrxNo: 'CMP-2026-08',
          subTotalPaid: 50000,
          subTotalDue: 0,
          subTotalAssessed: 50000,
          rows: [
            {
              serial: 2,
              date: '03 Aug 2026',
              description: 'August 2026 Monthly Subscription Deposit',
              transactionNo: 'TRX-20260803-014',
              refNo: 'IBBL-TRF-9902',
              status: 'paid',
              paidAmount: 50000,
              dueAmount: 0,
              assessedAmount: 50000,
              balanceAmount: 0,
            },
          ],
        },
      ],
    },
    {
      memberId: 2,
      memberName: 'Dr. Tariqul Islam',
      memberNo: '1043',
      memberRole: 'Advisory Member',
      memberHeader: 'Dr. Tariqul Islam',
      memberSubHeader: 'Member ID: #1043 • Phone: 01819-000002 • Advisory Member',
      memberTotalPaid: 132000,
      memberTotalDue: 18000,
      memberTotalAssessed: 150000,
      monthSections: [
        {
          monthTitle: 'July 2026',
          campaignTrxNo: 'CMP-2026-07',
          subTotalPaid: 100000,
          subTotalDue: 0,
          subTotalAssessed: 100000,
          rows: [
            {
              serial: 1,
              date: '08 Jul 2026',
              description: 'July 2026 Monthly Subscription Deposit',
              transactionNo: 'TRX-20260708-032',
              refNo: 'BKASH-TX-7719',
              status: 'paid',
              paidAmount: 100000,
              dueAmount: 0,
              assessedAmount: 100000,
              balanceAmount: 0,
            },
          ],
        },
        {
          monthTitle: 'August 2026',
          campaignTrxNo: 'CMP-2026-08',
          subTotalPaid: 32000,
          subTotalDue: 18000,
          subTotalAssessed: 50000,
          rows: [
            {
              serial: 2,
              date: '10 Aug 2026',
              description: 'August 2026 Monthly Subscription Deposit (Partial)',
              transactionNo: 'TRX-20260810-098',
              refNo: 'CASH-REC-1043',
              status: 'partial',
              paidAmount: 32000,
              dueAmount: 18000,
              assessedAmount: 50000,
              balanceAmount: 18000,
            },
          ],
        },
      ],
    },
    {
      memberId: 3,
      memberName: 'Engr. Shahadat Hossain',
      memberNo: '1044',
      memberRole: 'General Member',
      memberHeader: 'Engr. Shahadat Hossain',
      memberSubHeader: 'Member ID: #1044 • Phone: 01912-000003 • General Member',
      memberTotalPaid: 150000,
      memberTotalDue: 0,
      memberTotalAssessed: 150000,
      monthSections: [
        {
          monthTitle: 'July 2026',
          campaignTrxNo: 'CMP-2026-07',
          subTotalPaid: 100000,
          subTotalDue: 0,
          subTotalAssessed: 100000,
          rows: [
            {
              serial: 1,
              date: '06 Jul 2026',
              description: 'July 2026 Monthly Subscription Deposit',
              transactionNo: 'TRX-20260706-045',
              refNo: 'DBBL-DEP-4491',
              status: 'paid',
              paidAmount: 100000,
              dueAmount: 0,
              assessedAmount: 100000,
              balanceAmount: 0,
            },
          ],
        },
        {
          monthTitle: 'August 2026',
          campaignTrxNo: 'CMP-2026-08',
          subTotalPaid: 50000,
          subTotalDue: 0,
          subTotalAssessed: 50000,
          rows: [
            {
              serial: 2,
              date: '04 Aug 2026',
              description: 'August 2026 Monthly Subscription Deposit',
              transactionNo: 'TRX-20260804-061',
              refNo: 'NAGAD-TX-9901',
              status: 'paid',
              paidAmount: 50000,
              dueAmount: 0,
              assessedAmount: 50000,
              balanceAmount: 0,
            },
          ],
        },
      ],
    },
  ],
  grandTotalPaid: 432000,
  grandTotalDue: 18000,
  totalRecords: 6,
};

export default function ReportPrintPreviewPage() {
  const [report] = useState<PrintingReportData>(SAMPLE_REPORT_DATA);

  return (
    <RoleGate roles={['super_admin', 'admin', 'accountant']}>
      <div className="min-h-screen bg-slate-100 p-6 print:p-0 print:m-0 print:bg-white print:min-h-0">
        {/* On-screen control bar (hidden when printing) */}
        <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-xs print:hidden">
          <div className="flex items-center gap-3">
            <Link href="/admin/reports">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Reports
              </Button>
            </Link>
            <div>
              <h1 className="text-sm font-bold text-slate-900">Printable Statement Design Preview</h1>
              <p className="text-xs text-slate-500">Live preview &amp; design sandbox of the official report statement</p>
            </div>
          </div>

          <Button
            onClick={() => window.print()}
            className="bg-emerald-700 hover:bg-emerald-800 text-white gap-2 font-bold"
          >
            <Printer className="w-4 h-4" /> Print Statement
          </Button>
        </div>

        {/* Screen preview & Print container */}
        <div className="max-w-4xl mx-auto bg-white p-6 rounded-xl border border-slate-200 shadow-sm print:p-0 print:m-0 print:border-none print:shadow-none print:max-w-none print:w-full print:bg-white">
          <div className="print-preview-container bg-white print:bg-white">
            <ReportPrintArea report={report} preview={true} />
          </div>
        </div>
      </div>
    </RoleGate>
  );
}
