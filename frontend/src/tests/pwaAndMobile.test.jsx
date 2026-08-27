import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import fs from 'fs';
import path from 'path';

import BottomNav from '../components/layout/BottomNav';
import Modal from '../components/common/Modal';
import { useUIStore } from '../store/useUIStore';

describe('PWA Assets & Manifest Specification', () => {
  const publicDir = path.resolve(__dirname, '../../public');

  it('has a valid manifest.webmanifest conforming to PWA standards', () => {
    const manifestPath = path.join(publicDir, 'manifest.webmanifest');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const raw = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(raw);

    expect(manifest.name).toBe('FinTrack — Expense & Live Budget Tracker');
    expect(manifest.short_name).toBe('FinTrack');
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe('#059669');
    expect(manifest.background_color).toBe('#0f172a');
    expect(Array.isArray(manifest.icons)).toBe(true);

    // Verify icons array contains 192, 512, and maskable icons
    const icon192 = manifest.icons.find((i) => i.sizes === '192x192' && i.purpose === 'any');
    const icon512 = manifest.icons.find((i) => i.sizes === '512x512' && i.purpose === 'any');
    const maskable = manifest.icons.find((i) => i.purpose === 'maskable');

    expect(icon192).toBeDefined();
    expect(icon512).toBeDefined();
    expect(maskable).toBeDefined();
  });

  it('has all required high-resolution PWA icons and apple touch icon', () => {
    const iconsDir = path.join(publicDir, 'icons');
    expect(fs.existsSync(path.join(iconsDir, 'icon-192.png'))).toBe(true);
    expect(fs.existsSync(path.join(iconsDir, 'icon-512.png'))).toBe(true);
    expect(fs.existsSync(path.join(iconsDir, 'icon-192-maskable.png'))).toBe(true);
    expect(fs.existsSync(path.join(iconsDir, 'icon-512-maskable.png'))).toBe(true);
    expect(fs.existsSync(path.join(iconsDir, 'apple-touch-icon.png'))).toBe(true);
    expect(fs.existsSync(path.join(iconsDir, 'favicon.svg'))).toBe(true);
  });

  it('has a valid service worker with Network-First and Cache strategies', () => {
    const swPath = path.join(publicDir, 'sw.js');
    expect(fs.existsSync(swPath)).toBe(true);

    const swContent = fs.readFileSync(swPath, 'utf8');
    expect(swContent).toContain("addEventListener('install'");
    expect(swContent).toContain("addEventListener('activate'");
    expect(swContent).toContain("addEventListener('fetch'");
    expect(swContent).toContain('/api/v1/');
    expect(swContent).toContain('skipWaiting()');
    expect(swContent).toContain('clients.claim()');
  });
});

describe('Mobile BottomNav Navigation', () => {
  beforeEach(() => {
    useUIStore.setState({
      isGlobalAddExpenseOpen: false,
      isGlobalBudgetOpen: false,
      isGlobalSettingsOpen: false,
    });
  });

  it('renders all 5 core mobile navigation items', () => {
    render(
      <BrowserRouter>
        <BottomNav />
      </BrowserRouter>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Expenses')).toBeInTheDocument();
    expect(screen.getByText('Add')).toBeInTheDocument();
    expect(screen.getByText('Budgets')).toBeInTheDocument();
    expect(screen.getByText('More')).toBeInTheDocument();
  });

  it('triggers quick Add Expense modal when center (+) is tapped', () => {
    render(
      <BrowserRouter>
        <BottomNav />
      </BrowserRouter>
    );

    const addBtn = screen.getByLabelText('Quick Add Expense');
    fireEvent.click(addBtn);

    expect(useUIStore.getState().isGlobalAddExpenseOpen).toBe(true);
  });

  it('triggers Budget Goals modal when Budgets button is tapped', () => {
    render(
      <BrowserRouter>
        <BottomNav />
      </BrowserRouter>
    );

    const budgetsBtn = screen.getByLabelText('Manage Budget Goals');
    fireEvent.click(budgetsBtn);

    expect(useUIStore.getState().isGlobalBudgetOpen).toBe(true);
  });

  it('triggers App Settings modal when More button is tapped', () => {
    render(
      <BrowserRouter>
        <BottomNav />
      </BrowserRouter>
    );

    const moreBtn = screen.getByLabelText('Settings and options');
    fireEvent.click(moreBtn);

    expect(useUIStore.getState().isGlobalSettingsOpen).toBe(true);
  });
});

describe('Modal Viewport Constraints', () => {
  it('renders modal with flex-col and max-h-[calc(100dvh-1.5rem)] for viewport containment', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Viewport Modal">
        <p>Modal body content</p>
      </Modal>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('flex');
    expect(dialog.className).toContain('flex-col');
    expect(dialog.className).toContain('max-h-[calc(100dvh-1.5rem)]');
  });
});

describe('PWA Install Trigger in useUIStore', () => {
  it('triggers deferred install prompt when available', async () => {
    const promptMock = vi.fn();
    window.deferredPWAInstallPrompt = {
      prompt: promptMock,
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    };

    const accepted = await useUIStore.getState().triggerPWAInstall();
    expect(promptMock).toHaveBeenCalled();
    expect(accepted).toBe(true);
    expect(window.deferredPWAInstallPrompt).toBeNull();
  });
});
