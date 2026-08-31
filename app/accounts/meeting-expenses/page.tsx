'use client';

import React, { useState, useMemo } from 'react';
import { RoleGate } from '@/components/role-gate';
import {
  useGetMeetingExpensesQuery,
  useCreateMeetingExpenseMutation,
  useDeleteMeetingExpenseMutation,
} from '@/lib/api';
import { useAppSelector } from '@/store/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  ExpenseVoucherPrintArea,
  ExpensesReportPrintArea,
  type ParsedExpenseData,
  type ExpenseLineItem,
} from '@/components/expense-print';
import {
  Plus,
  Printer,
  Search,
  Calendar,
  DollarSign,
  Receipt,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  Building2,
  FolderOpen,
  Filter,
  CheckCircle2,
  Sparkles,
  Info,
  Clock,
  Layers,
} from 'lucide-react';

export default function AdminExpensesPage() {
  return (
    <RoleGate roles={['super_admin', 'admin', 'accountant']}>
      <ExpensesContent />
    </RoleGate>
  );
}

function ExpensesContent() {
  const user = useAppSelector((s) => s.auth.user);
  const { data: rawExpenses, isLoading } = useGetMeetingExpensesQuery(undefined, {
    pollingInterval: 4000,
  });
  const [createExpense, { isLoading: isCreating }] = useCreateMeetingExpenseMutation();
  const [deleteExpense, { isLoading: isDeleting }] = useDeleteMeetingExpenseMutation();

  // Search & Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

  // Modal State for New Expense Sheet
  const [openModal, setOpenModal] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formDisplayDateTime, setFormDisplayDateTime] = useState('');
  const [formVoucherNo, setFormVoucherNo] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formItems, setFormItems] = useState<ExpenseLineItem[]>([
    { label: 'Refreshments & Light Snacks', value: 0 },
  ]);

  // Print State
  const [printingVoucher, setPrintingVoucher] = useState<ParsedExpenseData | null>(null);
  const [printingReport, setPrintingReport] = useState<ParsedExpenseData[] | null>(null);

  // Parse Raw Expenses into Structured Data
  const parsedExpenses = useMemo<ParsedExpenseData[]>(() => {
    if (!rawExpenses?.data) return [];
    return rawExpenses.data.map((e) => {
      let items: ExpenseLineItem[] = [];
      let category = 'General Expense';
      let voucher_no = `EXP-${e.id.toString().padStart(4, '0')}`;
      let notes = '';
      let prepared_by = e.creator?.name || e.created_by || 'Accounts Desk';
      let creator = e.creator;
      let created_by_id = e.created_by_id;

      if (e.description) {
        try {
          const parsed = JSON.parse(e.description);
          if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.items)) items = parsed.items;
            if (parsed.category) category = parsed.category;
            if (parsed.voucher_no) voucher_no = parsed.voucher_no;
            if (parsed.notes) notes = parsed.notes;
            if (parsed.prepared_by) prepared_by = parsed.prepared_by;
          }
        } catch {
          // If description is just plain text
          notes = e.description;
          items = [{ label: e.description || e.title, value: Number(e.amount || 0) }];
        }
      }

      if (items.length === 0) {
        items = [{ label: e.title, value: Number(e.amount || 0) }];
      }

      return {
        id: e.id,
        title: e.title,
        expense_date: e.expense_date,
        created_at: e.created_at,
        amount: Number(e.amount || 0),
        category,
        voucher_no,
        items,
        notes,
        prepared_by,
        created_by: e.created_by,
        created_by_id,
        creator,
      };
    });
  }, [rawExpenses]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return parsedExpenses.filter((e) => {
      const creatorName = e.creator?.name || e.created_by || '';
      const creatorIdStr = String(e.created_by_id || e.creator?.id || e.creator?.member_no || '');

      return (
        e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.voucher_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        creatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        creatorIdStr.includes(searchTerm) ||
        (e.items && e.items.some((it) => it.label.toLowerCase().includes(searchTerm.toLowerCase())))
      );
    });
  }, [parsedExpenses, searchTerm]);

  // KPI Metrics
  const totalAmount = parsedExpenses.reduce((acc, e) => acc + e.amount, 0);
  const totalItemsCount = parsedExpenses.reduce((acc, e) => acc + (e.items?.length || 1), 0);
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const currentMonthTotal = parsedExpenses
    .filter((e) => (e.expense_date || '').startsWith(currentMonthStr))
    .reduce((acc, e) => acc + e.amount, 0);

  // Toggle Row Expansion
  const toggleRow = (id: number) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Form Handlers
  const handleOpenCreateModal = () => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const formattedDateTime = now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }) + ' ' + now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const autoVoucher = `EXP-${today.replace(/-/g, '')}-${randomSuffix}`;
    setFormTitle('');
    setFormDate(today);
    setFormDisplayDateTime(formattedDateTime);
    setFormVoucherNo(autoVoucher);
    setFormNotes('');
    setFormItems([
      { label: '', qty: 1, unit_price: 0, value: 0 },
    ]);
    setOpenModal(true);
  };

  const handleAddItemRow = () => {
    setFormItems((prev) => [...prev, { label: '', qty: 1, unit_price: 0, value: 0 }]);
  };

  const handleRemoveItemRow = (idx: number) => {
    if (formItems.length <= 1) {
      alert('At least one item row is required.');
      return;
    }
    setFormItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: 'label' | 'qty' | 'unit_price' | 'value', val: any) => {
    setFormItems((prev) => {
      const next = [...prev];
      const item = { ...next[idx] };

      if (field === 'label') {
        item.label = val;
      } else if (field === 'qty') {
        const qty = Number(val) > 0 ? Number(val) : 1;
        item.qty = qty;
        if (item.unit_price !== undefined && item.unit_price > 0) {
          item.value = Math.round(qty * item.unit_price * 100) / 100;
        }
      } else if (field === 'unit_price') {
        const unitPrice = Number(val) || 0;
        item.unit_price = unitPrice;
        const qty = item.qty || 1;
        item.value = Math.round(qty * unitPrice * 100) / 100;
      } else if (field === 'value') {
        const value = Number(val) || 0;
        item.value = value;
        const qty = item.qty || 1;
        if (qty > 0) {
          item.unit_price = Math.round((value / qty) * 100) / 100;
        }
      }

      next[idx] = item;
      return next;
    });
  };

  const formCalculatedTotal = formItems.reduce((acc, it) => acc + Number(it.value || 0), 0);

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert('Please enter an expense title / purpose.');
      return;
    }
    if (formCalculatedTotal <= 0) {
      alert('Total expense amount must be greater than 0.');
      return;
    }

    const payloadDescription = JSON.stringify({
      items: formItems.filter((it) => it.label.trim() !== '' || it.value > 0),
      voucher_no: formVoucherNo || `EXP-${Date.now()}`,
      notes: formNotes,
      prepared_by: user?.name || 'Admin Desk',
    });

    try {
      await createExpense({
        title: formTitle.trim(),
        expense_date: formDate,
        amount: formCalculatedTotal,
        description: payloadDescription,
      }).unwrap();

      setOpenModal(false);
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to save expense sheet.');
    }
  };

  // Print Handlers
  const handlePrintVoucher = (voucher: ParsedExpenseData) => {
    setPrintingReport(null);
    setPrintingVoucher(voucher);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handlePrintAllReport = () => {
    setPrintingVoucher(null);
    setPrintingReport(filteredExpenses);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <>
      <div className={printingVoucher || printingReport ? 'space-y-6 print:hidden' : 'space-y-6'}>
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Receipt className="h-6 w-6 text-emerald-700" />
              <span>Society Expenses</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Create dynamic itemized expense sheets with label &amp; value line items, track disbursements, and print official vouchers.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              onClick={handlePrintAllReport}
              disabled={filteredExpenses.length === 0}
              className="gap-2 border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs font-bold cursor-pointer"
            >
              <Printer className="h-4 w-4 text-emerald-700" />
              Print Expenses Report
            </Button>

            <Button
              onClick={handleOpenCreateModal}
              className="gap-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold cursor-pointer shadow-sm"
            >
              <Plus className="h-4 w-4" />
              New Expense Sheet
            </Button>
          </div>
        </div>

        {/* Executive KPI Overview Deck */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200 shadow-2xs hover:border-emerald-200 transition-colors">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Total Expenses</span>
                <DollarSign className="h-4 w-4 text-emerald-700" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-slate-900">
                BDT {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Total audited society disbursements</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-2xs hover:border-emerald-200 transition-colors">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Expense Vouchers</span>
                <Receipt className="h-4 w-4 text-teal-600" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-slate-900">{parsedExpenses.length} Sheets</div>
              <p className="text-[11px] text-slate-500 mt-0.5">{totalItemsCount} itemized lines recorded</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-2xs hover:border-emerald-200 transition-colors">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>This Month ({new Date().toLocaleString('en-US', { month: 'short' })})</span>
                <Calendar className="h-4 w-4 text-indigo-600" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-indigo-900">
                BDT {currentMonthTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Current billing cycle disbursements</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-2xs hover:border-emerald-200 transition-colors">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Avg / Voucher</span>
                <Layers className="h-4 w-4 text-amber-600" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-slate-900">
                BDT {parsedExpenses.length > 0 ? Math.round(totalAmount / parsedExpenses.length).toLocaleString() : '0.00'}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Average cost per expense sheet</p>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3.5">
            <div className="relative w-full">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search expense title, line item description, voucher #, or added by officer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs bg-white w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* Expenses List & Table Cards */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Official Expenses Sheets ({filteredExpenses.length})
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Itemized breakdown sheets with label &amp; value details and 1-click voucher printing.
              </p>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="text-xs font-bold text-slate-700">
                  <TableHead className="text-center">#</TableHead>
                  <TableHead>Date &amp; Time</TableHead>
                  <TableHead>Voucher #</TableHead>
                  <TableHead>Expense Title / Purpose</TableHead>
                  <TableHead>Added By</TableHead>
                  <TableHead className="text-center">Items</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-slate-500 text-xs">
                      Loading expenses records...
                    </TableCell>
                  </TableRow>
                )}

                {filteredExpenses.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                      <Receipt className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                      <p className="text-sm font-medium text-slate-700">No expense sheets found</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {searchTerm
                          ? 'Try adjusting your search query.'
                          : 'Click "New Expense Sheet" above to record itemized expenses.'}
                      </p>
                    </TableCell>
                  </TableRow>
                )}

                {filteredExpenses.map((exp, idx) => {
                  const isExpanded = !!expandedRows[exp.id];
                  const creatorName = exp.creator?.name || exp.created_by || exp.prepared_by || 'Admin';
                  const creatorIdStr = exp.creator?.member_no ? `ID: ${exp.creator.member_no}` : (exp.created_by_id ? `ID: ${exp.created_by_id}` : (exp.creator?.id ? `ID: ${exp.creator.id}` : 'Staff'));

                  return (
                    <React.Fragment key={exp.id}>
                      <TableRow className="hover:bg-slate-50/70 transition-colors">
                        <TableCell className="text-center text-xs font-mono text-slate-400">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-slate-600 font-medium whitespace-nowrap">
                          <div>{exp.expense_date}</div>
                          {exp.created_at && (
                            <div className="text-[10px] text-slate-400 font-normal">
                              {new Date(exp.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-mono font-bold text-emerald-900 whitespace-nowrap">
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                            {exp.voucher_no}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-slate-900 text-xs sm:text-sm leading-snug">{exp.title}</div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="font-bold text-slate-900 text-xs">{creatorName}</div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="font-mono text-[10.5px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                              {creatorIdStr}
                            </span>
                            {exp.creator?.role && (
                              <span className="text-[10px] text-slate-400 capitalize">
                                ({exp.creator.role.replace('_', ' ')})
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <button
                            onClick={() => toggleRow(exp.id)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded cursor-pointer transition-colors"
                          >
                            <span>{exp.items?.length || 1}</span>
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-emerald-950 text-sm whitespace-nowrap">
                          BDT {exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePrintVoucher(exp)}
                              className="h-8 px-2.5 gap-1 border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs font-bold cursor-pointer"
                              title="Print Official Expense Voucher"
                            >
                              <Printer className="h-3.5 w-3.5" />
                              <span>Voucher</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (confirm(`Delete expense "${exp.title}" (BDT ${exp.amount.toLocaleString()})?`)) {
                                  deleteExpense(exp.id);
                                }
                              }}
                              className="h-8 px-2 text-xs cursor-pointer"
                              title="Delete Expense"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expandable Itemized Table of Label, Qty, Rate and Values */}
                      {isExpanded && (
                        <TableRow className="bg-slate-50/90 border-b border-slate-200">
                          <TableCell colSpan={8} className="p-3 sm:p-4">
                            <div className="bg-white border border-emerald-200 rounded-xl p-3 shadow-2xs">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2 flex-wrap gap-2">
                                <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                                  <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                                  <span>Itemized Expense Breakdown (Label, Qty &amp; Value Table)</span>
                                </div>
                                <div className="flex items-center gap-3 text-[11px] font-mono">
                                  <span className="text-slate-600">
                                    Added by: <strong className="text-emerald-900">{creatorName}</strong> ({creatorIdStr})
                                  </span>
                                  <span className="font-bold text-slate-500">
                                    Voucher: {exp.voucher_no}
                                  </span>
                                </div>
                              </div>

                              <Table className="text-xs">
                                <TableHeader className="bg-emerald-50/60">
                                  <TableRow>
                                    <TableHead className="text-center text-emerald-900 font-bold">#</TableHead>
                                    <TableHead className="text-emerald-900 font-bold">Item Particulars / Description</TableHead>
                                    <TableHead className="text-center text-emerald-900 font-bold">Qty</TableHead>
                                    <TableHead className="text-right text-emerald-900 font-bold">Unit Rate (৳)</TableHead>
                                    <TableHead className="text-right text-emerald-900 font-bold">Total Amount (৳)</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {exp.items && exp.items.length > 0 ? (
                                    exp.items.map((it, itIdx) => {
                                      const qty = Number(it.qty) > 0 ? Number(it.qty) : 1;
                                      const itemVal = Number(it.value || 0);
                                      const unitRate = it.unit_price !== undefined && Number(it.unit_price) > 0
                                        ? Number(it.unit_price)
                                        : (qty > 1 ? itemVal / qty : itemVal);

                                      return (
                                        <TableRow key={itIdx} className="hover:bg-slate-50">
                                          <TableCell className="text-center font-mono text-slate-400">
                                            {itIdx + 1}
                                          </TableCell>
                                          <TableCell className="font-medium text-slate-900">
                                            {it.label}
                                            {it.notes && (
                                              <span className="block text-[11px] text-slate-400">
                                                {it.notes}
                                              </span>
                                            )}
                                          </TableCell>
                                          <TableCell className="text-center font-mono font-bold text-slate-700">
                                            {qty}
                                          </TableCell>
                                          <TableCell className="text-right font-mono text-slate-600">
                                            ৳{unitRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </TableCell>
                                          <TableCell className="text-right font-mono font-bold text-emerald-900">
                                            BDT {itemVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })
                                  ) : (
                                    <TableRow>
                                      <TableCell className="text-center font-mono">1</TableCell>
                                      <TableCell className="font-medium">{exp.title}</TableCell>
                                      <TableCell className="text-center font-mono">1</TableCell>
                                      <TableCell className="text-right font-mono">৳{exp.amount.toLocaleString()}</TableCell>
                                      <TableCell className="text-right font-mono font-bold">
                                        BDT {exp.amount.toLocaleString()}
                                      </TableCell>
                                    </TableRow>
                                  )}

                                  <TableRow className="bg-emerald-50/90 font-bold text-xs border-t-2 border-emerald-300">
                                    <TableCell colSpan={4} className="text-right text-emerald-950 uppercase">
                                      Total Line Items Sum:
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-emerald-950 text-sm">
                                      BDT {exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>

                              {exp.notes && (
                                <div className="mt-2 text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 flex items-start gap-1.5">
                                  <Info className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                                  <span><strong>Notes / Resolution:</strong> {exp.notes}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* MODAL: Create New Expense Sheet with Dynamic Label-Value Table */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-700" />
              <span>Create Official Expense Sheet</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveExpense} className="space-y-4 pt-2">
            {/* Top Metadata */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">Expense Title / Purpose *</Label>
                <Input
                  required
                  placeholder="e.g. Monthly Executive Meeting Refreshments & Logistics"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="mt-1 text-xs bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Date &amp; Time</span>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      ⚡ Auto Generated
                    </span>
                  </Label>
                  <div className="mt-1 h-9 px-3 text-xs bg-slate-100/90 border border-slate-200 rounded-md text-slate-700 font-mono flex items-center justify-between cursor-not-allowed select-none">
                    <span>{formDisplayDateTime || new Date().toLocaleString()}</span>
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Voucher / Ref No.</span>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      ⚡ Auto Generated
                    </span>
                  </Label>
                  <div className="mt-1 h-9 px-3 text-xs bg-slate-100/90 border border-slate-200 rounded-md text-emerald-900 font-mono font-bold flex items-center justify-between cursor-not-allowed select-none">
                    <span>{formVoucherNo}</span>
                    <Receipt className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Label, Qty, Unit Rate and Total Table */}
            <div className="border border-emerald-200 rounded-xl p-3 bg-emerald-50/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-emerald-700" />
                    <span>Dynamic Line Items Table (Particulars, Qty &amp; Values)</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Enter particulars, quantity and unit rate. Total calculates automatically.
                  </p>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddItemRow}
                  className="h-7 text-xs font-bold border-emerald-300 text-emerald-800 hover:bg-emerald-50 gap-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Item Row
                </Button>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-slate-600 px-1">
                  <div className="col-span-1 text-center">#</div>
                  <div className="col-span-5">Item Particulars</div>
                  <div className="col-span-2 text-center">Qty</div>
                  <div className="col-span-2 text-right">Unit Rate (৳)</div>
                  <div className="col-span-2 text-right pr-6">Total (৳)</div>
                </div>

                {formItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-1 text-center text-xs font-mono text-slate-400">
                      {idx + 1}
                    </div>
                    <div className="col-span-5">
                      <Input
                        required
                        placeholder={`e.g. Light Snacks & Tea (Item #${idx + 1})`}
                        value={item.label}
                        onChange={(e) => handleItemChange(idx, 'label', e.target.value)}
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        required
                        placeholder="1"
                        value={item.qty ?? 1}
                        onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                        className="h-8 text-xs text-center font-mono font-bold bg-white"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={item.unit_price === 0 || item.unit_price === undefined ? '' : item.unit_price}
                        onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                        className="h-8 text-xs text-right font-mono bg-white"
                      />
                    </div>
                    <div className="col-span-2 flex items-center gap-1.5">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        placeholder="0.00"
                        value={item.value === 0 ? '' : item.value}
                        onChange={(e) => handleItemChange(idx, 'value', e.target.value)}
                        className="h-8 text-xs text-right font-mono font-bold bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        disabled={formItems.length <= 1}
                        className="text-slate-400 hover:text-red-600 disabled:opacity-30 p-1 cursor-pointer shrink-0"
                        title="Remove row"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Calculation Display */}
              <div className="flex items-center justify-between p-2.5 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-emerald-950">
                <span className="uppercase text-slate-600">Calculated Grand Total:</span>
                <span className="font-mono text-base text-emerald-900">
                  BDT {formCalculatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Bottom Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Prepared &amp; Added By</span>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    🔒 Logged In User
                  </span>
                </Label>
                <div className="mt-1 h-9 px-3 text-xs bg-slate-100/90 border border-slate-200 rounded-md text-slate-700 font-medium flex items-center justify-between cursor-not-allowed select-none">
                  <span className="font-semibold text-slate-800 truncate">
                    {user?.name || 'Authorized User'}
                    <span className="text-slate-500 font-normal font-mono text-[11px] ml-1.5">
                      (ID #{user?.id || 1}{user?.role?.name ? ` • ${user.role.name.toUpperCase()}` : ''})
                    </span>
                  </span>
                  <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-1.5 py-0.5 rounded shrink-0 ml-1">
                    Verified
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Remarks / Meeting Resolution Reference</Label>
                <Input
                  placeholder="e.g. Approved in Meeting #14 on 28/08/2026"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="mt-1 text-xs bg-white"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenModal(false)}
                className="cursor-pointer"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={isCreating}
                className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold cursor-pointer gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{isCreating ? 'Saving Expense...' : 'Save & Create Voucher'}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Hidden Print Areas */}
      {printingVoucher && <ExpenseVoucherPrintArea voucher={printingVoucher} />}
      {printingReport && <ExpensesReportPrintArea expenses={printingReport} />}
    </>
  );
}
