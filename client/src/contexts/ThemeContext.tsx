import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  switchable: boolean;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
}

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === "system") {
    return getSystemTheme();
  }
  return theme;
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  switchable = false,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (switchable) {
      const stored = localStorage.getItem("theme") as Theme | null;
      return stored || defaultTheme;
    }
    return defaultTheme;
  });
  
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(theme));
  const [isLoading, setIsLoading] = useState(switchable);
  const [isInitialized, setIsInitialized] = useState(false);

  // Query para buscar preferências do usuário (só executa se switchable)
  const { data: preferences, isLoading: prefsLoading } = trpc.userPreferences.get.useQuery(
    undefined,
    { 
      enabled: switchable,
      retry: false,
      staleTime: 1000 * 60 * 5, // 5 minutos
      refetchOnWindowFocus: false,
    }
  );

  // Mutation para salvar preferências
  const updatePreferences = trpc.userPreferences.update.useMutation();

  // Inicializar tema do backend quando disponível
  useEffect(() => {
    if (switchable && preferences && !isInitialized) {
      const backendTheme = preferences.theme as Theme;
      setThemeState(backendTheme);
      setResolvedTheme(resolveTheme(backendTheme));
      localStorage.setItem("theme", backendTheme);
      setIsInitialized(true);
      setIsLoading(false);
    } else if (switchable && !prefsLoading && !preferences) {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [preferences, prefsLoading, switchable, isInitialized]);

  // Aplicar tema no DOM
  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [resolvedTheme]);

  // Listener para mudanças no tema do sistema
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      setResolvedTheme(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    // Adicionar classe de transição antes de mudar o tema
    document.documentElement.classList.add('theme-transitioning');
    
    setThemeState(newTheme);
    setResolvedTheme(resolveTheme(newTheme));
    
    if (switchable) {
      localStorage.setItem("theme", newTheme);
      // Salvar no backend
      updatePreferences.mutate({ theme: newTheme });
    }
    
    // Remover classe de transição após a animação (300ms)
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
    }, 300);
  }, [switchable, updatePreferences]);

  const toggleTheme = useCallback(() => {
    const nextTheme: Theme = resolvedTheme === "light" ? "dark" : "light";
    setTheme(nextTheme);
  }, [resolvedTheme, setTheme]);

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      resolvedTheme,
      setTheme,
      toggleTheme, 
      switchable,
      isLoading: isLoading || prefsLoading,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
