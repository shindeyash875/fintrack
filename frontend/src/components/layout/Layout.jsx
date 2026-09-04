import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import ToastContainer from '../common/Toast';
import ExpenseModal from '../expenses/ExpenseModal';
import ReceiptScannerModal from '../expenses/ReceiptScannerModal';
import { AIChatAdvisorModal } from '../ai/AIChatAdvisorModal';
import { AIFloatingTrigger } from '../ai/AIFloatingTrigger';
import BudgetModal from '../budgets/BudgetModal';
import CategoryManageModal from '../categories/CategoryManageModal';
import SettingsModal from '../common/SettingsModal';
import ExportModal from '../expenses/ExportModal';
import ImportModal from '../expenses/ImportModal';
import { MonthlyDigestModal } from '../ai/MonthlyDigestModal';
import { AffordabilitySimulatorModal } from '../ai/AffordabilitySimulatorModal';
import { AutoBudgetGeneratorModal } from '../ai/AutoBudgetGeneratorModal';
import { useUIStore } from '../../store/useUIStore';
import { useExpenseStore } from '../../store/useExpenseStore';
import { useBudgetStore } from '../../store/useBudgetStore';
import { useCategoryStore } from '../../store/useCategoryStore';

export const Layout = ({ children }) => {
  const {
    isGlobalAddExpenseOpen,
    closeGlobalAddExpense,
    isGlobalReceiptScannerOpen,
    closeGlobalReceiptScanner,
    isGlobalBudgetOpen,
    closeGlobalBudget,
    isGlobalCategoryOpen,
    closeGlobalCategory,
    openGlobalCategory,
    isGlobalSettingsOpen,
    closeGlobalSettings,
    isGlobalMonthlyDigestOpen,
    closeGlobalMonthlyDigest,
    isGlobalAffordabilityOpen,
    closeGlobalAffordability,
    isGlobalAutoBudgetOpen,
    closeGlobalAutoBudget,
  } = useUIStore();

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const handleDataRefresh = () => {
    fetchExpenses();
    fetchBudgets();
    fetchCategories();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col overflow-x-hidden">
      {/* Persistent left rail on desktop (>=1024px), sliding drawer on mobile */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Navbar />
        {/* Responsive padding with pb-24 on mobile so bottom navigation never covers content */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 pb-24 lg:pb-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (< 1024px) */}
      <BottomNav />

      {/* Global Quick Modals triggered from BottomNav / Sidebar */}
      <ExpenseModal
        isOpen={isGlobalAddExpenseOpen}
        onClose={closeGlobalAddExpense}
        onSuccess={handleDataRefresh}
      />

      <ReceiptScannerModal
        isOpen={isGlobalReceiptScannerOpen}
        onClose={closeGlobalReceiptScanner}
        onExpenseCreated={handleDataRefresh}
      />

      <BudgetModal
        isOpen={isGlobalBudgetOpen}
        onClose={closeGlobalBudget}
        onBudgetChange={handleDataRefresh}
      />

      <CategoryManageModal
        isOpen={isGlobalCategoryOpen}
        onClose={closeGlobalCategory}
      />

      <SettingsModal
        isOpen={isGlobalSettingsOpen}
        onClose={closeGlobalSettings}
        onOpenCategories={openGlobalCategory}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenImport={() => setIsImportOpen(true)}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={handleDataRefresh}
      />

      {/* AI Monthly Health Digest & Scorecard Modal */}
      <MonthlyDigestModal
        isOpen={isGlobalMonthlyDigestOpen}
        onClose={closeGlobalMonthlyDigest}
      />

      {/* AI "Can I Afford This?" Purchase Simulator Modal */}
      <AffordabilitySimulatorModal
        isOpen={isGlobalAffordabilityOpen}
        onClose={closeGlobalAffordability}
      />

      {/* AI 50/30/20 Smart Auto-Budget Planner Modal */}
      <AutoBudgetGeneratorModal
        isOpen={isGlobalAutoBudgetOpen}
        onClose={closeGlobalAutoBudget}
        onBudgetApplied={handleDataRefresh}
      />

      {/* FinTrack AI Copilot Floating Button & Chat Advisor Modal */}
      <AIFloatingTrigger />
      <AIChatAdvisorModal />

      {/* Toast Alerts */}
      <ToastContainer />
    </div>
  );
};

export default Layout;
