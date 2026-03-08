import { useState, useMemo } from "react";
import { useInventory } from "@/context/InventoryContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  AlertTriangle, Zap, Globe, Ship, CloudRain, TrendingDown,
  Play, RotateCcw, Shield, Package, DollarSign, Clock,
  FlaskConical, Boxes, TriangleAlert,
} from "lucide-react";

interface Scenario {
  id: string;
  name: string;
  icon: typeof Ship;
  description: string;
  category: "logistics" | "demand" | "supplier" | "environmental" | "geopolitical";
  params: { label: string; key: string; min: number; max: number; default: number; unit: string }[];
}

const SCENARIOS: Scenario[] = [
  {
    id: "port-delay", name: "Port Delay / Congestion", icon: Ship, category: "logistics",
    description: "Simulate delays at major shipping ports affecting inbound freight from international suppliers",
    params: [
      { label: "Delay Duration", key: "delayDays", min: 1, max: 30, default: 7, unit: "days" },
      { label: "Affected Suppliers %", key: "supplierPct", min: 10, max: 100, default: 40, unit: "%" },
    ],
  },
  {
    id: "demand-surge", name: "Demand Surge", icon: TrendingDown, category: "demand",
    description: "Model a sudden increase in demand across one or more categories (e.g., seasonal spike, viral trend)",
    params: [
      { label: "Demand Multiplier", key: "multiplier", min: 1.5, max: 5, default: 2, unit: "x" },
      { label: "Duration", key: "durationDays", min: 7, max: 90, default: 14, unit: "days" },
    ],
  },
  {
    id: "supplier-failure", name: "Supplier Failure", icon: TriangleAlert, category: "supplier",
    description: "Simulate a key supplier going offline — bankruptcy, factory fire, or regulatory shutdown",
    params: [
      { label: "Recovery Time", key: "recoveryDays", min: 14, max: 180, default: 45, unit: "days" },
    ],
  },
  {
    id: "natural-disaster", name: "Natural Disaster", icon: CloudRain, category: "environmental",
    description: "Simulate warehouse damage from flooding, earthquake, or severe weather event",
    params: [
      { label: "Inventory Loss %", key: "lossPct", min: 5, max: 80, default: 25, unit: "%" },
      { label: "Recovery Time", key: "recoveryDays", min: 7, max: 60, default: 21, unit: "days" },
    ],
  },
  {
    id: "tariff-change", name: "Tariff / Trade War", icon: Globe, category: "geopolitical",
    description: "Model the impact of sudden tariff changes on import costs and product margins",
    params: [
      { label: "Tariff Increase", key: "tariffPct", min: 5, max: 50, default: 15, unit: "%" },
      { label: "Affected Categories", key: "categoriesPct", min: 20, max: 100, default: 60, unit: "%" },
    ],
  },
  {
    id: "currency-crash", name: "Currency Fluctuation", icon: DollarSign, category: "geopolitical",
    description: "Simulate currency exchange rate shifts affecting import purchasing power",
    params: [
      { label: "Currency Shift", key: "shiftPct", min: -30, max: 30, default: -15, unit: "%" },
    ],
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  logistics: "bg-primary/20 text-primary border-primary/30",
  demand: "bg-warning/20 text-warning border-warning/30",
  supplier: "bg-danger/20 text-danger border-danger/30",
  environmental: "bg-success/20 text-success border-success/30",
  geopolitical: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

export default function StressTest() {
  const { products, suppliers, categoriesList } = useInventory();
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [params, setParams] = useState<Record<string, number>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<null | {
    stockouts: { name: string; sku: string; daysToStockout: number; currentQty: number }[];
    financialImpact: number;
    productsAtRisk: number;
    totalStockoutDays: number;
    categoryImpact: { name: string; atRisk: number; value: number }[];
    recommendations: string[];
    riskScore: number;
  }>(null);

  const scenario = SCENARIOS.find((s) => s.id === selectedScenario);

  const selectScenario = (id: string) => {
    const sc = SCENARIOS.find((s) => s.id === id);
    setSelectedScenario(id);
    setResults(null);
    if (sc) {
      const defaultParams: Record<string, number> = {};
      sc.params.forEach((p) => { defaultParams[p.key] = p.default; });
      setParams(defaultParams);
    }
  };

  const runSimulation = () => {
    if (!scenario) return;
    setIsRunning(true);

    setTimeout(() => {
      // Simulate stress test results based on scenario and params
      const severity = Object.values(params).reduce((s, v) => s + Math.abs(v), 0) / Object.values(params).length;

      const stockouts = products
        .map((p) => {
          const dailyDemand = Math.max(1, Math.round(p.reorderPoint / 7));
          const adjustedDemand = scenario.id === "demand-surge"
            ? dailyDemand * (params.multiplier || 2)
            : dailyDemand;
          const supplyDelay = scenario.id === "port-delay" ? (params.delayDays || 7) : 0;
          const lossQty = scenario.id === "natural-disaster"
            ? Math.round(p.quantity * (params.lossPct || 25) / 100)
            : 0;
          const effectiveQty = Math.max(0, p.quantity - lossQty);
          const daysToStockout = adjustedDemand > 0 ? Math.round(effectiveQty / adjustedDemand) : 999;

          return {
            name: p.name,
            sku: p.sku,
            daysToStockout: Math.min(daysToStockout, 90),
            currentQty: p.quantity,
            category: p.category,
            value: p.quantity * p.unitCost,
          };
        })
        .filter((p) => p.daysToStockout < 30)
        .sort((a, b) => a.daysToStockout - b.daysToStockout);

      const financialImpact = scenario.id === "tariff-change"
        ? products.reduce((s, p) => s + p.quantity * p.unitCost * (params.tariffPct || 15) / 100, 0)
        : scenario.id === "natural-disaster"
          ? products.reduce((s, p) => s + p.quantity * p.unitCost * (params.lossPct || 25) / 100, 0)
          : stockouts.reduce((s, p) => s + p.value * 0.3, 0);

      const categoryImpact = categoriesList.map((cat) => {
        const catProducts = stockouts.filter((p) => p.category === cat.name);
        return {
          name: cat.name,
          atRisk: catProducts.length,
          value: Math.round(catProducts.reduce((s, p) => s + p.value, 0)),
        };
      }).filter((c) => c.atRisk > 0);

      const riskScore = Math.min(100, Math.round(
        (stockouts.length / Math.max(products.length, 1)) * 100 * 1.5 +
        (financialImpact / Math.max(products.reduce((s, p) => s + p.quantity * p.unitCost, 0), 1)) * 100
      ));

      const recommendations = [
        stockouts.length > 5 ? "Increase safety stock levels across high-risk SKUs by 30%" : null,
        scenario.id === "port-delay" ? "Diversify suppliers to include domestic alternatives for critical items" : null,
        scenario.id === "demand-surge" ? "Pre-position inventory in regional distribution centers" : null,
        scenario.id === "supplier-failure" ? "Qualify backup suppliers for all single-source products" : null,
        scenario.id === "natural-disaster" ? "Distribute inventory across multiple warehouse locations" : null,
        scenario.id === "tariff-change" ? "Negotiate long-term contracts to lock in current pricing" : null,
        financialImpact > 10000 ? "Consider inventory insurance to mitigate financial exposure" : null,
        "Implement automated reorder triggers for all at-risk SKUs",
      ].filter(Boolean) as string[];

      setResults({
        stockouts: stockouts.slice(0, 15),
        financialImpact: Math.round(financialImpact),
        productsAtRisk: stockouts.length,
        totalStockoutDays: stockouts.reduce((s, p) => s + (30 - p.daysToStockout), 0),
        categoryImpact,
        recommendations,
        riskScore,
      });
      setIsRunning(false);
    }, 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold text-primary flex items-center gap-2">
            <FlaskConical className="h-6 w-6" /> Supply Chain Stress Testing
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Run what-if simulations to test your supply chain resilience against disruptions
          </p>
        </div>
        {results && (
          <Button variant="outline" size="sm" className="gap-1" onClick={() => { setResults(null); setSelectedScenario(null); }}>
            <RotateCcw className="h-3 w-3" /> Reset
          </Button>
        )}
      </div>

      {/* Scenario Selector */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {SCENARIOS.map((sc) => (
          <Card
            key={sc.id}
            className={`bg-card border-border cursor-pointer hover:border-primary/30 transition-all ${selectedScenario === sc.id ? "border-primary bg-primary/5" : ""}`}
            onClick={() => selectScenario(sc.id)}
          >
            <CardContent className="pt-4 pb-3 space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary">
                  <sc.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{sc.name}</p>
                  <Badge className={`${CATEGORY_COLORS[sc.category]} text-[9px] mt-0.5`}>{sc.category}</Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{sc.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Parameter Configuration */}
      {scenario && !results && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <scenario.icon className="h-4 w-4 text-primary" /> Configure: {scenario.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {scenario.params.map((param) => (
                <div key={param.key} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">{param.label}</Label>
                    <span className="font-mono text-sm font-bold text-primary">
                      {params[param.key]?.toFixed(param.max < 10 ? 1 : 0)} {param.unit}
                    </span>
                  </div>
                  <Slider
                    value={[params[param.key] || param.default]}
                    onValueChange={([v]) => setParams({ ...params, [param.key]: v })}
                    min={param.min}
                    max={param.max}
                    step={param.max < 10 ? 0.1 : 1}
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{param.min} {param.unit}</span>
                    <span>{param.max} {param.unit}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button onClick={runSimulation} disabled={isRunning} className="gap-2">
                {isRunning ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Running Simulation...</>
                ) : (
                  <><Play className="h-4 w-4" /> Run Stress Test</>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Analyzing {products.length} products across {suppliers.length} suppliers
              </p>
            </div>

            {isRunning && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Zap className="h-3 w-3 text-warning animate-pulse" /> Running digital twin simulation...
                </div>
                <Progress value={66} className="h-1.5 [&>div]:animate-pulse" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results && (
        <>
          {/* Risk Score */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Risk Score", value: `${results.riskScore}/100`, icon: Shield, color: results.riskScore > 70 ? "text-danger" : results.riskScore > 40 ? "text-warning" : "text-success" },
              { label: "Products at Risk", value: results.productsAtRisk, icon: Package, color: "text-warning" },
              { label: "Financial Exposure", value: `$${results.financialImpact.toLocaleString()}`, icon: DollarSign, color: "text-danger" },
              { label: "Stockout Days", value: results.totalStockoutDays, icon: Clock, color: "text-danger" },
            ].map((s) => (
              <Card key={s.label} className="bg-card border-border">
                <CardContent className="pt-4 pb-3 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-secondary"><s.icon className={`h-4 w-4 ${s.color}`} /></div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                    <p className={`font-mono text-lg font-bold ${s.color}`}>{s.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Category Impact Chart */}
            <Card className="bg-card border-border">
              <CardHeader><CardTitle className="text-sm font-medium">Impact by Category</CardTitle></CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={results.categoryImpact}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,20%)" />
                    <XAxis dataKey="name" stroke="hsl(220,10%,55%)" fontSize={10} />
                    <YAxis stroke="hsl(220,10%,55%)" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(220,18%,13%)", border: "1px solid hsl(220,14%,20%)", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="atRisk" fill="hsl(0, 72%, 51%)" name="Products at Risk" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Stockout Timeline */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-danger" /> Predicted Stockouts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-72 overflow-auto">
                {results.stockouts.map((p) => (
                  <div key={p.sku} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${p.daysToStockout <= 3 ? "bg-danger animate-pulse" : p.daysToStockout <= 7 ? "bg-warning" : "bg-muted-foreground"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{p.sku} • {p.currentQty} units remaining</p>
                    </div>
                    <Badge className={`text-[10px] font-mono ${p.daysToStockout <= 3 ? "bg-danger/20 text-danger border-danger/30" : p.daysToStockout <= 7 ? "bg-warning/20 text-warning border-warning/30" : "bg-muted text-muted-foreground"}`}>
                      {p.daysToStockout}d
                    </Badge>
                  </div>
                ))}
                {results.stockouts.length === 0 && (
                  <p className="text-sm text-success text-center py-4">No stockouts predicted under this scenario.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4 text-success" /> AI Mitigation Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 md:grid-cols-2">
              {results.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-secondary/50">
                  <div className="shrink-0 mt-0.5 h-5 w-5 rounded-full bg-success/20 flex items-center justify-center">
                    <span className="text-[10px] font-mono text-success font-bold">{i + 1}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{rec}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
