import React, { useState, useRef } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { Upload, FileText, CheckCircle2, AlertTriangle, AlertCircle, Download, FileCheck } from 'lucide-react';
import { expensesApi } from '../../api/endpoints/expenses';
import { useUIStore } from '../../store/useUIStore';

export const ImportModal = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);
  const { addToast } = useUIStore();

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (!selected.name.endsWith('.csv')) {
        addToast({ type: 'error', message: 'Please select a valid .csv file.' });
        return;
      }
      setFile(selected);
      setResult(null);
    }
  };

  const handleDownloadTemplate = () => {
    const template = `Date,Title,Category,Amount,Payment Mode,Notes
2026-08-26,Weekly Groceries,Food,1250.00,upi,Fruits and vegetables
2026-08-25,Metro Pass,Travel,500.00,card,Monthly recharge
2026-08-24,Electric Bill,Utilities,850.50,upi,August electricity
`;
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'fintrack_sample_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!file) {
      addToast({ type: 'error', message: 'Please choose a CSV file to upload.' });
      return;
    }

    setIsUploading(true);
    try {
      const csvText = await file.text();
      const res = await expensesApi.importCsv({ csv_content: csvText });
      setResult(res.data);

      if (res.data.imported_count > 0) {
        addToast({
          type: 'success',
          message: `Successfully imported ${res.data.imported_count} expenses!`,
        });
        if (onSuccess) onSuccess();
      } else if (res.data.skipped_duplicates_count > 0 && res.data.errors.length === 0) {
        addToast({
          type: 'info',
          message: `All ${res.data.skipped_duplicates_count} rows were duplicates and safely skipped.`,
        });
      }
    } catch (err) {
      addToast({
        type: 'error',
        message: err.message || 'Failed to import CSV file.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Expenses from CSV" size="lg">
      <div className="space-y-6">
        <p className="text-xs text-slate-500">
          Upload a CSV file of transactions. Categories not yet in your account will be automatically mapped or created. Duplicate entries are automatically detected and safely skipped.
        </p>

        {/* Template info bar */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-slate-600">
              Required CSV Columns: <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-semibold">Date, Title, Amount</code>
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDownloadTemplate}
            icon={Download}
          >
            Sample Template
          </Button>
        </div>

        {/* Upload Box */}
        {!result && (
          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-file-upload"
            />
            <label
              htmlFor="csv-file-upload"
              className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                file
                  ? 'border-emerald-500 bg-emerald-50/30'
                  : 'border-slate-300 hover:border-emerald-400 bg-slate-50/50'
              }`}
            >
              {file ? (
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <FileCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{file.name}</p>
                    <p className="text-xs text-slate-500 font-medium">
                      {(file.size / 1024).toFixed(1)} KB • Ready to import
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 hover:underline pt-1">
                    Click to change file
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Click to browse or drop your CSV file here
                    </p>
                    <p className="text-xs text-slate-400">Supports standard UTF-8 CSV documents</p>
                  </div>
                </div>
              )}
            </label>
          </div>
        )}

        {/* Result Summary Report */}
        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-center">
                <p className="text-xl font-bold text-emerald-700 font-['Outfit']">
                  {result.imported_count}
                </p>
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mt-0.5">
                  Imported
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center">
                <p className="text-xl font-bold text-slate-700 font-['Outfit']">
                  {result.skipped_duplicates_count}
                </p>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mt-0.5">
                  Duplicates
                </p>
              </div>

              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-center">
                <p className="text-xl font-bold text-rose-700 font-['Outfit']">
                  {result.errors.length}
                </p>
                <p className="text-xs font-semibold text-rose-800 uppercase tracking-wider mt-0.5">
                  Errors
                </p>
              </div>
            </div>

            {/* Error Rows Table if any */}
            {result.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
                  <AlertCircle className="w-4 h-4" />
                  <span>The following rows had issues and were skipped:</span>
                </div>
                <div className="max-h-40 overflow-y-auto border border-rose-100 rounded-xl divide-y divide-rose-100 text-xs bg-rose-50/40">
                  {result.errors.map((err, i) => (
                    <div key={i} className="p-2.5 flex items-start gap-2">
                      <span className="font-bold text-rose-800 shrink-0">Row {err.row_number}:</span>
                      <span className="text-rose-700">{err.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          {result ? (
            <>
              <Button variant="secondary" onClick={handleReset} className="flex-1 sm:flex-none">
                Import Another
              </Button>
              <Button variant="primary" onClick={onClose} className="flex-1 sm:flex-none">
                Done
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={onClose} disabled={isUploading} className="flex-1 sm:flex-none">
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleImport}
                disabled={!file}
                isLoading={isUploading}
                icon={Upload}
                className="flex-1 sm:flex-none"
              >
                Start Import
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ImportModal;
