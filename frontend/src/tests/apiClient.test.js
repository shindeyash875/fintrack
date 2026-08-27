import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getApiBaseUrl } from '../api/client';

describe('getApiBaseUrl Configuration Resolver', () => {
  const originalEnv = { ...import.meta.env };

  afterEach(() => {
    // Reset import.meta.env after each test
    Object.assign(import.meta.env, originalEnv);
    delete import.meta.env.VITE_API_BASE_URL;
    delete import.meta.env.VITE_API_URL;
    delete import.meta.env.VITE_BACKEND_URL;
  });

  it('falls back to local development URL when no env vars are defined', () => {
    delete import.meta.env.VITE_API_BASE_URL;
    delete import.meta.env.VITE_API_URL;
    delete import.meta.env.VITE_BACKEND_URL;

    const url = getApiBaseUrl();
    expect(url).toBe('http://localhost:8000/api/v1');
  });

  it('uses VITE_API_BASE_URL when provided with full path', () => {
    import.meta.env.VITE_API_BASE_URL = 'https://fintrack-api.onrender.com/api/v1';

    const url = getApiBaseUrl();
    expect(url).toBe('https://fintrack-api.onrender.com/api/v1');
  });

  it('automatically appends /api/v1 when user enters root backend domain', () => {
    import.meta.env.VITE_API_BASE_URL = 'https://fintrack-api.onrender.com';

    const url = getApiBaseUrl();
    expect(url).toBe('https://fintrack-api.onrender.com/api/v1');
  });

  it('strips trailing slashes cleanly', () => {
    import.meta.env.VITE_API_BASE_URL = 'https://fintrack-api.onrender.com/api/v1/';

    const url = getApiBaseUrl();
    expect(url).toBe('https://fintrack-api.onrender.com/api/v1');
  });

  it('supports VITE_API_URL as an alias when VITE_API_BASE_URL is not set', () => {
    delete import.meta.env.VITE_API_BASE_URL;
    import.meta.env.VITE_API_URL = 'https://fintrack-backend.onrender.com';

    const url = getApiBaseUrl();
    expect(url).toBe('https://fintrack-backend.onrender.com/api/v1');
  });

  it('automatically upgrades remote HTTP URLs to HTTPS in production', () => {
    import.meta.env.VITE_API_BASE_URL = 'http://fintrack-api.onrender.com/api/v1';

    const url = getApiBaseUrl();
    expect(url).toBe('https://fintrack-api.onrender.com/api/v1');
  });

  it('preserves http:// for localhost development', () => {
    import.meta.env.VITE_API_BASE_URL = 'http://localhost:8000/api/v1';

    const url = getApiBaseUrl();
    expect(url).toBe('http://localhost:8000/api/v1');
  });
});
