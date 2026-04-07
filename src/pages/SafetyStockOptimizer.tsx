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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { AlertTriangle, TrendingDown, ShoppingCart } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

interface SafetyStockRecommendation {
  productId: string;
  sku: string;
  name: string;
  demandMean: string;
  demandStdDev: string;
  safetyStock: string;
  reorderPoint: string;
  eoq: string;
  currentStock: number;
  needsReorder: boolean;
}

interface SafetyStockData {
  parameters: {
    serviceLevel: number;
    zScore: number;
    holdingCostPercentage: number;
    orderingCost: number;
  };
  summary: {
    productsAnalyzed: number;
    productsNeedingReorder: number;
  };
  results: SafetyStockRecommendation[];
}

export default function SafetyStockOptimizer() {
  const [data, setData] = useState<SafetyStockData | null>(null);
  const [loading, setLoading] = useState(false);
  const [serviceLevel, setServiceLevel] = useState(95);
  const [holdingCost, setHoldingCost] = useState(25);
  const [orderingCost, setOrderingCost] = useState(50);

  const calculateSafetyStock = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/analytics/safety-stock-calculator`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceLevel, holdingCostPercentage: holdingCost, orderingCost }),
      });
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to calculate safety stock:", error);
    } finally {
      setLoading(false);
    }
  };

  const reorderData = data?.results.filter((x) => x.needsReorder).slice(0, 10) || [];

  const reorderChart = reorderData.map((item) => ({
    sku: item.sku,
    current: item.currentStock,
    reorderPoint: parseInt(item.reorderPoint),
  }));

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Safety Stock Optimizer</h1>
        <p className="text-muted-foreground mt-2">
          Calculate optimal inventory levels to balance stockout prevention vs holding costs
        </p>
      </div>

      {/* Alert */}
      <Alert className="border-green-200 bg-green-50">
        <AlertTriangle className="h-4 w-4 text-green-600" />
        <AlertTitle>Real Problem</AlertTitle>
        <AlertDescription>
          Finding the optimal safety stock level is a balancing act: too much ties up capital (costs increase 2% per 10% increase),
          too little causes stockouts (costs increase 5% per 1% stockout rate increase). The optimal point typically reduces costs by 15-25%.
        </AlertDescription>
      </Alert>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Calculation Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium">Service Level</label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="range"
                  min="90"
                  max="99"
                  step="1"
                  value={serviceLevel}
                  onChange={(e) => setServiceLevel(parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-lg font-semibold">{serviceLevel}%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Target service level</p>
            </div>
            <div>
              <label className="text-sm font-medium">Annual Holding Cost %</label>
              <input
                type="number"
                value={holdingCost}
                onChange={(e) => setHoldingCost(Number(e.target.value))}
                className="mt-2 px-3 py-2 border rounded-md w-full"
                min="5"
                max="50"
              />
              <p className="text-xs text-muted-foreground mt-1">20-30% typical</p>
            </div>
            <div>
              <label className="text-sm font-medium">Ordering Cost per Order</label>
              <input
                type="number"
                value={orderingCost}
                onChange={(e) => setOrderingCost(Number(e.target.value))}
                className="mt-2 px-3 py-2 border rounded-md w-full"
                min="10"
                max="200"
              />
              <p className="text-xs text-muted-foreground mt-1">Setup/processing cost</p>
            </div>
            <div className="flex items-end">
              <Button onClick={calculateSafetyStock} disabled={loading} className="w-full">
                {loading ? "Calculating..." : "Calculate"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Products Analyzed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.productsAnalyzed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Needs Reorder Now
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {data.summary.productsNeedingReorder}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {((data.summary.productsNeedingReorder / data.summary.productsAnalyzed) * 100).toFixed(1)}% of
                inventory
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Service Level Target
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{data.parameters.serviceLevel}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chart - Products Needing Reorder */}
      {reorderChart.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Products Needing Reorder</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reorderChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="sku" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="current" fill="#f97316" name="Current Stock" />
                <Bar dataKey="reorderPoint" fill="#dc2626" name="Reorder Point" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Results Table */}
      {data && data.results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Safety Stock Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Demand Mean</TableHead>
                    <TableHead>Safety Stock</TableHead>
                    <TableHead>Reorder Point</TableHead>
                    <TableHead>EOQ</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.results.slice(0, 30).map((item) => (
                    <TableRow key={item.productId}>
                      <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                      <TableCell className="max-w-xs truncate">{item.name}</TableCell>
                      <TableCell>{parseFloat(item.demandMean).toFixed(1)} units</TableCell>
                      <TableCell className="font-semibold">
                        {parseFloat(item.safetyStock).toFixed(1)} units
                      </TableCell>
                      <TableCell className="font-semibold">{item.reorderPoint} units</TableCell>
                      <TableCell>{item.eoq} units</TableCell>
                      <TableCell>{item.currentStock} units</TableCell>
                      <TableCell>
                        {item.needsReorder ? (
                          <Badge className="bg-red-100 text-red-800">REORDER</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800">OK</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Explanation */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">Key Metrics Explained</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-blue-900">
          <div className="flex gap-3">
            <ShoppingCart className="h-5 w-5 flex-shrink-0 mt-1" />
            <div>
              <p className="font-semibold">Demand Mean</p>
              <p className="text-sm">Average demand per period from historical sales data</p>
            </div>
          </div>
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-1" />
            <div>
              <p className="font-semibold">Safety Stock</p>
              <p className="text-sm">Extra inventory to guard against demand/supply uncertainty: SS = Z-score × σd × √LT</p>
            </div>
          </div>
          <div className="flex gap-3">
            <TrendingDown className="h-5 w-5 flex-shrink-0 mt-1" />
            <div>
              <p className="font-semibold">Reorder Point</p>
              <p className="text-sm">Trigger to place new order: ROP = (Avg Demand × Lead Time) + Safety Stock</p>
            </div>
          </div>
          <div className="flex gap-3">
            <ShoppingCart className="h-5 w-5 flex-shrink-0 mt-1" />
            <div>
              <p className="font-semibold">Economic Order Quantity (EOQ)</p>
              <p className="text-sm">Order quantity that minimizes total cost: EOQ = √(2DS/H)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
