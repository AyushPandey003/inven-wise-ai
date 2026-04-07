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
  ScatterChart,
  Scatter,
} from "recharts";
import { AlertTriangle, TrendingUp } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

interface SupplierMetric {
  supplierId: string;
  supplierName: string;
  totalOrders: number;
  onTimeDeliveries: number;
  onTimePercentage: string;
  averageDeliveryDays: string;
  qualityScore: string;
  averageOrderValue: string;
  reliabilityIndex: string;
  rating: number;
}

interface SupplierPerformanceData {
  totalSuppliersAnalyzed: number;
  activeSuppliersWithOrders: number;
  results: SupplierMetric[];
}

export default function SupplierPerformance() {
  const [data, setData] = useState<SupplierPerformanceData | null>(null);
  const [loading, setLoading] = useState(false);

  const getReliabilityColor = (score: number) => {
    if (score >= 85) return "bg-green-100 text-green-800";
    if (score >= 70) return "bg-blue-100 text-blue-800";
    if (score >= 50) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const analyzeSuppliers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/analytics/supplier-performance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to analyze suppliers:", error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = data?.results.slice(0, 10).map((s) => ({
    name: s.supplierName,
    onTime: parseFloat(s.onTimePercentage),
    quality: parseFloat(s.qualityScore),
    reliability: parseFloat(s.reliabilityIndex) * 100,
  })) || [];

  const summaryStats = data
    ? {
        avgOnTimePercentage:
          data.results.reduce((sum, s) => sum + parseFloat(s.onTimePercentage), 0) / data.results.length,
        avgQualityScore:
          data.results.reduce((sum, s) => sum + parseFloat(s.qualityScore), 0) / data.results.length,
        avgReliabilityIndex:
          (data.results.reduce((sum, s) => sum + parseFloat(s.reliabilityIndex), 0) / data.results.length) * 100,
        totalTotalOrders: data.results.reduce((sum, s) => sum + s.totalOrders, 0),
      }
    : null;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Supplier Performance Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Track supplier metrics: on-time delivery, quality, and reliability
        </p>
      </div>

      {/* Alert */}
      <Alert className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertTitle>Real Problem</AlertTitle>
        <AlertDescription>
          Poor supplier performance causes 25-40% of stockouts and increases operational costs significantly.
          Focus on suppliers with reliability index below 80% for improvement.
        </AlertDescription>
      </Alert>

      {/* Action Button */}
      <Button onClick={analyzeSuppliers} disabled={loading} size="lg">
        {loading ? "Analyzing..." : "Analyze Suppliers"}
      </Button>

      {/* Summary Cards */}
      {summaryStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Suppliers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.activeSuppliersWithOrders}</div>
              <p className="text-xs text-muted-foreground mt-1">With order history</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg On-Time %
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {summaryStats.avgOnTimePercentage.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Quality Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {summaryStats.avgQualityScore.toFixed(1)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Reliability
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {summaryStats.avgReliabilityIndex.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Suppliers - Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="onTime" fill="#22c55e" name="On-Time %" />
                  <Bar dataKey="quality" fill="#3b82f6" name="Quality Score" />
                  <Bar dataKey="reliability" fill="#a855f7" name="Reliability %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reliability Index vs Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="totalOrders" name="Total Orders" />
                  <YAxis dataKey="reliabilityIndex" name="Reliability %"/>
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                  <Scatter
                    data={data.results.map((s) => ({
                      totalOrders: s.totalOrders,
                      reliabilityIndex: parseFloat(s.reliabilityIndex) * 100,
                      supplierName: s.supplierName,
                    }))}
                    fill="#8884d8"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Results Table */}
      {data && data.results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Supplier Details ({data.results.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier Name</TableHead>
                    <TableHead>Total Orders</TableHead>
                    <TableHead>On-Time Deliveries</TableHead>
                    <TableHead>On-Time %</TableHead>
                    <TableHead>Avg Delivery Days</TableHead>
                    <TableHead>Quality Score</TableHead>
                    <TableHead>Reliability Index</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.results.map((supplier) => {
                    const reliabilityScore = parseFloat(supplier.reliabilityIndex) * 100;
                    return (
                      <TableRow key={supplier.supplierId}>
                        <TableCell className="font-semibold">{supplier.supplierName}</TableCell>
                        <TableCell>{supplier.totalOrders}</TableCell>
                        <TableCell>{supplier.onTimeDeliveries}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              parseFloat(supplier.onTimePercentage) >= 80
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }
                          >
                            {parseFloat(supplier.onTimePercentage).toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell>{parseFloat(supplier.averageDeliveryDays).toFixed(1)} days</TableCell>
                        <TableCell>
                          <span className="font-semibold">
                            {parseFloat(supplier.qualityScore).toFixed(1)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={getReliabilityColor(reliabilityScore)}>
                            {reliabilityScore.toFixed(1)}%
                          </Badge>
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
            <CardTitle className="text-blue-900">Strategic Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-blue-900">
            <div className="flex gap-3">
              <TrendingUp className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Top Performers (≥85% reliability)</p>
                <p className="text-sm">
                  {data.results.filter((s) => parseFloat(s.reliabilityIndex) >= 0.85).length} suppliers -
                  Increase order volumes and negotiate favorable terms
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-semibold">At-Risk Suppliers (&lt;70% reliability)</p>
                <p className="text-sm">
                  {data.results.filter((s) => parseFloat(s.reliabilityIndex) < 0.7).length} suppliers -
                  Implement improvement plans or develop backup suppliers
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
