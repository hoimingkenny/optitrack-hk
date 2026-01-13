'use client';

import { createContext, useContext, useState, useCallback, useMemo, ReactNode, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Start with light theme to match SSR
  const [theme, setTheme] = useState<Theme>('light');

  // Only run on client after mount
  useEffect(() => {
    const stored = localStorage.getItem('optitrack-theme') as Theme;
    if ((stored === 'light' || stored === 'dark') && stored !== theme) {
      setTheme(stored);
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('optitrack-theme', newTheme);
      return newTheme;
    });
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}