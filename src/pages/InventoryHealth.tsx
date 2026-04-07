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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { AlertTriangle, TrendingUp } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

interface HealthScore {
  productId: string;
  sku: string;
  name: string;
  overallHealthScore: string;
  turnoverScore: string;
  agingScore: string;
  shrinkageScore: string;
  accuracyScore: string;
  healthStatus: "excellent" | "good" | "fair" | "poor" | "critical";
  riskFactors: string;
}

interface HealthScoreData {
  summary: Record<string, number>;
  averageScore: string;
  results: HealthScore[];
}

export default function InventoryHealth() {
  const [data, setData] = useState<HealthScoreData | null>(null);
  const [loading, setLoading] = useState(false);


  const getHealthColor = (status: string) => {
    switch (status) {
      case "excellent":
        return "bg-green-100 text-green-800";
      case "good":
        return "bg-blue-100 text-blue-800";
      case "fair":
        return "bg-yellow-100 text-yellow-800";
      case "poor":
        return "bg-orange-100 text-orange-800";
      case "critical":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const calculateHealthScore = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/analytics/inventory-health-score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to calculate health scores:", error);
    } finally {
      setLoading(false);
    }
  };

  const statusData = data
    ? [
        { name: "Excellent", value: data.summary.excellent || 0 },
        { name: "Good", value: data.summary.good || 0 },
        { name: "Fair", value: data.summary.fair || 0 },
        { name: "Poor", value: data.summary.poor || 0 },
        { name: "Critical", value: data.summary.critical || 0 },
      ]
    : [];

  const topScores = data?.results.slice(0, 10) || [];

  const scoreDistribution = data?.results.reduce(
    (acc, item) => {
      const score = Math.floor(parseFloat(item.overallHealthScore) / 10) * 10;
      acc[score] = (acc[score] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>
  );

  const distributionData = scoreDistribution
    ? Object.entries(scoreDistribution)
        .map(([bins, count]) => ({ range: `${bins}-${parseInt(bins) + 10}`, count }))
        .sort((a, b) => parseInt(a.range) - parseInt(b.range))
    : [];

  const COLORS = ["#22c55e", "#3b82f6", "#eab308", "#f97316", "#dc2626"];

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventory Health Score</h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive inventory quality assessment combining multiple KPIs
        </p>
      </div>

      {/* Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertTriangle className="h-4 w-4 text-blue-600" />
        <AlertTitle>What is a Health Score?</AlertTitle>
        <AlertDescription>
          The overall health score combines turnover efficiency (25%), inventory age (20%), shrinkage rates (15%),
          accuracy (15%), forecast accuracy (15%), and supplier reliability (10%) to provide a single quality metric.
        </AlertDescription>
      </Alert>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data ? parseFloat(data.averageScore).toFixed(1) : "0"}/100
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Excellent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data?.summary.excellent || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Good</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{data?.summary.good || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fair</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{data?.summary.fair || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {(data?.summary.poor || 0) + (data?.summary.critical || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Button */}
      <Button onClick={calculateHealthScore} disabled={loading} size="lg">
        {loading ? "Calculating..." : "Calculate Health Scores"}
      </Button>

      {/* Charts */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Health Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
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
              <CardTitle>Score Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={distributionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Products */}
      {data && (
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topScores.map((item) => (
                <div key={item.productId} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                    </div>
                    <Badge className={getHealthColor(item.healthStatus)}>
                      {item.healthStatus.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Overall Score</p>
                      <p className="text-lg font-bold">{parseFloat(item.overallHealthScore).toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Turnover</p>
                      <p className="text-lg font-bold text-blue-600">
                        {parseFloat(item.turnoverScore).toFixed(0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Aging</p>
                      <p className="text-lg font-bold text-green-600">
                        {parseFloat(item.agingScore).toFixed(0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Shrinkage</p>
                      <p className="text-lg font-bold text-orange-600">
                        {parseFloat(item.shrinkageScore).toFixed(0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Accuracy</p>
                      <p className="text-lg font-bold text-purple-600">
                        {parseFloat(item.accuracyScore).toFixed(0)}
                      </p>
                    </div>
                  </div>

                  {item.riskFactors && (
                    <div>
                      <p className="text-xs font-semibold text-red-600">Risk Factors:</p>
                      <p className="text-sm text-muted-foreground">{item.riskFactors}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Results Table */}
      {data && data.results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Products ({data.results.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Overall Score</TableHead>
                    <TableHead>Turnover</TableHead>
                    <TableHead>Aging</TableHead>
                    <TableHead>Shrinkage</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.results.slice(0, 30).map((item) => (
                    <TableRow key={item.productId}>
                      <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                      <TableCell className="max-w-xs truncate">{item.name}</TableCell>
                      <TableCell>
                        <span className="font-bold">
                          {parseFloat(item.overallHealthScore).toFixed(1)}
                        </span>
                      </TableCell>
                      <TableCell>{parseFloat(item.turnoverScore).toFixed(0)}</TableCell>
                      <TableCell>{parseFloat(item.agingScore).toFixed(0)}</TableCell>
                      <TableCell>{parseFloat(item.shrinkageScore).toFixed(0)}</TableCell>
                      <TableCell>
                        <Badge className={getHealthColor(item.healthStatus)}>
                          {item.healthStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
