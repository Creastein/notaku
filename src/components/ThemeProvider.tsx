"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { ThemeValue, getStoredTheme, applyTheme, initTheme } from "@/lib/theme";

type ThemeContextType = {
  theme: ThemeValue;
  setTheme: (theme: ThemeValue) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: "system",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeValue>("system");

  useEffect(() => {
    setThemeState(getStoredTheme());
    const cleanup = initTheme();
    return cleanup;
  }, []);

  const setTheme = (newTheme: ThemeValue) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
