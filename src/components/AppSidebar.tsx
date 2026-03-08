import { LayoutDashboard, Package, ShoppingCart, AlertTriangle, Bot, Boxes } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useInventory } from "@/context/InventoryContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Inventory", url: "/inventory", icon: Package },
  { title: "Orders", url: "/orders", icon: ShoppingCart },
  { title: "Alerts", url: "/alerts", icon: AlertTriangle },
  { title: "AI Assistant", url: "/assistant", icon: Bot },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { alerts, products } = useInventory();
  const activeAlerts = alerts.filter((a) => !a.dismissed).length;
  const totalValue = products.reduce((s, p) => s + p.quantity * p.unitCost, 0);

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Boxes className="h-5 w-5 text-primary" />
          </div>
          {!collapsed && (
            <div>
              <span className="font-mono text-lg font-bold text-primary leading-none">InvAI</span>
              <p className="text-[9px] text-muted-foreground leading-none mt-0.5">Inventory Intelligence</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-[10px] uppercase tracking-widest">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-secondary"
                      activeClassName="bg-secondary text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && (
                        <span className="flex-1">{item.title}</span>
                      )}
                      {!collapsed && item.title === "Alerts" && activeAlerts > 0 && (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[10px] font-bold text-danger-foreground animate-pulse">
                          {activeAlerts}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {!collapsed && (
        <SidebarFooter className="p-4">
          <div className="rounded-lg bg-secondary/50 p-3 space-y-1.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Portfolio Value</p>
            <p className="font-mono text-lg font-bold text-primary">${totalValue.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">{products.length} products tracked</p>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
