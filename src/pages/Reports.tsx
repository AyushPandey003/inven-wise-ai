import { useMemo } from "react";
import { useInventory } from "@/context/InventoryContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { TrendingUp, DollarSign, Package, AlertTriangle, Truck, BarChart3 } from "lucide-react";

const COLORS = [
  "hsl(38, 92%, 50%)",
  "hsl(142, 71%, 45%)",
  "hsl(200, 80%, 50%)",
  "hsl(280, 60%, 55%)",
  "hsl(0, 72%, 51%)",
  "hsl(45, 93%, 47%)",
  "hsl(170, 70%, 45%)",
  "hsl(340, 70%, 55%)",
];

export default function Reports() {
  const { products, suppliers, categoriesList, stockEvents, orders, warehouses } = useInventory();

  // Margin analysis by category
  const categoryMargins = useMemo(() =>
    categoriesList.map((cat) => {
      const catProducts = products.filter((p) => p.category === cat.name);
      const totalCost = catProducts.reduce((s, p) => s + p.quantity * p.unitCost, 0);
      const totalRevenue = catProducts.reduce((s, p) => s + p.quantity * p.sellingPrice, 0);
      const avgMargin = catProducts.length > 0
        ? catProducts.reduce((s, p) => s + ((p.sellingPrice - p.unitCost) / (p.sellingPrice || 1)) * 100, 0) / catProducts.length
        : 0;
      return {
        name: cat.name,
        cost: Math.round(totalCost),
        revenue: Math.round(totalRevenue),
        profit: Math.round(totalRevenue - totalCost),
        margin: Number(avgMargin.toFixed(1)),
        products: catProducts.length,
      };
    }),
    [categoriesList, products]
  );

  // Supplier performance
  const supplierPerf = useMemo(() =>
    suppliers.map((s) => {
      const supProducts = products.filter((p) => p.supplier === s.name);
      const totalValue = supProducts.reduce((acc, p) => acc + p.quantity * p.unitCost, 0);
      const lowStock = supProducts.filter((p) => p.status === "low" || p.status === "out").length;
      return {
        name: s.name,
        products: supProducts.length,
        value: Math.round(totalValue),
        rating: s.rating,
        leadTime: s.leadTimeDays,
        lowStock,
      };
    }).sort((a, b) => b.value - a.value).slice(0, 8),
    [suppliers, products]
  );

  // Inventory by status
  const statusDistribution = useMemo(() => {
    const inStock = products.filter((p) => p.status === "in-stock").length;
    const low = products.filter((p) => p.status === "low").length;
    const out = products.filter((p) => p.status === "out").length;
    return [
      { name: "In Stock", value: inStock, fill: "hsl(142, 71%, 45%)" },
      { name: "Low Stock", value: low, fill: "hsl(38, 92%, 50%)" },
      { name: "Out of Stock", value: out, fill: "hsl(0, 72%, 51%)" },
    ];
  }, [products]);

  // Top products needing reorder
  const reorderNeeded = useMemo(() =>
    products
      .filter((p) => p.quantity <= p.reorderPoint)
      .sort((a, b) => (a.quantity / (a.reorderPoint || 1)) - (b.quantity / (b.reorderPoint || 1)))
      .slice(0, 10),
    [products]
  );

  // Warehouse utilization
  const warehouseData = useMemo(() =>
    warehouses.map((w) => ({
      name: w.name,
      used: w.totalQuantity || 0,
      capacity: w.capacity || 1000,
      pct: w.utilizationPct || 0,
      value: w.totalValue || 0,
    })),
    [warehouses]
  );

  // Stock movement summary
  const movementByType = useMemo(() => {
    const grouped: Record<string, { in: number; out: number }> = {};
    stockEvents.forEach((e) => {
      const key = e.type;
      if (!grouped[key]) grouped[key] = { in: 0, out: 0 };
      if (e.quantityChange > 0) grouped[key].in += e.quantityChange;
      else grouped[key].out += Math.abs(e.quantityChange);
    });
    return Object.entries(grouped).map(([name, data]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      in: data.in,
      out: data.out,
    }));
  }, [stockEvents]);

  const totalCost = products.reduce((s, p) => s + p.quantity * p.unitCost, 0);
  const totalRevenue = products.reduce((s, p) => s + p.quantity * p.sellingPrice, 0);
  const grossProfit = totalRevenue - totalCost;
  const avgMargin = products.length > 0
    ? products.reduce((s, p) => s + ((p.sellingPrice - p.unitCost) / (p.sellingPrice || 1)) * 100, 0) / products.length
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="font-mono text-2xl font-bold text-primary">Reports & Analytics</h1>
        <p className="text-xs text-muted-foreground mt-1">Comprehensive inventory insights and performance metrics</p>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Cost Basis", value: `$${totalCost.toLocaleString()}`, icon: DollarSign, color: "text-muted-foreground" },
          { label: "Revenue Potential", value: `$${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-success" },
          { label: "Gross Profit", value: `$${grossProfit.toLocaleString()}`, icon: DollarSign, color: "text-primary" },
          { label: "Avg Margin", value: `${avgMargin.toFixed(1)}%`, icon: BarChart3, color: avgMargin >= 30 ? "text-success" : "text-warning" },
        ].map((s) => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary">
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                <p className={`font-mono text-lg font-bold ${s.color}`}>{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Profitability by Category */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Profitability by Category</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryMargins}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,20%)" />
                <XAxis dataKey="name" stroke="hsl(220,10%,55%)" fontSize={10} />
                <YAxis stroke="hsl(220,10%,55%)" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(220,18%,13%)", border: "1px solid hsl(220,14%,20%)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => `$${v.toLocaleString()}`}
                />
                <Bar dataKey="cost" stackId="a" fill="hsl(0, 50%, 50%)" name="Cost" />
                <Bar dataKey="profit" stackId="a" fill="hsl(142, 71%, 45%)" name="Profit" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Inventory Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value">
                  {statusDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(220,18%,13%)", border: "1px solid hsl(220,14%,20%)", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Stock Movements */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Stock Movements by Type</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={movementByType}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,20%)" />
                <XAxis dataKey="name" stroke="hsl(220,10%,55%)" fontSize={10} />
                <YAxis stroke="hsl(220,10%,55%)" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(220,18%,13%)", border: "1px solid hsl(220,14%,20%)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="in" fill="hsl(142, 71%, 45%)" name="Stock In" radius={[4, 4, 0, 0]} />
                <Bar dataKey="out" fill="hsl(0, 72%, 51%)" name="Stock Out" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Warehouse Utilization */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Warehouse Utilization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {warehouseData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No warehouses configured.</p>
            ) : (
              warehouseData.map((w) => (
                <div key={w.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{w.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {w.used.toLocaleString()} / {w.capacity.toLocaleString()} ({w.pct}%)
                    </span>
                  </div>
                  <Progress
                    value={w.pct}
                    className={`h-2 ${w.pct > 90 ? "[&>div]:bg-danger" : w.pct > 70 ? "[&>div]:bg-warning" : ""}`}
                  />
                  <p className="text-[10px] text-muted-foreground">Value: ${w.value.toLocaleString()}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Supplier Performance */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" /> Supplier Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs text-muted-foreground">Supplier</th>
                    <th className="px-3 py-2 text-left text-xs text-muted-foreground">Products</th>
                    <th className="px-3 py-2 text-left text-xs text-muted-foreground">Value</th>
                    <th className="px-3 py-2 text-left text-xs text-muted-foreground">Rating</th>
                    <th className="px-3 py-2 text-left text-xs text-muted-foreground">Lead</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierPerf.map((s) => (
                    <tr key={s.name} className="border-t border-border">
                      <td className="px-3 py-2 font-medium">{s.name}</td>
                      <td className="px-3 py-2 font-mono">{s.products}</td>
                      <td className="px-3 py-2 font-mono">${s.value.toLocaleString()}</td>
                      <td className="px-3 py-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${s.rating >= 4 ? "text-success border-success/30" : s.rating >= 3 ? "text-warning border-warning/30" : "text-danger border-danger/30"}`}
                        >
                          {s.rating}/5
                        </Badge>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{s.leadTime}d</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Reorder Needed */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" /> Products Needing Reorder
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-auto">
            {reorderNeeded.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">All products well-stocked!</p>
            ) : (
              reorderNeeded.map((p) => {
                const fillPct = Math.max(0, Math.min(100, (p.quantity / (p.reorderPoint || 1)) * 100));
                return (
                  <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${p.status === "out" ? "bg-danger animate-pulse" : "bg-warning"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate font-medium">{p.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={fillPct} className="h-1 flex-1" />
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                          {p.quantity}/{p.reorderPoint}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] shrink-0 ${p.status === "out" ? "border-danger/30 text-danger" : "border-warning/30 text-warning"}`}
                    >
                      {p.status === "out" ? "OUT" : "LOW"}
                    </Badge>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Margin Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Category Margin Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs text-muted-foreground">Category</th>
                  <th className="px-3 py-2 text-left text-xs text-muted-foreground">Products</th>
                  <th className="px-3 py-2 text-left text-xs text-muted-foreground">Cost Basis</th>
                  <th className="px-3 py-2 text-left text-xs text-muted-foreground">Revenue Potential</th>
                  <th className="px-3 py-2 text-left text-xs text-muted-foreground">Gross Profit</th>
                  <th className="px-3 py-2 text-left text-xs text-muted-foreground">Avg Margin</th>
                </tr>
              </thead>
              <tbody>
                {categoryMargins.map((c) => (
                  <tr key={c.name} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{c.name}</td>
                    <td className="px-3 py-2 font-mono">{c.products}</td>
                    <td className="px-3 py-2 font-mono">${c.cost.toLocaleString()}</td>
                    <td className="px-3 py-2 font-mono">${c.revenue.toLocaleString()}</td>
                    <td className="px-3 py-2 font-mono text-success">${c.profit.toLocaleString()}</td>
                    <td className="px-3 py-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono ${c.margin >= 40 ? "text-success border-success/30" : c.margin >= 20 ? "text-warning border-warning/30" : "text-danger border-danger/30"}`}
                      >
                        {c.margin}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
