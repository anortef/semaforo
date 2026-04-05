import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export interface Theme {
  id: string;
  name: string;
  vars: Record<string, string>;
}

export const THEMES: Theme[] = [
  {
    id: "dark",
    name: "Dark",
    vars: {
      "--color-bg": "#0f1117",
      "--color-surface": "#161921",
      "--color-surface-hover": "#1c2030",
      "--color-border": "#2a2e3d",
      "--color-text": "#e1e4ed",
      "--color-text-muted": "#8b90a0",
      "--color-accent": "#6c5ce7",
      "--color-accent-hover": "#7c6ef7",
      "--color-green": "#00b894",
      "--color-red": "#e74c3c",
      "--color-input-bg": "#1c2030",
    },
  },
  {
    id: "light",
    name: "Light",
    vars: {
      "--color-bg": "#f5f6fa",
      "--color-surface": "#ffffff",
      "--color-surface-hover": "#f0f1f5",
      "--color-border": "#e0e2e9",
      "--color-text": "#1a1c24",
      "--color-text-muted": "#6b7080",
      "--color-accent": "#6c5ce7",
      "--color-accent-hover": "#5a4bd6",
      "--color-green": "#00a884",
      "--color-red": "#d63031",
      "--color-input-bg": "#f0f1f5",
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    vars: {
      "--color-bg": "#0a0e1a",
      "--color-surface": "#111827",
      "--color-surface-hover": "#1a2236",
      "--color-border": "#1f2a40",
      "--color-text": "#d1d5e0",
      "--color-text-muted": "#6b7494",
      "--color-accent": "#3b82f6",
      "--color-accent-hover": "#2563eb",
      "--color-green": "#10b981",
      "--color-red": "#ef4444",
      "--color-input-bg": "#1a2236",
    },
  },
  {
    id: "forest",
    name: "Forest",
    vars: {
      "--color-bg": "#0f1510",
      "--color-surface": "#161f17",
      "--color-surface-hover": "#1c2a1e",
      "--color-border": "#2a3d2d",
      "--color-text": "#d4e4d6",
      "--color-text-muted": "#7a9b7e",
      "--color-accent": "#22c55e",
      "--color-accent-hover": "#16a34a",
      "--color-green": "#22c55e",
      "--color-red": "#ef4444",
      "--color-input-bg": "#1c2a1e",
    },
  },
  {
    id: "sunset",
    name: "Sunset",
    vars: {
      "--color-bg": "#1a0f0f",
      "--color-surface": "#221616",
      "--color-surface-hover": "#2d1c1c",
      "--color-border": "#3d2a2a",
      "--color-text": "#e8d5d5",
      "--color-text-muted": "#a08080",
      "--color-accent": "#f97316",
      "--color-accent-hover": "#ea580c",
      "--color-green": "#22c55e",
      "--color-red": "#ef4444",
      "--color-input-bg": "#2d1c1c",
    },
  },
];

interface ThemeContextValue {
  theme: Theme;
  setThemeId: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme.vars)) {
    root.style.setProperty(key, value);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("theme");
    return THEMES.find((t) => t.id === saved) ?? THEMES[0];
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setThemeId = useCallback((id: string) => {
    const found = THEMES.find((t) => t.id === id);
    if (found) {
      setTheme(found);
      localStorage.setItem("theme", id);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setThemeId }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
