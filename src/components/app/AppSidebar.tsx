import * as React from "react";
import { BarChart3, Gauge, Filter } from "lucide-react";
import { useLocation } from "react-router-dom";

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
  useSidebar,
} from "@/components/ui/sidebar";
import { getSupabaseClient } from "@/integrations/supabase/client";

const navItems = [
  { title: "Controle de Budget", url: "/budget", icon: Gauge },
  // { title: "Inteligência Tática", url: "/performance", icon: BarChart3 }, // Hidden per user request
];

export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const client = getSupabaseClient();
  const { toggleFilters } = useFilters();

  return (
    <Sidebar collapsible="icon" className={collapsed ? "w-14" : "w-80"}>
      <SidebarHeader className="gap-2">
        <div className="flex items-center justify-center py-4">
          {!collapsed ? (
            <img src="/university-logo.png" alt="Logo" className="h-12 w-auto object-contain" />
          ) : (
            <img src="/favicon.png" alt="Logo" className="size-8 object-contain" />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
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

              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Filtros" onClick={toggleFilters}>
                  <Filter className="size-4" />
                  {!collapsed && <span>Filtros</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {!client && !collapsed && (
          <div className="mb-2 rounded border border-destructive/50 bg-destructive/10 p-2 text-[10px] text-destructive flex items-center gap-2">
            <div className="size-2 rounded-full bg-destructive animate-pulse" />
            <span>Sem conexão Supabase</span>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

