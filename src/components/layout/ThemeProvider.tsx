'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  resolvedTheme: 'dark',
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    // Read persisted theme from localStorage or default to dark
    const saved = localStorage.getItem('projust_theme') as Theme | null;
    const initialTheme: Theme = saved && ['light', 'dark', 'system'].includes(saved) ? saved : 'dark';
    setThemeState(initialTheme);
  }, []);

  useEffect(() => {
    function applyTheme() {
      let active: 'light' | 'dark' = 'dark';

      if (theme === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        active = systemPrefersDark ? 'dark' : 'light';
      } else {
        active = theme;
      }

      setResolvedTheme(active);
      document.documentElement.setAttribute('data-theme', active);
      if (active === 'dark') {
        document.documentElement.classList.add('dark', 'theme-dark');
        document.documentElement.classList.remove('theme-light');
      } else {
        document.documentElement.classList.remove('dark', 'theme-dark');
        document.documentElement.classList.add('theme-light');
      }
    }

    applyTheme();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme();
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('projust_theme', newTheme);
    document.cookie = `projust_theme=${newTheme}; path=/; max-age=31536000`;
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
