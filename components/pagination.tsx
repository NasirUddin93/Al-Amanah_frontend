'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { PageMeta } from '@/types';

interface Props {
  meta?: PageMeta;
  page: number;
  perPage?: number;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  perPageOptions?: number[];
}

function parseNum(val: any, fallback: number): number {
  if (Array.isArray(val)) return Number(val[0]) || fallback;
  const n = Number(val);
  return isNaN(n) ? fallback : n;
}

export function Pagination({
  meta,
  page,
  perPage = 15,
  onPageChange,
  onPerPageChange,
  perPageOptions = [5, 10, 15, 25, 50, 100],
}: Props) {
  if (!meta) return null;

  const currentPage = parseNum(meta.current_page ?? page, 1);
  const lastPage = Math.max(1, parseNum(meta.last_page, 1));
  const total = parseNum(meta.total, 0);
  const currentPerPage = parseNum(meta.per_page ?? perPage, 15);

  const startRecord = total === 0 ? 0 : (currentPage - 1) * currentPerPage + 1;
  const endRecord = Math.min(currentPage * currentPerPage, total);

  // Generate page numbers with smart ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (lastPage <= maxVisible + 2) {
      for (let i = 1; i <= lastPage; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(lastPage - 1, currentPage + 1);

      if (currentPage <= 3) {
        start = 2;
        end = 4;
      } else if (currentPage >= lastPage - 2) {
        start = lastPage - 3;
        end = lastPage - 1;
      }

      if (start > 2) {
        pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < lastPage - 1) {
        pages.push('...');
      }

      pages.push(lastPage);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3.5 print:hidden pt-3 border-t border-slate-100">
      {/* Left section: Per-page selector & record count */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 w-full sm:w-auto justify-between sm:justify-start">
        {onPerPageChange && (
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-slate-500">Rows per page:</span>
            <select
              value={currentPerPage}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                onPerPageChange(newSize);
                onPageChange(1);
              }}
              className="border border-slate-200 rounded-md px-2 py-1 bg-white font-semibold text-slate-800 text-xs focus:ring-1 focus:ring-emerald-500 cursor-pointer h-7"
            >
              {perPageOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="font-medium text-slate-600 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-md">
          Showing <span className="font-bold text-slate-900">{startRecord}</span> -{' '}
          <span className="font-bold text-slate-900">{endRecord}</span> of{' '}
          <span className="font-bold text-slate-900">{total}</span> records
        </div>
      </div>

      {/* Right section: Numeric Page Navigation Controls */}
      <div className="flex items-center gap-1">
        {/* First Page button */}
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(1)}
          title="First Page"
          className="h-8 w-8 p-0 cursor-pointer hidden sm:inline-flex border-slate-200"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </Button>

        {/* Prev Page button */}
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          className="h-8 px-2.5 text-xs gap-1 cursor-pointer border-slate-200 font-medium"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="hidden xs:inline">Prev</span>
        </Button>

        {/* Numeric Page Buttons */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="px-1.5 text-xs text-slate-400 select-none">
                  •••
                </span>
              );
            }

            const pageNum = Number(p);
            const isActive = pageNum === currentPage;

            return (
              <Button
                key={`page-${pageNum}`}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPageChange(pageNum)}
                className={`h-8 w-8 p-0 text-xs font-semibold cursor-pointer transition-all ${
                  isActive
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs border-emerald-700'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {pageNum}
              </Button>
            );
          })}
        </div>

        {/* Next Page button */}
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= lastPage}
          onClick={() => onPageChange(Math.min(lastPage, currentPage + 1))}
          className="h-8 px-2.5 text-xs gap-1 cursor-pointer border-slate-200 font-medium"
        >
          <span className="hidden xs:inline">Next</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>

        {/* Last Page button */}
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= lastPage}
          onClick={() => onPageChange(lastPage)}
          title="Last Page"
          className="h-8 w-8 p-0 cursor-pointer hidden sm:inline-flex border-slate-200"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
