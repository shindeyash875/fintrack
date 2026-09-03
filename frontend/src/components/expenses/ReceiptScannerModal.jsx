import React, { useState, useRef } from 'react';
import { 
  Camera, 
  UploadCloud, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  ArrowRight,
  FileText,
  CreditCard,
  Smartphone,
  Banknote,
  X
} from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { aiApi } from '../../api/endpoints/ai';
import { useExpenseStore } from '../../store/useExpenseStore';
import { useCategoryStore } from '../../store/useCategoryStore';
import { useBudgetStore } from '../../store/useBudgetStore';
import { useUIStore } from '../../store/useUIStore';

export const ReceiptScannerModal = ({ isOpen, onClose, onExtractedData = null }) => {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const { addExpense, fetchExpenses } = useExpenseStore();
  const { categories, fetchCategories } = useCategoryStore();
  const { addToast } = useUIStore();

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsScanning(false);
    setExtractedData(null);
    setScanError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast({ type: 'error', message: 'Please select a valid image file (JPEG, PNG, WEBP).' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      addToast({ type: 'error', message: 'Image size exceeds 10MB limit.' });
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setScanError(null);
    setExtractedData(null);
    processScan(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setScanError(null);
      setExtractedData(null);
      processScan(file);
    }
  };

  const processScan = async (file) => {
    setIsScanning(true);
    setScanError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await aiApi.scanReceipt(formData);
      const data = response.data?.data || response.data;
      setExtractedData(data);
      addToast({
        type: 'success',
        message: `✨ AI Extracted: ${data.title} (₹${Number(data.amount).toLocaleString('en-IN')})`,
      });
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to analyze receipt image.';
      setScanError(errorMsg);
      addToast({ type: 'error', message: errorMsg });
    } finally {
      setIsScanning(false);
    }
  };

  const handleQuickSave = async () => {
    if (!extractedData) return;

    setIsSaving(true);
    try {
      const payload = {
        title: extractedData.title,
        amount: Number(extractedData.amount),
        expense_date: extractedData.expense_date,
        category_id: extractedData.suggested_category_id || categories[0]?.id,
        payment_mode: extractedData.payment_mode || null,
        notes: extractedData.notes || (extractedData.raw_summary ? `Auto-scanned: ${extractedData.raw_summary}` : 'Auto-scanned via FinTrack AI Vision'),
      };

      await addExpense(payload);
      await fetchExpenses();
      await fetchCategories();
      useBudgetStore.getState().fetchAll();

      addToast({ type: 'success', message: 'Expense saved to your account!' });
      handleReset();
      onClose();
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Could not save expense.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditInForm = () => {
    if (onExtractedData && extractedData) {
      onExtractedData(extractedData);
      handleReset();
      onClose();
    }
  };

  const renderPaymentModeIcon = (mode) => {
    if (mode === 'upi') return <Smartphone className="w-4 h-4 text-emerald-600" />;
    if (mode === 'card') return <CreditCard className="w-4 h-4 text-sky-600" />;
    if (mode === 'cash') return <Banknote className="w-4 h-4 text-amber-600" />;
    return <FileText className="w-4 h-4 text-slate-500" />;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        handleReset();
        onClose();
      }}
      title="Smart Receipt & Bill Scanner"
      maxWidth="max-w-xl"
    >
      <div className="space-y-5">
        {/* Header Description */}
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/20 text-slate-700">
          <div className="p-2 rounded-xl bg-white shadow-sm border border-emerald-200">
            <Sparkles className="w-5 h-5 text-emerald-600 animate-pulse" />
          </div>
          <div className="text-xs leading-relaxed">
            <span className="font-semibold text-slate-900">AI Vision OCR:</span> Upload a photo of a restaurant bill, grocery receipt, or 
            <strong className="text-emerald-700"> Google Pay / PhonePe / Paytm</strong> payment screenshot to auto-extract details!
          </div>
        </div>

        {/* Upload Drop Zone / Camera Trigger */}
        {!selectedFile && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="group cursor-pointer relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/70 hover:bg-emerald-50/40 transition-all duration-200 text-center"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="p-4 rounded-2xl bg-white shadow-sm border border-slate-200 group-hover:scale-110 group-hover:border-emerald-300 transition-all duration-200 mb-3">
              <UploadCloud className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="text-sm font-semibold text-slate-800 mb-1">
              Click to upload or drag & drop receipt
            </p>
            <p className="text-xs text-slate-500">
              Supports JPEG, PNG, WEBP, UPI screenshots (up to 10MB)
            </p>

            <div className="mt-4 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white border border-slate-200 text-slate-700 shadow-2xs">
                <Camera className="w-3.5 h-3.5 text-slate-500" />
                Mobile Camera & Gallery
              </span>
            </div>
          </div>
        )}

        {/* Selected Image & Scanning State */}
        {selectedFile && (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900/5 max-h-56 flex items-center justify-center">
              <img
                src={previewUrl}
                alt="Receipt Preview"
                className="max-h-56 w-auto object-contain rounded-xl"
              />

              {/* Scanning Overlay Animation */}
              {isScanning && (
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4">
                  <div className="relative mb-3">
                    <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                    <Sparkles className="w-4 h-4 text-teal-300 absolute -top-1 -right-1 animate-bounce" />
                  </div>
                  <p className="text-sm font-semibold text-white tracking-wide">
                    FinTrack AI is analyzing receipt...
                  </p>
                  <p className="text-xs text-emerald-200 mt-1">
                    Detecting merchant, amount, UPI details & category
                  </p>
                </div>
              )}

              {/* Reset button */}
              {!isScanning && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white backdrop-blur-sm transition-colors"
                  title="Remove Image"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Error state */}
            {scanError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-rose-800">Scanning failed</p>
                  <p className="mt-0.5">{scanError}</p>
                </div>
                <button
                  type="button"
                  onClick={() => processScan(selectedFile)}
                  className="inline-flex items-center gap-1 font-medium text-rose-800 hover:underline"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry
                </button>
              </div>
            )}

            {/* Extracted Data Card */}
            {extractedData && (
              <div className="p-4 rounded-2xl bg-white border border-emerald-500/30 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                      Extracted Details
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    {Math.round((extractedData.confidence || 0.95) * 100)}% Confidence
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                      Merchant / Title
                    </span>
                    <span className="font-semibold text-slate-900 truncate block">
                      {extractedData.title}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                      Total Amount
                    </span>
                    <span className="font-bold text-emerald-600 text-base">
                      ₹{Number(extractedData.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                      Date
                    </span>
                    <span className="text-slate-700 font-medium">
                      {extractedData.expense_date}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                      Payment Mode
                    </span>
                    <div className="flex items-center gap-1 text-slate-700 capitalize font-medium">
                      {renderPaymentModeIcon(extractedData.payment_mode)}
                      <span>{extractedData.payment_mode || 'Not specified'}</span>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <span className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                      Suggested Category
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 mt-1">
                      {extractedData.suggested_category_name || 'General'}
                    </span>
                  </div>

                  {extractedData.notes && (
                    <div className="col-span-2">
                      <span className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                        Notes / Items
                      </span>
                      <span className="text-xs text-slate-600 block mt-0.5">
                        {extractedData.notes}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2.5 pt-2">
                  <Button
                    variant="primary"
                    onClick={handleQuickSave}
                    isLoading={isSaving}
                    icon={CheckCircle2}
                    className="flex-1"
                  >
                    Save to Expenses
                  </Button>

                  {onExtractedData && (
                    <Button
                      variant="secondary"
                      onClick={handleEditInForm}
                      icon={ArrowRight}
                    >
                      Edit in Form
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ReceiptScannerModal;
