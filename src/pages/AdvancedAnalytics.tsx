import { useState, useMemo } from "react";
import { useInventory, Warehouse } from "@/context/InventoryContext";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  Zap,
  TrendingUp,
  Package,
  MapPin,
  BarChart3,
  Lightbulb,
} from "lucide-react";
import WarehouseMap from "@/components/warehouse/WarehouseMap";
import { toast } from "sonner";

const COLORS = ["hsl(38, 92%, 50%)", "hsl(142, 71%, 45%)", "hsl(200, 80%, 50%)"];

interface WarehouseLocation extends Warehouse {
  totalQuantity?: number;
  totalValue?: number;
}

export default function AdvancedAnalytics() {
  const { products, warehouses } = useInventory();
  const [selectedMetric, setSelectedMetric] = useState<"abc" | "turnover" | "forecast">("abc");

  // ABC Analysis
  const abcAnalysis = useMemo(() => {
    const totalValue = products.reduce((sum, p) => sum + p.quantity * Number(p.unitCost), 0);
    let cumulativeValue = 0;
    const sorted = [...products].sort((a, b) => b.quantity * Number(b.unitCost) - a.quantity * Number(a.unitCost));

    return sorted.map((p) => {
      cumulativeValue += p.quantity * Number(p.unitCost);
      const percentage = (cumulativeValue / totalValue) * 100;
      let classification = "C";
      if (percentage <= 80) classification = "A";
      else if (percentage <= 95) classification = "B";

      return {
        sku: p.sku,
        name: p.name.slice(0, 20),
        value: Math.round(p.quantity * Number(p.unitCost)),
        quantity: p.quantity,
        classification,
        percentage: Math.round(percentage),
      };
    });
  }, [products]);

  // ABC Distribution
  const abcDistribution = useMemo(() => {
    const aItems = abcAnalysis.filter((p) => p.classification === "A").length;
    const bItems = abcAnalysis.filter((p) => p.classification === "B").length;
    const cItems = abcAnalysis.filter((p) => p.classification === "C").length;

    return [
      { name: "A Items (80% value)", value: aItems, percentage: Math.round((aItems / products.length) * 100) },
      { name: "B Items (15% value)", value: bItems, percentage: Math.round((bItems / products.length) * 100) },
      { name: "C Items (5% value)", value: cItems, percentage: Math.round((cItems / products.length) * 100) },
    ];
  }, [abcAnalysis, products.length]);

  // Inventory Turnover
  const inventoryTurnover = useMemo(() => {
    return [...products]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)
      .map((p) => ({
        name: p.name.slice(0, 15),
        quantity: p.quantity,
        sku: p.sku,
        reorderPoint: p.reorderPoint,
        turnoverScore: Math.round((p.quantity / (p.reorderPoint || 1)) * 100),
      }));
  }, [products]);

  // Warehouse Analysis
  const warehouseMetrics = useMemo(() => {
    return warehouses
      .filter((w) => w.isActive !== false)
      .map((w) => {
        const warehouseProducts = products.filter((p) => p.warehouseId === w.id);
        const totalStock = warehouseProducts.reduce((sum, p) => sum + p.quantity, 0);
        const totalValue = warehouseProducts.reduce((sum, p) => sum + p.quantity * Number(p.unitCost), 0);
        const utilization = (totalStock / (w.capacity || 1)) * 100;

        return {
          id: w.id,
          name: w.name,
          utilization: Math.round(utilization),
          totalStock,
          totalValue: Math.round(totalValue),
          capacity: w.capacity || 0,
          city: w.city,
          state: w.state,
          productCount: warehouseProducts.length,
        };
      });
  }, [warehouses, products]);

  // Optimization Recommendations
  const recommendations = useMemo(() => {
    const recs = [];

    // Reorder recommendations
    const lowStockItems = products.filter((p) => p.quantity < p.reorderPoint);
    if (lowStockItems.length > 0) {
      recs.push({
        type: "reorder",
        priority: "high",
        title: `${lowStockItems.length} items below reorder point`,
        action: "Initiate purchase orders immediately",
        items: lowStockItems.slice(0, 3),
        estimatedImpact: `$${lowStockItems.reduce((sum, p) => sum + Number(p.unitCost) * (p.reorderPoint - p.quantity), 0).toLocaleString()}`,
      });
    }

    // Overstock recommendations
    const overstockItems = products.filter((p) => p.quantity > p.reorderPoint * 5);
    if (overstockItems.length > 0) {
      recs.push({
        type: "reduce",
        priority: "medium",
        title: `${overstockItems.length} items overstocked`,
        action: "Reduce inventory levels to improve cash flow",
        items: overstockItems.slice(0, 3),
        estimatedImpact: `Free up $${overstockItems.reduce((sum, p) => sum + Number(p.unitCost) * (p.quantity - p.reorderPoint * 3), 0).toLocaleString()}`,
      });
    }

    // Transfer recommendations
    const unbalancedWarehouses = warehouseMetrics.filter((w) => w.utilization > 85);
    if (unbalancedWarehouses.length > 0 && warehouseMetrics.length > 1) {
      recs.push({
        type: "transfer",
        priority: "medium",
        title: `${unbalancedWarehouses.length} warehouses over 85% capacity`,
        action: "Redistribute inventory to optimize storage",
        estimatedImpact: "Improve warehouse efficiency",
      });
    }

    return recs;
  }, [products, warehouseMetrics]);

  // Demand forecast mock data
  const demandForecast = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const baseValue = 50 + Math.random() * 30;
      const trend = i * 0.5;
      return {
        date: date.toLocaleDateString("en", { month: "short", day: "numeric" }),
        forecast: Math.round(baseValue + trend),
        actual: i < 15 ? Math.round(baseValue + trend - 5 + Math.random() * 10) : undefined,
      };
    });
  }, []);

  const warehouseMapData = useMemo(() => {
    return warehouses
      .filter((w) => w.latitude && w.longitude && w.isActive !== false)
      .map((w) => {
        const warehouseProducts = products.filter((p) => p.warehouseId === w.id);
        const totalStock = warehouseProducts.reduce((sum, p) => sum + p.quantity, 0);
        return {
          id: w.id,
          name: w.name,
          latitude: Number(w.latitude || 0),
          longitude: Number(w.longitude || 0),
          currentStock: totalStock,
          capacity: w.capacity || 1000,
          managerName: w.managerName || "",
          phone: w.phone || "",
          city: w.city || "",
          state: w.state || "",
        };
      });
  }, [warehouses, products]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="font-mono text-3xl font-bold text-primary">Advanced Inventory Analytics</h1>
        <p className="text-sm text-muted-foreground mt-2">
          AI-powered insights for optimal inventory management
        </p>
      </div>

      {/* Key Recommendations */}
      {recommendations.length > 0 && (
        <div className="grid gap-3">
          {recommendations.map((rec, idx) => (
            <Alert key={idx} className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
              <Lightbulb className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-sm">
                <strong>{rec.title}</strong> — {rec.action}
                {rec.estimatedImpact && <span className="text-xs ml-2 text-yellow-700">({rec.estimatedImpact})</span>}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Warehouse Network Map */}
      {warehouseMapData.length > 0 && <WarehouseMap warehouses={warehouseMapData} height="h-96" />}

      {/* Metrics Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: "abc", label: "ABC Analysis", icon: BarChart3 },
          { id: "turnover", label: "Inventory Turnover", icon: TrendingUp },
          { id: "forecast", label: "Demand Forecast", icon: Zap },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={selectedMetric === tab.id ? "default" : "outline"}
            onClick={() => setSelectedMetric(tab.id as any)}
            className="gap-2"
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* ABC Analysis View */}
      {selectedMetric === "abc" && (
        <div className="grid gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ABC Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">ABC Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={abcDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2 text-xs">
                  {abcDistribution.map((item, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{item.name}</span>
                      <Badge>{item.percentage}%</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top A Items */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm">Top A Items (High Priority)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {abcAnalysis
                    .filter((p) => p.classification === "A")
                    .slice(0, 8)
                    .map((item) => (
                      <div key={item.sku} className="flex items-center justify-between p-2 bg-secondary rounded text-xs">
                        <div>
                          <p className="font-semibold">{item.name}</p>
                          <p className="text-muted-foreground">{item.sku}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">${item.value.toLocaleString()}</p>
                          <p className="text-muted-foreground">{item.quantity} units</p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Inventory Turnover View */}
      {selectedMetric === "turnover" && (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Top 10 Items by Turnover</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={inventoryTurnover}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="turnoverScore" fill="#3b82f6" name="Turnover Score" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Warehouse Utilization */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Warehouse Utilization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {warehouseMetrics.map((w) => (
                <div key={w.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-semibold">{w.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {w.totalStock} / {w.capacity} units
                      </p>
                    </div>
                    <Badge variant={w.utilization > 85 ? "destructive" : "secondary"}>
                      {w.utilization}%
                    </Badge>
                  </div>
                  <Progress value={Math.min(w.utilization, 100)} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Demand Forecast View */}
      {selectedMetric === "forecast" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">30-Day Demand Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={demandForecast}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Forecast"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Actual"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Total SKUs",
            value: products.length,
            icon: Package,
          },
          {
            label: "A Items",
            value: abcDistribution[0].value,
            icon: AlertTriangle,
          },
          {
            label: "Warehouses",
            value: warehouseMetrics.length,
            icon: MapPin,
          },
          {
            label: "Low Stock",
            value: products.filter((p) => p.quantity < p.reorderPoint).length,
            icon: Zap,
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary">
                  <stat.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
