import * as React from "react";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
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
  excludeEad: boolean;
  setExcludeEad: (exclude: boolean) => void;
  hideBranding: boolean;
  setHideBranding: (hide: boolean) => void;
  clear: () => void;
  isFiltersOpen: boolean;
  setIsFiltersOpen: (isOpen: boolean) => void;
  toggleFilters: () => void;
};

const FiltersContext = React.createContext<FiltersContextValue | null>(null);

const defaultFilters = (): FiltersState => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const s = startOfMonth(today);
  const e = endOfMonth(today);
  // Garantir fim do dia para consistência com filtros
  const preciseEnd = new Date(e);
  preciseEnd.setHours(23, 59, 59, 999);

  return {
    month: s,
    dateRange: { from: s, to: preciseEnd },
    businessUnit: null,
    course: null,
    platform: null,
    week: null,
    excludeEad: false,
    hideBranding: true,
  };
};

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
      // Se o usuário selecionou um range manual, limpamos a "semana" selecionada para evitar conflito
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
    if (week) {
      // Append T00:00:00 to ensure local time parsing.
      // "2026-01-12" -> UTC (prev day in -03:00) vs "2026-01-12T00:00:00" -> Local
      // Ensure we only take the YYYY-MM-DD part if 'week' is an ISO string
      const datePart = String(week).slice(0, 10);
      const wDate = new Date(`${datePart}T00:00:00`);
      const s = startOfWeek(wDate, { weekStartsOn: 1 });
      const e = endOfWeek(wDate, { weekStartsOn: 1 });

      setFilters((prev) => ({
        ...prev,
        week,
        dateRange: { from: s, to: e },
        month: startOfMonth(s)
      }));
    } else {
      setFilters((prev) => ({
        ...prev,
        week: null,
        // Reset range to full month when week is cleared
        dateRange: { from: startOfMonth(prev.month), to: endOfMonth(prev.month) }
      }));
    }
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
      excludeEad: filters.excludeEad,
      setExcludeEad,
      hideBranding: filters.hideBranding,
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
