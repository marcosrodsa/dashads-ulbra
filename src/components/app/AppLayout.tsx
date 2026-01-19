import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { FiltersProvider } from "@/contexts/filters-context";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { AppFilters } from "./AppFilters";
import { AppConfiguration } from "./AppConfiguration";

export function AppLayout() {
  return (
    <FiltersProvider>
      <SidebarProvider defaultOpen>
        <div className="min-h-svh flex w-full">
          <AppSidebar />

          <SidebarInset>
            <header className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b bg-background px-3">
              <SidebarTrigger />
              <AppFilters />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">Painel de Mídia</p>
              </div>
              <AppConfiguration />
            </header>

            <main className="flex-1 bg-background">
              <Outlet />
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </FiltersProvider>
  );
}
