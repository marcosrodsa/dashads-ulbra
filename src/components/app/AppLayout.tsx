import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { FiltersProvider } from "@/contexts/filters-context";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";

export function AppLayout() {
  return (
    <FiltersProvider>
      <SidebarProvider defaultOpen={false}>
        <div className="min-h-svh flex w-full">
          <AppSidebar />

          <SidebarInset>
            <header className="flex h-14 items-center gap-4 border-b bg-sidebar px-6 lg:hidden shrink-0">
              <SidebarTrigger className="text-sidebar-foreground" />
              <div className="font-semibold text-sidebar-foreground">Controle de Budget</div>
            </header>

            <main className="flex-1 min-w-0 bg-background">
              <Outlet />
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </FiltersProvider>
  );
}
