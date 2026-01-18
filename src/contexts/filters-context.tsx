import * as React from "react";
import { startOfMonth } from "date-fns";

export type AdsPlatform = "Meta" | "Google";

export type FiltersState = {
  month: Date; // first day of the selected month
  businessUnit: string | null;
  course: string | null;
  platform: AdsPlatform | null;
};

type FiltersContextValue = {
  filters: FiltersState;
  setMonth: (month: Date) => void;
  setBusinessUnit: (businessUnit: string | null) => void;
  setCourse: (course: string | null) => void;
  setPlatform: (platform: AdsPlatform | null) => void;
  clear: () => void;
};

const FiltersContext = React.createContext<FiltersContextValue | null>(null);

const defaultFilters = (): FiltersState => ({
  month: startOfMonth(new Date()),
  businessUnit: null,
  course: null,
  platform: null,
});

export function FiltersProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = React.useState<FiltersState>(() => defaultFilters());

  const setMonth = React.useCallback((month: Date) => {
    setFilters((prev) => ({ ...prev, month: startOfMonth(month) }));
  }, []);

  const setBusinessUnit = React.useCallback((businessUnit: string | null) => {
    // Cascata obrigatória: trocar unidade reseta curso.
    setFilters((prev) => ({ ...prev, businessUnit, course: null }));
  }, []);

  const setCourse = React.useCallback((course: string | null) => {
    setFilters((prev) => ({ ...prev, course }));
  }, []);

  const setPlatform = React.useCallback((platform: AdsPlatform | null) => {
    setFilters((prev) => ({ ...prev, platform }));
  }, []);

  const clear = React.useCallback(() => {
    setFilters(defaultFilters());
  }, []);

  const value = React.useMemo<FiltersContextValue>(
    () => ({ filters, setMonth, setBusinessUnit, setCourse, setPlatform, clear }),
    [filters, setMonth, setBusinessUnit, setCourse, setPlatform, clear],
  );

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useFilters() {
  const ctx = React.useContext(FiltersContext);
  if (!ctx) throw new Error("useFilters must be used within FiltersProvider");
  return ctx;
}
