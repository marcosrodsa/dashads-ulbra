import * as React from "react";
import { startOfMonth, endOfMonth } from "date-fns";
import { DateRange } from "react-day-picker";

export type AdsPlatform = string;

export type FiltersState = {
  month: Date; // Keep as Date acting as "current view month" or fallback
  dateRange: DateRange | undefined; // The actual selected range
  businessUnit: string | null;
  course: string | null;
  platform: AdsPlatform | null;
  week: string | null; // ISO date of week start
  excludeEad: boolean;
  hideBranding: boolean;
};

type FiltersContextValue = {
  filters: FiltersState;
  setMonth: (month: Date) => void;
  setDateRange: (range: DateRange | undefined) => void;
  setBusinessUnit: (businessUnit: string | null) => void;
  setCourse: (course: string | null) => void;
  setPlatform: (platform: AdsPlatform | null) => void;
  setWeek: (week: string | null) => void;
  setExcludeEad: (exclude: boolean) => void;
  setHideBranding: (hide: boolean) => void;
  clear: () => void;
  isFiltersOpen: boolean;
  setIsFiltersOpen: (isOpen: boolean) => void;
  toggleFilters: () => void;
};

const FiltersContext = React.createContext<FiltersContextValue | null>(null);

const defaultFilters = (): FiltersState => ({
  month: startOfMonth(new Date()),
  dateRange: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
  businessUnit: null,
  course: null,
  platform: null,
  week: null,
  excludeEad: false,
  hideBranding: true,
});

export function FiltersProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = React.useState<FiltersState>(() => defaultFilters());
  const [isFiltersOpen, setIsFiltersOpen] = React.useState(false);

  const toggleFilters = React.useCallback(() => setIsFiltersOpen((p) => !p), []);

  const setDateRange = React.useCallback((range: DateRange | undefined) => {
    setFilters((prev) => ({
      ...prev,
      dateRange: range,
      // If range has a 'from', sync 'month' to it so calendars open in the right place.
      month: range?.from ? startOfMonth(range.from) : prev.month,
      week: null
    }));
  }, []);

  const setMonth = React.useCallback((month: Date) => {
    // When selecting a month solely, we set the range to the whole month
    const s = startOfMonth(month);
    const e = endOfMonth(month);
    setFilters((prev) => ({
      ...prev,
      month: s,
      dateRange: { from: s, to: e },
      week: null
    }));
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

  const setHideBranding = React.useCallback((hideBranding: boolean) => {
    setFilters((prev) => ({ ...prev, hideBranding }));
  }, []);

  const clear = React.useCallback(() => {
    setFilters(defaultFilters());
  }, []);

  const value = React.useMemo<FiltersContextValue>(
    () => ({
      filters,
      setMonth,
      dateRange: filters.dateRange,
      setDateRange,
      setBusinessUnit,
      setCourse,
      setPlatform,
      setWeek,
      setExcludeEad,
      setHideBranding,
      clear,
      isFiltersOpen,
      setIsFiltersOpen,
      toggleFilters,
    }),
    [
      filters,
      setMonth,
      filters.dateRange,
      setDateRange,
      setBusinessUnit,
      setCourse,
      setPlatform,
      setWeek,
      setExcludeEad,
      setHideBranding,
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
