import { useState } from "react";
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
import { AlertTriangle, TrendingUp, DollarSign } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

interface AgingItem {
  productId: string;
  sku: string;
  name: string;
  ageInDays: number;
  ageCategory: string;
  quantity: number;
  totalValue: string;
  holdingCostAccrued: string;
}

interface InventoryAgingData {
  summary: {
    totalProducts: number;
    averageAge: string;
    totalHoldingCosts: string;
  };
  ageDistribution: {
    [key: string]: {
      count: number;
      value: string;
    };
  };
  results: AgingItem[];
}

export default function InventoryAgingAnalysis() {
  const [data, setData] = useState<InventoryAgingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [holdingCostPercentage, setHoldingCostPercentage] = useState(25);

  const analyzeAging = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/analytics/inventory-aging-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holdingCostPercentage }),
      });
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to analyze aging:", error);
    } finally {
      setLoading(false);
    }
  };

  const ageDistributionChart = data
    ? [
        { name: "0-30 days", count: data.ageDistribution["0-30"].count, value: data.ageDistribution["0-30"].value },
        { name: "31-60 days", count: data.ageDistribution["31-60"].count, value: data.ageDistribution["31-60"].value },
        { name: "61-90 days", count: data.ageDistribution["61-90"].count, value: data.ageDistribution["61-90"].value },
        { name: "91-180 days", count: data.ageDistribution["91-180"].count, value: data.ageDistribution["91-180"].value },
        { name: "181-365 days", count: data.ageDistribution["181-365"].count, value: data.ageDistribution["181-365"].value },
        { name: "365+ days", count: data.ageDistribution["365+"].count, value: data.ageDistribution["365+"].value },
      ]
    : [];

  const valueDistributionChart = data
    ? [
        {
          name: "0-30",
          value: parseFloat(data.ageDistribution["0-30"].value),
          count: data.ageDistribution["0-30"].count,
        },
        {
          name: "31-60",
          value: parseFloat(data.ageDistribution["31-60"].value),
          count: data.ageDistribution["31-60"].count,
        },
        {
          name: "61-90",
          value: parseFloat(data.ageDistribution["61-90"].value),
          count: data.ageDistribution["61-90"].count,
        },
        {
          name: "91-180",
          value: parseFloat(data.ageDistribution["91-180"].value),
          count: data.ageDistribution["91-180"].count,
        },
        {
          name: "181-365",
          value: parseFloat(data.ageDistribution["181-365"].value),
          count: data.ageDistribution["181-365"].count,
        },
        {
          name: "365+",
          value: parseFloat(data.ageDistribution["365+"].value),
          count: data.ageDistribution["365+"].count,
        },
      ]
    : [];

  const COLORS = ["#22c55e", "#84cc16", "#eab308", "#f97316", "#ef4444", "#991b1b"];

  const topAgingItems = data?.results.slice(0, 5) || [];

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventory Aging Analysis</h1>
        <p className="text-muted-foreground mt-2">
          Visualize inventory age distribution and calculate carrying costs
        </p>
      </div>

      {/* Alert */}
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertTitle>Real Problem</AlertTitle>
        <AlertDescription>
          Inventory older than 6 months costs 2-4x more to store and has 60% higher risk of obsolescence.
          Carrying costs for aged inventory typically represent 5-15% of inventory value annually.
        </AlertDescription>
      </Alert>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div>
              <label className="text-sm font-medium">Annual Holding Cost %</label>
              <input
                type="number"
                value={holdingCostPercentage}
                onChange={(e) => setHoldingCostPercentage(Number(e.target.value))}
                className="mt-2 px-3 py-2 border rounded-md w-40"
                min="10"
                max="50"
              />
              <p className="text-xs text-muted-foreground mt-1">Typical: 20-30%</p>
            </div>
            <Button onClick={analyzeAging} disabled={loading}>
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
              <div className="text-2xl font-bold">{data.summary.totalProducts}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Average Age
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{parseFloat(data.summary.averageAge).toFixed(0)} days</div>
              <p className="text-xs text-muted-foreground mt-1">
                {(parseFloat(data.summary.averageAge) / 365).toFixed(1)} years
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Very Old (365+)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {data.ageDistribution["365+"].count}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                ${parseFloat(data.ageDistribution["365+"].value).toFixed(0)} value
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Carrying Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                ${parseFloat(data.summary.totalHoldingCosts).toFixed(0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Accrued carrying costs</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Items by Age Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ageDistributionChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Value Distribution by Age</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={valueDistributionChart}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: $${(value / 1000).toFixed(0)}k`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {valueDistributionChart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${(value as number).toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Oldest Items */}
      {topAgingItems.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-900">5 Oldest Items in Inventory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topAgingItems.map((item) => (
              <div key={item.productId} className="flex justify-between items-start p-3 bg-white rounded border">
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                </div>
                <div className="text-right">
                  <Badge className="mb-2 bg-red-100 text-red-800">{item.ageInDays} days</Badge>
                  <p className="text-sm font-semibold">${parseFloat(item.totalValue).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">
                    Carrying: ${parseFloat(item.holdingCostAccrued).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Details Table */}
      {data && data.results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Inventory by Age ({data.results.length} items)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Age (Days)</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Carrying Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.results.slice(0, 40).map((item) => {
                    let categoryColor = "bg-green-100 text-green-800";
                    if (item.ageCategory === "181-365") categoryColor = "bg-orange-100 text-orange-800";
                    if (item.ageCategory === "365+") categoryColor = "bg-red-100 text-red-800";
                    if (item.ageCategory === "91-180") categoryColor = "bg-yellow-100 text-yellow-800";
                    if (item.ageCategory === "61-90") categoryColor = "bg-blue-100 text-blue-800";

                    return (
                      <TableRow key={item.productId}>
                        <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                        <TableCell className="max-w-xs truncate">{item.name}</TableCell>
                        <TableCell>{item.ageInDays} days</TableCell>
                        <TableCell>
                          <Badge className={categoryColor}>{item.ageCategory}</Badge>
                        </TableCell>
                        <TableCell>{item.quantity} units</TableCell>
                        <TableCell>${parseFloat(item.totalValue).toFixed(2)}</TableCell>
                        <TableCell className="font-semibold">
                          ${parseFloat(item.holdingCostAccrued).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {data && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">Cost Reduction Opportunities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-blue-900">
            <div className="flex gap-3">
              <DollarSign className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-semibold">
                  Clear 365+ year old inventory: {data.ageDistribution["365+"].count} items
                </p>
                <p className="text-sm">
                  Potential savings: ${(parseFloat(data.ageDistribution["365+"].value) * 0.3).toFixed(0)} in reduced
                  carrying costs
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <TrendingUp className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Implement FIFO discipline</p>
                <p className="text-sm">Move older inventory first to prevent further aging</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
