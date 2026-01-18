import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SupabaseDebugBanner } from "@/components/debug/SupabaseDebugBanner";
import { FiltersProvider } from "@/contexts/filters-context";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";

export function AppLayout() {
  return (
    <FiltersProvider>
      <SidebarProvider defaultOpen>
        <div className="min-h-svh flex w-full">
          <AppSidebar />

          <SidebarInset>
            <header className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b bg-background px-3">
              <SidebarTrigger />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">Painel de Mídia</p>
              </div>
            </header>

            <main className="flex-1 bg-background">
              <div className="px-3 pt-3">
                <SupabaseDebugBanner />
              </div>
              <Outlet />
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </FiltersProvider>
  );
}
