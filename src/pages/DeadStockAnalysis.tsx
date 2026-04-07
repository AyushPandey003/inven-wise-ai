import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, TrendingDown, Zap } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

interface DeadStockItem {
  productId: string;
  sku: string;
  name: string;
  daysSinceLastMovement: number;
  currentStock: number;
  estimatedValue: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  obsolescenceScore: string;
}

interface DeadStockAnalysisData {
  totalProductsAnalyzed: number;
  deadStockItems: number;
  totalDeadStockValue: string;
  byRiskLevel: Record<string, number>;
  results: DeadStockItem[];
}

export default function DeadStockAnalysis() {
  const [data, setData] = useState<DeadStockAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [daysThreshold, setDaysThreshold] = useState(180);

  const getRiskColor = (level: string) => {
    switch (level) {
      case "critical":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-green-100 text-green-800";
    }
  };

  const analyzeDeadStock = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/analytics/dead-stock-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daysThreshold, minValueThreshold: 0 }),
      });
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to analyze dead stock:", error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = data
    ? [
        { name: "Critical", value: data.byRiskLevel.critical || 0 },
        { name: "High", value: data.byRiskLevel.high || 0 },
        { name: "Medium", value: data.byRiskLevel.medium || 0 },
        { name: "Low", value: data.byRiskLevel.low || 0 },
      ]
    : [];

  const COLORS = ["#dc2626", "#f97316", "#eab308", "#22c55e"];

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dead Stock Analysis</h1>
        <p className="text-muted-foreground mt-2">
          Identify slow-moving and obsolete inventory that ties up capital
        </p>
      </div>

      {/* Alert */}
      <Alert className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertTitle>Real Problem</AlertTitle>
        <AlertDescription>
          20-30% of typical warehouse inventory is slow-moving or dead stock, tying up 5-15% of working capital.
          This analysis helps identify items for liquidation or discontinuation.
        </AlertDescription>
      </Alert>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div>
              <label className="text-sm font-medium">Days Without Movement</label>
              <input
                type="number"
                value={daysThreshold}
                onChange={(e) => setDaysThreshold(parseInt(e.target.value))}
                className="mt-2 px-3 py-2 border rounded-md w-32"
                min="30"
                max="1095"
              />
            </div>
            <Button onClick={analyzeDeadStock} disabled={loading}>
              {loading ? "Analyzing..." : "Run Analysis"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.totalProductsAnalyzed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Dead Stock Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{data.deadStockItems}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {((data.deadStockItems / data.totalProductsAnalyzed) * 100).toFixed(1)}% of inventory
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Value at Risk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                ${parseFloat(data.totalDeadStockValue).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Locked inventory value</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Critical Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700">
                {data.byRiskLevel.critical}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Immediate action needed</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Risk Level Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top 5 Highest Obsolescence Scores</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.results.slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sku" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="obsolescenceScore" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results Table */}
      {data && data.results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Dead Stock Items ({data.results.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Days Inactive</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Obsolescence</TableHead>
                    <TableHead>Risk Level</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.results.slice(0, 20).map((item) => (
                    <TableRow key={item.productId}>
                      <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                      <TableCell className="max-w-xs truncate">{item.name}</TableCell>
                      <TableCell>{item.daysSinceLastMovement} days</TableCell>
                      <TableCell>{item.currentStock} units</TableCell>
                      <TableCell>${parseFloat(item.estimatedValue).toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="text-sm font-semibold">
                          {parseFloat(item.obsolescenceScore).toFixed(1)}/100
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRiskColor(item.riskLevel)}>
                          {item.riskLevel.toUpperCase()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {data.results.length > 20 && (
              <p className="text-sm text-muted-foreground mt-4">
                Showing 20 of {data.results.length} items
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {data && data.deadStockItems > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">Recommended Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-blue-900">
            <div className="flex gap-3">
              <Zap className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Critical Items ({data.byRiskLevel.critical})</p>
                <p className="text-sm">Liquidate immediately or discontinue</p>
              </div>
            </div>
            <div className="flex gap-3">
              <TrendingDown className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Reduce Reorder Points</p>
                <p className="text-sm">Set reorder points to zero for items with 365+ days inactivity</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
