import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { FiltersProvider } from "@/contexts/filters-context";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/contexts/auth-context-core";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GaiaChatDrawer } from "@/components/gaia/GaiaChatDrawer";

export function AppLayout() {
  const { fullName, user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const getPageTitle = () => {
    switch (location.pathname) {
      case "/budget": return "Controle de Budget";
      case "/performance": return "Performance de Captação";
      case "/classificador": return "Classificação de Campanhas";
      case "/cadastros": return "Gestão de Cadastros";
      default: return "Dashboard";
    }
  };

  return (
    <FiltersProvider>
      <SidebarProvider defaultOpen={false}>
        <div className="min-h-svh flex w-full">
          <AppSidebar />

          <SidebarInset>
            <header className="flex h-16 items-center justify-between border-b bg-card px-6 sticky top-0 z-30 shrink-0">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="text-foreground" />
                <div className="h-6 w-px bg-border hidden md:block" />
                <h1 className="font-semibold text-lg text-foreground truncate max-w-[200px] md:max-w-none">
                  {getPageTitle()}
                </h1>
              </div>

              <div className="flex items-center gap-3">
                <GaiaChatDrawer />

                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border">
                  <User className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground max-w-[120px] truncate">
                    {fullName || user?.email || "Usuário"}
                  </span>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    await signOut();
                    navigate("/login", { replace: true });
                  }}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Sair"
                >
                  <LogOut className="size-5" />
                </Button>
              </div>
            </header>

            <main className="flex-1 min-w-0 bg-background p-4 md:p-6 lg:p-8">
              <Outlet />
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </FiltersProvider>
  );
}
