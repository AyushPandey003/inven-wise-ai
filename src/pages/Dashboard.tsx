import { useInventory } from "@/context/InventoryContext";
import { Package, AlertTriangle, DollarSign, ShoppingCart, TrendingUp, ArrowDown, ArrowUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { formatDistanceToNow } from "date-fns";

const CHART_COLORS = [
  "hsl(38, 92%, 50%)",   // amber
  "hsl(142, 71%, 45%)",  // green
  "hsl(200, 80%, 50%)",  // blue
  "hsl(280, 60%, 55%)",  // purple
  "hsl(0, 72%, 51%)",    // red
];

export default function Dashboard() {
  const { products, alerts, orders, activities } = useInventory();

  const totalSKUs = products.length;
  const lowStockCount = alerts.filter((a) => !a.dismissed && (a.type === "low-stock" || a.type === "out-of-stock")).length;
  const totalValue = products.reduce((s, p) => s + p.quantity * p.unitCost, 0);
  const pendingOrders = orders.filter((o) => o.status !== "received").length;

  // Category breakdown
  const categoryData = Object.entries(
    products.reduce<Record<string, number>>((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + p.quantity * p.unitCost;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value: Math.round(value) }));

  // Top items by value
  const topItems = [...products]
    .sort((a, b) => b.quantity * b.unitCost - a.quantity * a.unitCost)
    .slice(0, 6)
    .map((p) => ({ name: p.name.slice(0, 20), value: Math.round(p.quantity * p.unitCost) }));

  // Simulated stock over time
  const stockTimeline = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      date: d.toLocaleDateString("en", { weekday: "short" }),
      total: Math.round(products.reduce((s, p) => s + p.quantity, 0) * (0.85 + Math.random() * 0.3)),
    };
  });

  const activityIcon = (type: string) => {
    switch (type) {
      case "restock": return <ArrowUp className="h-3 w-3 text-success" />;
      case "sale": return <ArrowDown className="h-3 w-3 text-primary" />;
      case "alert": return <AlertTriangle className="h-3 w-3 text-danger" />;
      default: return <ShoppingCart className="h-3 w-3 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="font-mono text-2xl font-bold text-primary">Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total SKUs", value: totalSKUs, icon: Package, change: "+2 this week" },
          { label: "Low Stock Alerts", value: lowStockCount, icon: AlertTriangle, change: "Needs attention", danger: true },
          { label: "Inventory Value", value: `$${totalValue.toLocaleString("en", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, icon: DollarSign, change: "Across all items" },
          { label: "Orders Pending", value: pendingOrders, icon: ShoppingCart, change: `${orders.length} total orders` },
        ].map((card) => (
          <Card key={card.label} className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.danger ? "text-danger" : "text-primary"}`} />
            </CardHeader>
            <CardContent>
              <div className="font-mono text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-sm font-medium">Stock Levels (7 Days)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stockTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,20%)" />
                <XAxis dataKey="date" stroke="hsl(220,10%,55%)" fontSize={12} />
                <YAxis stroke="hsl(220,10%,55%)" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(220,18%,13%)", border: "1px solid hsl(220,14%,20%)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="total" stroke="hsl(38,92%,50%)" strokeWidth={2} dot={{ fill: "hsl(38,92%,50%)" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-sm font-medium">Value by Category</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name.slice(0, 8)} ${(percent * 100).toFixed(0)}%`}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(220,18%,13%)", border: "1px solid hsl(220,14%,20%)", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-sm font-medium">Top Items by Value</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topItems} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,20%)" />
                <XAxis type="number" stroke="hsl(220,10%,55%)" fontSize={12} />
                <YAxis dataKey="name" type="category" width={100} stroke="hsl(220,10%,55%)" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(220,18%,13%)", border: "1px solid hsl(220,14%,20%)", borderRadius: 8 }} />
                <Bar dataKey="value" fill="hsl(38,92%,50%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-sm font-medium">Recent Activity</CardTitle></CardHeader>
          <CardContent className="max-h-64 overflow-auto space-y-3">
            {activities.slice(0, 10).map((a) => (
              <div key={a.id} className="flex items-start gap-3 text-sm">
                <div className="mt-1">{activityIcon(a.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="truncate">{a.message}</p>
                  <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(a.timestamp), { addSuffix: true })}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
