import { useInventory } from "@/context/InventoryContext";
import { Package, AlertTriangle, DollarSign, ShoppingCart, TrendingUp, TrendingDown, ArrowUp, ArrowDown, Activity, Zap, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, RadialBarChart, RadialBar, Legend,
} from "recharts";
import { formatDistanceToNow } from "date-fns";
import { useMemo } from "react";

const CHART_COLORS = [
  "hsl(38, 92%, 50%)",
  "hsl(142, 71%, 45%)",
  "hsl(200, 80%, 50%)",
  "hsl(280, 60%, 55%)",
  "hsl(0, 72%, 51%)",
];

export default function Dashboard() {
  const { products, alerts, orders, activities } = useInventory();

  const stats = useMemo(() => {
    const totalSKUs = products.length;
    const lowStockCount = alerts.filter((a) => !a.dismissed && (a.type === "low-stock" || a.type === "out-of-stock")).length;
    const totalValue = products.reduce((s, p) => s + p.quantity * p.unitCost, 0);
    const pendingOrders = orders.filter((o) => o.status !== "received").length;
    const totalUnits = products.reduce((s, p) => s + p.quantity, 0);
    const avgUnitCost = products.length ? products.reduce((s, p) => s + p.unitCost, 0) / products.length : 0;
    const inStockPercent = products.length ? Math.round((products.filter(p => p.status === "in-stock").length / products.length) * 100) : 0;
    const outOfStock = products.filter(p => p.status === "out").length;

    return { totalSKUs, lowStockCount, totalValue, pendingOrders, totalUnits, avgUnitCost, inStockPercent, outOfStock };
  }, [products, alerts, orders]);

  const categoryData = useMemo(() =>
    Object.entries(
      products.reduce<Record<string, number>>((acc, p) => {
        acc[p.category] = (acc[p.category] || 0) + p.quantity * p.unitCost;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value: Math.round(value) })),
    [products]
  );

  const topItems = useMemo(() =>
    [...products]
      .sort((a, b) => b.quantity * b.unitCost - a.quantity * a.unitCost)
      .slice(0, 8)
      .map((p) => ({ name: p.name.slice(0, 18), value: Math.round(p.quantity * p.unitCost), qty: p.quantity })),
    [products]
  );

  const stockTimeline = useMemo(() =>
    Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      const base = products.reduce((s, p) => s + p.quantity, 0);
      return {
        date: d.toLocaleDateString("en", { month: "short", day: "numeric" }),
        total: Math.round(base * (0.8 + Math.random() * 0.4)),
        value: Math.round(stats.totalValue * (0.85 + Math.random() * 0.3)),
      };
    }),
    [products, stats.totalValue]
  );

  const categoryUnits = useMemo(() =>
    Object.entries(
      products.reduce<Record<string, { inStock: number; low: number; out: number }>>((acc, p) => {
        if (!acc[p.category]) acc[p.category] = { inStock: 0, low: 0, out: 0 };
        if (p.status === "in-stock") acc[p.category].inStock += p.quantity;
        else if (p.status === "low") acc[p.category].low += p.quantity;
        else acc[p.category].out += 1;
        return acc;
      }, {})
    ).map(([name, data]) => ({ name: name.slice(0, 12), ...data })),
    [products]
  );

  const healthData = useMemo(() => [
    { name: "Health", value: stats.inStockPercent, fill: stats.inStockPercent > 70 ? "hsl(142, 71%, 45%)" : stats.inStockPercent > 40 ? "hsl(38, 92%, 50%)" : "hsl(0, 72%, 51%)" },
  ], [stats.inStockPercent]);

  const supplierData = useMemo(() => {
    const grouped = products.reduce<Record<string, { count: number; value: number }>>((acc, p) => {
      if (!acc[p.supplier]) acc[p.supplier] = { count: 0, value: 0 };
      acc[p.supplier].count++;
      acc[p.supplier].value += p.quantity * p.unitCost;
      return acc;
    }, {});
    return Object.entries(grouped)
      .map(([name, data]) => ({ name: name.slice(0, 16), ...data }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [products]);

  const activityIcon = (type: string) => {
    switch (type) {
      case "restock": return <ArrowUp className="h-3 w-3 text-success" />;
      case "sale": return <ArrowDown className="h-3 w-3 text-primary" />;
      case "alert": return <AlertTriangle className="h-3 w-3 text-danger" />;
      default: return <ShoppingCart className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const lowStockProducts = products.filter(p => p.status === "low" || p.status === "out").slice(0, 5);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="font-mono text-2xl font-bold text-primary">Dashboard</h1>
        <Badge variant="outline" className="text-xs font-mono text-muted-foreground border-border">
          <Activity className="h-3 w-3 mr-1" />
          Live Data
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total SKUs", value: stats.totalSKUs, icon: Package, sub: `${stats.totalUnits.toLocaleString()} total units`, trend: "+2", up: true },
          { label: "Low Stock Alerts", value: stats.lowStockCount, icon: AlertTriangle, sub: `${stats.outOfStock} out of stock`, trend: stats.lowStockCount > 3 ? "High" : "Normal", up: false, danger: true },
          { label: "Inventory Value", value: `$${stats.totalValue.toLocaleString("en", { minimumFractionDigits: 0 })}`, icon: DollarSign, sub: `Avg $${stats.avgUnitCost.toFixed(0)}/unit`, trend: "+4.2%", up: true },
          { label: "Orders Pending", value: stats.pendingOrders, icon: ShoppingCart, sub: `${orders.length} total orders`, trend: `${stats.pendingOrders}`, up: false },
        ].map((card, idx) => (
          <Card key={card.label} className="bg-card border-border group hover:border-primary/30 transition-all duration-300" style={{ animationDelay: `${idx * 100}ms` }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{card.label}</CardTitle>
              <div className={`p-2 rounded-lg ${card.danger ? "bg-danger/10" : "bg-primary/10"} group-hover:scale-110 transition-transform`}>
                <card.icon className={`h-4 w-4 ${card.danger ? "text-danger" : "text-primary"}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="font-mono text-3xl font-bold tracking-tight">{card.value}</div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">{card.sub}</p>
                <span className={`inline-flex items-center text-xs font-mono ${card.up ? "text-success" : card.danger ? "text-danger" : "text-muted-foreground"}`}>
                  {card.up ? <TrendingUp className="h-3 w-3 mr-0.5" /> : null}
                  {card.trend}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stock Health + Category Breakdown */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Stock Health</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={160}>
              <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" startAngle={180} endAngle={0} data={healthData}>
                <RadialBar background dataKey="value" cornerRadius={10} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="-mt-8 text-center">
              <p className="font-mono text-3xl font-bold">{stats.inStockPercent}%</p>
              <p className="text-xs text-muted-foreground mt-1">Products In Stock</p>
            </div>
            <div className="w-full mt-4 space-y-2">
              {[
                { label: "In Stock", count: products.filter(p => p.status === "in-stock").length, color: "bg-success" },
                { label: "Low Stock", count: products.filter(p => p.status === "low").length, color: "bg-warning" },
                { label: "Out of Stock", count: products.filter(p => p.status === "out").length, color: "bg-danger" },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2 text-xs">
                  <div className={`h-2 w-2 rounded-full ${s.color}`} />
                  <span className="text-muted-foreground flex-1">{s.label}</span>
                  <span className="font-mono">{s.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader><CardTitle className="text-sm font-medium">Stock Levels (14 Days)</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stockTimeline}>
                <defs>
                  <linearGradient id="stockGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,20%)" />
                <XAxis dataKey="date" stroke="hsl(220,10%,55%)" fontSize={10} />
                <YAxis stroke="hsl(220,10%,55%)" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(220,18%,13%)", border: "1px solid hsl(220,14%,20%)", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="total" stroke="hsl(38,92%,50%)" strokeWidth={2} fill="url(#stockGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-sm font-medium">Value by Category</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(220,18%,13%)", border: "1px solid hsl(220,14%,20%)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-sm font-medium">Stock by Category</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryUnits}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,20%)" />
                <XAxis dataKey="name" stroke="hsl(220,10%,55%)" fontSize={9} />
                <YAxis stroke="hsl(220,10%,55%)" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(220,18%,13%)", border: "1px solid hsl(220,14%,20%)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="inStock" stackId="a" fill="hsl(142, 71%, 45%)" radius={[0, 0, 0, 0]} name="In Stock" />
                <Bar dataKey="low" stackId="a" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} name="Low" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-sm font-medium">Top Items by Value</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topItems} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,20%)" />
                <XAxis type="number" stroke="hsl(220,10%,55%)" fontSize={10} />
                <YAxis dataKey="name" type="category" width={85} stroke="hsl(220,10%,55%)" fontSize={9} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(220,18%,13%)", border: "1px solid hsl(220,14%,20%)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Bar dataKey="value" fill="hsl(38,92%,50%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom: Suppliers + Low Stock + Activity */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Top Suppliers</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {supplierData.map((s, i) => (
              <div key={s.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{s.name}</span>
                  <span className="font-mono">${s.value.toLocaleString()}</span>
                </div>
                <Progress value={(s.value / (supplierData[0]?.value || 1)) * 100} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /> Needs Attention</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {lowStockProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">All items well-stocked! ✓</p>
            ) : lowStockProducts.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                <div className={`h-2 w-2 rounded-full shrink-0 ${p.status === "out" ? "bg-danger animate-pulse" : "bg-warning"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{p.quantity}/{p.reorderPoint} units</p>
                </div>
                <Badge variant="outline" className={`text-[10px] ${p.status === "out" ? "border-danger/30 text-danger" : "border-warning/30 text-warning"}`}>
                  {p.status === "out" ? "OUT" : "LOW"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-sm font-medium">Recent Activity</CardTitle></CardHeader>
          <CardContent className="max-h-72 overflow-auto space-y-2">
            {activities.slice(0, 12).map((a) => (
              <div key={a.id} className="flex items-start gap-3 text-sm p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                <div className="mt-0.5 p-1 rounded bg-secondary">{activityIcon(a.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{a.message}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{formatDistanceToNow(new Date(a.timestamp), { addSuffix: true })}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
