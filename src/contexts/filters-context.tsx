import * as React from "react";
import { startOfMonth } from "date-fns";

export type AdsPlatform = string;

export type FiltersState = {
  month: Date; // first day of the selected month
  businessUnit: string | null;
  course: string | null;
  platform: AdsPlatform | null;
  week: string | null; // ISO date of week start
  excludeEad: boolean;
};

type FiltersContextValue = {
  filters: FiltersState;
  setMonth: (month: Date) => void;
  setBusinessUnit: (businessUnit: string | null) => void;
  setCourse: (course: string | null) => void;
  setPlatform: (platform: AdsPlatform | null) => void;
  setWeek: (week: string | null) => void;
  setExcludeEad: (exclude: boolean) => void;
  clear: () => void;
  isFiltersOpen: boolean;
  setIsFiltersOpen: (isOpen: boolean) => void;
  toggleFilters: () => void;
};

const FiltersContext = React.createContext<FiltersContextValue | null>(null);

const defaultFilters = (): FiltersState => ({
  month: startOfMonth(new Date()),
  businessUnit: null,
  course: null,
  platform: null,
  week: null,
  excludeEad: false,
});

export function FiltersProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = React.useState<FiltersState>(() => defaultFilters());
  const [isFiltersOpen, setIsFiltersOpen] = React.useState(false);

  const toggleFilters = React.useCallback(() => setIsFiltersOpen((p) => !p), []);

  const setMonth = React.useCallback((month: Date) => {
    setFilters((prev) => ({ ...prev, month: startOfMonth(month), week: null }));
  }, []);

  const setBusinessUnit = React.useCallback((businessUnit: string | null) => {
    setFilters((prev) => ({ ...prev, businessUnit, course: null }));
  }, []);

  const setCourse = React.useCallback((course: string | null) => {
    setFilters((prev) => ({ ...prev, course }));
  }, []);

  const setPlatform = React.useCallback((platform: AdsPlatform | null) => {
    setFilters((prev) => ({ ...prev, platform }));
  }, []);

  const setWeek = React.useCallback((week: string | null) => {
    setFilters((prev) => ({ ...prev, week }));
  }, []);

  const setExcludeEad = React.useCallback((excludeEad: boolean) => {
    setFilters((prev) => ({ ...prev, excludeEad }));
  }, []);

  const clear = React.useCallback(() => {
    setFilters(defaultFilters());
  }, []);

  const value = React.useMemo<FiltersContextValue>(
    () => ({
      filters,
      setMonth,
      setBusinessUnit,
      setCourse,
      setPlatform,
      setWeek,
      setExcludeEad,
      clear,
      isFiltersOpen,
      setIsFiltersOpen,
      toggleFilters,
    }),
    [
      filters,
      setMonth,
      setBusinessUnit,
      setCourse,
      setPlatform,
      setWeek,
      setExcludeEad,
      clear,
      isFiltersOpen,
      setIsFiltersOpen,
      toggleFilters,
    ],
  );

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useFilters() {
  const context = React.useContext(FiltersContext);
  if (!context) {
    throw new Error("useFilters must be used within a FiltersProvider");
  }
  return context;
}
