import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useUIStore } from '../store/useUIStore';
import ThemeToggle from '../components/common/ThemeToggle';
import SettingsModal from '../components/common/SettingsModal';

describe('Theme Changer & Dark Mode System', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    useUIStore.getState().setTheme('light');
  });

  it('initializes with light mode by default and syncs with DOM', () => {
    expect(useUIStore.getState().theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('updates state, localStorage, and DOM when toggling theme', () => {
    const { toggleTheme, setTheme } = useUIStore.getState();

    toggleTheme();
    expect(useUIStore.getState().theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('fintrack_theme')).toBe('dark');

    toggleTheme();
    expect(useUIStore.getState().theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('fintrack_theme')).toBe('light');

    setTheme('dark');
    expect(useUIStore.getState().theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('renders icon ThemeToggle and responds to user click', () => {
    render(<ThemeToggle variant="icon" />);
    const button = screen.getByRole('button', { name: /switch to dark mode/i });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(useUIStore.getState().theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    const darkButton = screen.getByRole('button', { name: /switch to light mode/i });
    expect(darkButton).toBeInTheDocument();

    fireEvent.click(darkButton);
    expect(useUIStore.getState().theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('renders segmented ThemeToggle with Light and Dark options', () => {
    render(<ThemeToggle variant="segmented" />);
    const lightBtn = screen.getByRole('button', { name: /light/i });
    const darkBtn = screen.getByRole('button', { name: /dark/i });

    expect(lightBtn).toBeInTheDocument();
    expect(darkBtn).toBeInTheDocument();

    fireEvent.click(darkBtn);
    expect(useUIStore.getState().theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    fireEvent.click(lightBtn);
    expect(useUIStore.getState().theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('renders Appearance settings inside SettingsModal', () => {
    render(<SettingsModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText(/Appearance/i)).toBeInTheDocument();
    expect(screen.getByText(/Customize your color theme preference/i)).toBeInTheDocument();

    const darkBtn = screen.getByRole('button', { name: /dark/i });
    fireEvent.click(darkBtn);
    expect(useUIStore.getState().theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
