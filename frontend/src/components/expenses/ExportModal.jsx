import React, { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { Download, FileText, FileCode, Filter, Database, Check } from 'lucide-react';
import { expensesApi } from '../../api/endpoints/expenses';
import { useUIStore } from '../../store/useUIStore';

export const ExportModal = ({ isOpen, onClose, activeFilters = {}, filteredCount = 0 }) => {
  const [format, setFormat] = useState('csv'); // 'csv' | 'json'
  const [scope, setScope] = useState('filtered'); // 'filtered' | 'all'
  const [isExporting, setIsExporting] = useState(false);
  const { addToast } = useUIStore();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Build query params based on scope
      let params = {};
      if (scope === 'filtered') {
        if (activeFilters.search) params.search = activeFilters.search;
        if (activeFilters.dateFrom) params.date_from = activeFilters.dateFrom;
        if (activeFilters.dateTo) params.date_to = activeFilters.dateTo;
        if (activeFilters.categoryId) params.category_id = activeFilters.categoryId;
        if (activeFilters.amountMin) params.amount_min = activeFilters.amountMin;
        if (activeFilters.amountMax) params.amount_max = activeFilters.amountMax;
        if (activeFilters.paymentMode) params.payment_mode = activeFilters.paymentMode;
        if (activeFilters.sortBy) params.sort_by = activeFilters.sortBy;
        if (activeFilters.sortDir) params.sort_dir = activeFilters.sortDir;
      }

      let res;
      if (format === 'csv') {
        res = await expensesApi.exportCsv(params);
      } else {
        res = await expensesApi.exportJson(params);
      }

      // Trigger browser download
      const blob = new Blob([res.data], {
        type: format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/json',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().slice(0, 10);
      link.setAttribute('download', `fintrack_expenses_${scope}_${timestamp}.${format}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      addToast({
        type: 'success',
        message: `Successfully exported expenses as ${format.toUpperCase()}.`,
      });
      onClose();
    } catch (err) {
      addToast({
        type: 'error',
        message: err.message || 'Failed to export expenses.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export Expenses Data" size="md">
      <div className="space-y-6">
        <p className="text-xs text-slate-500">
          Download your expense records for external reporting, spreadsheet analysis, or offline backup.
        </p>

        {/* 1. Choose Format */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Export Format
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormat('csv')}
              className={`flex items-center gap-3 p-3 sm:p-3.5 rounded-xl border text-left transition-all min-h-[44px] ${
                format === 'csv'
                  ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  format === 'csv' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold">CSV Document</p>
                <p className="text-xs text-slate-400">For Excel, Sheets</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFormat('json')}
              className={`flex items-center gap-3 p-3 sm:p-3.5 rounded-xl border text-left transition-all min-h-[44px] ${
                format === 'json'
                  ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  format === 'json' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <FileCode className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold">JSON Data</p>
                <p className="text-xs text-slate-400">Structured backup</p>
              </div>
            </button>
          </div>
        </div>

        {/* 2. Choose Scope */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Export Scope
          </label>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setScope('filtered')}
              className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                scope === 'filtered'
                  ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    scope === 'filtered'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Filtered View</p>
                  <p className="text-xs text-slate-400">
                    Exports items matching active filters ({filteredCount} items)
                  </p>
                </div>
              </div>
              {scope === 'filtered' && <Check className="w-5 h-5 text-emerald-600 shrink-0" />}
            </button>

            <button
              type="button"
              onClick={() => setScope('all')}
              className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                scope === 'all'
                  ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    scope === 'all' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">All Lifetime Records</p>
                  <p className="text-xs text-slate-400">Complete historical database export</p>
                </div>
              </div>
              {scope === 'all' && <Check className="w-5 h-5 text-emerald-600 shrink-0" />}
            </button>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose} disabled={isExporting} className="flex-1 sm:flex-none">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleExport}
            isLoading={isExporting}
            icon={Download}
            className="flex-1 sm:flex-none"
          >
            Download {format.toUpperCase()}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ExportModal;
