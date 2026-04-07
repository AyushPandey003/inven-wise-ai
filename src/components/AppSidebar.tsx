import {
  LayoutDashboard, Package, ShoppingCart, AlertTriangle, Bot, Boxes, Truck,
  FolderOpen, History, DollarSign, Warehouse, BarChart3, Wifi, WifiOff,
  Brain, Box, Zap, Leaf, Radio, Shield, TrendingUp, ArrowRight,
  Skull, Heart, Users, TrendingDown, Calendar,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useInventory } from "@/context/InventoryContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

const mainNav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Inventory", url: "/inventory", icon: Package },
  { title: "Orders", url: "/orders", icon: ShoppingCart },
  { title: "Alerts", url: "/alerts", icon: AlertTriangle },
  { title: "AI Assistant", url: "/assistant", icon: Bot },
];

const manageNav = [
  { title: "Suppliers", url: "/suppliers", icon: Truck },
  { title: "Categories", url: "/categories", icon: FolderOpen },
  { title: "Warehouses", url: "/warehouses", icon: Warehouse },
  { title: "Stock History", url: "/stock-history", icon: History },
  { title: "Pricing & Variants", url: "/pricing", icon: DollarSign },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Advanced Analytics", url: "/advanced-analytics", icon: BarChart3 },
  { title: "Warehouse Transfers", url: "/warehouse-transfers", icon: ArrowRight },
  { title: "Dead Stock", url: "/dead-stock", icon: Skull },
  { title: "Inventory Health", url: "/inventory-health", icon: Heart },
  { title: "Supplier Metrics", url: "/supplier-metrics", icon: Users },
  { title: "Safety Stock", url: "/safety-stock", icon: TrendingDown },
  { title: "Inventory Aging", url: "/inventory-aging", icon: Calendar },
];

const intelligenceNav = [
  { title: "AI Agents", url: "/ai-agents", icon: Brain },
  { title: "Digital Twin", url: "/digital-twin", icon: Box },
  { title: "Stress Testing", url: "/stress-test", icon: Zap },
  { title: "Sustainability", url: "/sustainability", icon: Leaf },
  { title: "IoT Sensors", url: "/iot-sensors", icon: Radio },
  { title: "Provenance", url: "/provenance", icon: Shield },
  { title: "Demand Intel", url: "/demand-intelligence", icon: TrendingUp },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { alerts, products, isApiConnected } = useInventory();
  const activeAlerts = alerts.filter((a) => !a.dismissed).length;
  const totalValue = products.reduce((s, p) => s + p.quantity * p.unitCost, 0);

  const renderNav = (items: typeof mainNav, label: string) => (
    <SidebarGroup>
      <SidebarGroupLabel className="text-muted-foreground text-[10px] uppercase tracking-widest">{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink
                  to={item.url}
                  end={item.url === "/"}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-secondary"
                  activeClassName="bg-secondary text-primary font-medium"
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="flex-1">{item.title}</span>}
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
  );

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
        {renderNav(mainNav, "Navigation")}
        {renderNav(manageNav, "Management")}
        {renderNav(intelligenceNav, "Intelligence")}
      </SidebarContent>
      {!collapsed && (
        <SidebarFooter className="p-4 space-y-2">
          <div className="rounded-lg bg-secondary/50 p-3 space-y-1.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Portfolio Value</p>
            <p className="font-mono text-lg font-bold text-primary">${totalValue.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">{products.length} products tracked</p>
          </div>
          <div className="flex items-center gap-1.5 px-1">
            {isApiConnected ? (
              <>
                <Wifi className="h-3 w-3 text-success" />
                <span className="text-[10px] text-success">Connected to API</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-danger" />
                <span className="text-[10px] text-danger">API Disconnected</span>
              </>
            )}
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
