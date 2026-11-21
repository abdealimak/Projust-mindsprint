'use client';

import React, { createContext, useContext, useEffect } from 'react';

/**
 * Projust is light-only, matching the landing page. The provider stays so existing
 * `useTheme()` callers keep working, but the theme is always "light".
 */
type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: Theme;
  setTheme: (theme: string) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  resolvedTheme: 'light',
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Clean up any dark-mode state left over from older builds.
    const root = document.documentElement;
    root.classList.remove('dark', 'theme-dark');
    root.classList.add('theme-light');
    root.setAttribute('data-theme', 'light');
    try {
      localStorage.removeItem('projust_theme');
    } catch {
      // storage may be blocked
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: 'light', resolvedTheme: 'light', setTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
