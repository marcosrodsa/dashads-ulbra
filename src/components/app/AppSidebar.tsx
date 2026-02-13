import * as React from "react";
import { BarChart3, Gauge, Filter, Tag, Database, Code, Users, Activity, Sparkles } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { useFilters } from "@/contexts/filters-context";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth-context-core";
import { AppConfiguration } from "./AppConfiguration";
import { LogOut } from "lucide-react";
import { hasAccess } from "@/lib/permissions";

const navItems = [
  { title: "Controle de Budget", url: "/budget", icon: Gauge },
  { title: "Performance de Captação", url: "/performance", icon: BarChart3 },
  { title: "Inteligência de Criativos", url: "/creatives", icon: Sparkles },
  { title: "Classificação de Campanhas", url: "/classificador", icon: Tag },
  { title: "Usuários", url: "/cadastros/usuarios", icon: Users },
  { title: "Outros Cadastros", url: "/cadastros", icon: Database },
  { title: "Status do Sistema", url: "/status", icon: Activity },
  { title: "Tags & Pixels", url: "/cadastros/tags", icon: Code },
];


export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const client = getSupabaseClient();
  const { role, signOut } = useAuth();
  const { toggleFilters } = useFilters();
  const navigate = useNavigate();

  const filteredNavItems = navItems.filter(item => hasAccess(role, item.url));

  return (
    <Sidebar collapsible="icon" className={collapsed ? "w-14" : "w-80"}>
      <SidebarHeader className="gap-2 relative">
        <div className={`flex items-center justify-between py-4 ${collapsed ? 'px-0 justify-center' : 'px-2'}`}>
          {!collapsed ? (
            <>
              <img src="/university-logo.png" alt="Logo" className="h-12 w-auto object-contain" />
            </>
          ) : (
            <img src="/ulbra-logo-icon.png" alt="Logo" className="w-10 h-10 object-contain" />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-2"
                      activeClassName="text-sidebar-primary"
                    >
                      <item.icon className="size-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex flex-col gap-1 p-1">
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Configurações">
              <AppConfiguration />
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={async () => {
                await signOut();
                navigate("/login", { replace: true });
              }}
              tooltip="Sair"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="size-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </div>

        {!client && !collapsed && (
          <div className="mb-2 rounded border border-destructive/50 bg-destructive/10 p-2 text-[10px] text-destructive flex items-center gap-2">
            <div className="size-2 rounded-full bg-destructive animate-pulse" />
            <span>Sem conexão Supabase</span>
          </div>
        )}
      </SidebarFooter>
    </Sidebar >
  );
}

