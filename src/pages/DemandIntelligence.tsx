import { useState, useMemo } from "react";
import { useInventory } from "@/context/InventoryContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line,
} from "recharts";
import {
  Brain, TrendingUp, Users, ShoppingCart, Eye, Heart,
  Smartphone, Monitor, Store, Warehouse, Globe,
  Zap, Target, BarChart3, ArrowUp, ArrowDown,
} from "lucide-react";

const CHANNEL_COLORS: Record<string, string> = {
  web: "hsl(200, 80%, 50%)",
  mobile: "hsl(280, 60%, 55%)",
  "in-store": "hsl(142, 71%, 45%)",
  wholesale: "hsl(38, 92%, 50%)",
  marketplace: "hsl(0, 72%, 51%)",
};

const CHANNEL_ICONS: Record<string, typeof Monitor> = {
  web: Monitor,
  mobile: Smartphone,
  "in-store": Store,
  wholesale: Warehouse,
  marketplace: Globe,
};

const SEGMENT_COLORS: Record<string, string> = {
  new: "hsl(200, 80%, 50%)",
  repeat: "hsl(142, 71%, 45%)",
  wholesale: "hsl(38, 92%, 50%)",
  enterprise: "hsl(280, 60%, 55%)",
};

export default function DemandIntelligence() {
  const { products, categoriesList } = useInventory();
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  // Generate demand signals from product data
  const demandData = useMemo(() =>
    products.map((p, idx) => {
      const baseVelocity = Math.max(1, Math.round(p.reorderPoint / 5));
      const trendMultiplier = p.status === "low" ? 1.5 : p.status === "out" ? 2.0 : 0.8 + Math.random() * 0.4;
      const velocity = Math.round(baseVelocity * trendMultiplier);
      const channels = {
        web: Math.round(velocity * (0.35 + Math.random() * 0.15)),
        mobile: Math.round(velocity * (0.25 + Math.random() * 0.1)),
        "in-store": Math.round(velocity * (0.15 + Math.random() * 0.1)),
        wholesale: Math.round(velocity * (0.15 + Math.random() * 0.1)),
        marketplace: Math.round(velocity * (0.05 + Math.random() * 0.05)),
      };
      const segments = {
        new: Math.round(velocity * (0.3 + Math.random() * 0.1)),
        repeat: Math.round(velocity * (0.4 + Math.random() * 0.1)),
        wholesale: Math.round(velocity * (0.15 + Math.random() * 0.1)),
        enterprise: Math.round(velocity * (0.1 + Math.random() * 0.05)),
      };
      const weeklyTrend = Array.from({ length: 12 }, (_, i) => ({
        week: `W${i + 1}`,
        actual: Math.round(velocity * (0.7 + Math.random() * 0.6)),
        predicted: Math.round(velocity * (0.8 + i * 0.02)),
      }));
      const daysOfStock = p.quantity > 0 ? Math.round(p.quantity / Math.max(velocity / 7, 0.1)) : 0;
      const demandTrend = trendMultiplier > 1.2 ? "rising" : trendMultiplier < 0.9 ? "falling" : "stable";
      const forecastAccuracy = 82 + Math.round(Math.random() * 15);
      const viewToCartRate = 5 + Math.round(Math.random() * 20);
      const cartToOrderRate = 30 + Math.round(Math.random() * 40);

      return {
        ...p,
        velocity,
        channels,
        segments,
        weeklyTrend,
        daysOfStock,
        demandTrend,
        forecastAccuracy,
        viewToCartRate,
        cartToOrderRate,
        trendMultiplier,
      };
    }),
    [products]
  );

  const selectedData = demandData.find((d) => d.id === selectedProduct);

  // Global stats
  const stats = useMemo(() => {
    const totalVelocity = demandData.reduce((s, d) => s + d.velocity, 0);
    const avgAccuracy = Math.round(demandData.reduce((s, d) => s + d.forecastAccuracy, 0) / Math.max(demandData.length, 1));
    const risingCount = demandData.filter((d) => d.demandTrend === "rising").length;
    const atRisk = demandData.filter((d) => d.daysOfStock < 7).length;
    return { totalVelocity, avgAccuracy, risingCount, atRisk };
  }, [demandData]);

  // Channel distribution
  const channelDistribution = useMemo(() => {
    const totals: Record<string, number> = {};
    demandData.forEach((d) => {
      Object.entries(d.channels).forEach(([ch, val]) => {
        totals[ch] = (totals[ch] || 0) + val;
      });
    });
    return Object.entries(totals).map(([name, value]) => ({ name, value }));
  }, [demandData]);

  // Segment distribution
  const segmentDistribution = useMemo(() => {
    const totals: Record<string, number> = {};
    demandData.forEach((d) => {
      Object.entries(d.segments).forEach(([seg, val]) => {
        totals[seg] = (totals[seg] || 0) + val;
      });
    });
    return Object.entries(totals).map(([name, value]) => ({ name, value }));
  }, [demandData]);

  // Category velocity
  const categoryVelocity = useMemo(() =>
    categoriesList.map((cat) => {
      const catProducts = demandData.filter((d) => d.category === cat.name);
      const totalVelocity = catProducts.reduce((s, d) => s + d.velocity, 0);
      const avgDaysOfStock = catProducts.length
        ? Math.round(catProducts.reduce((s, d) => s + d.daysOfStock, 0) / catProducts.length)
        : 0;
      return { name: cat.name, velocity: totalVelocity, daysOfStock: avgDaysOfStock, products: catProducts.length };
    }),
    [categoriesList, demandData]
  );

  // Top movers
  const topMovers = useMemo(() =>
    [...demandData].sort((a, b) => b.velocity - a.velocity).slice(0, 8),
    [demandData]
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold text-primary flex items-center gap-2">
            <Brain className="h-6 w-6" /> Hyper-Personalized Demand Intelligence
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Multi-channel demand signals, customer behavior analytics, and AI-powered forecasting
          </p>
        </div>
        <Badge variant="outline" className="text-xs font-mono gap-1">
          <Target className="h-3 w-3" /> Forecast Accuracy: {stats.avgAccuracy}%
        </Badge>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Weekly Demand Velocity", value: `${stats.totalVelocity} units`, icon: Zap, color: "text-primary" },
          { label: "Forecast Accuracy", value: `${stats.avgAccuracy}%`, icon: Target, color: "text-success" },
          { label: "Rising Demand SKUs", value: stats.risingCount, icon: TrendingUp, color: "text-warning" },
          { label: "At Risk (< 7 days)", value: stats.atRisk, icon: ShoppingCart, color: "text-danger" },
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

      {/* Charts Row 1 */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Channel Distribution */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-sm font-medium">Demand by Channel</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={channelDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value">
                  {channelDistribution.map((entry) => (
                    <Cell key={entry.name} fill={CHANNEL_COLORS[entry.name] || "hsl(220,10%,40%)"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(220,18%,13%)", border: "1px solid hsl(220,14%,20%)", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Segment Distribution */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-sm font-medium">Customer Segments</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={segmentDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value">
                  {segmentDistribution.map((entry) => (
                    <Cell key={entry.name} fill={SEGMENT_COLORS[entry.name] || "hsl(220,10%,40%)"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(220,18%,13%)", border: "1px solid hsl(220,14%,20%)", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Velocity */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-sm font-medium">Velocity by Category</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryVelocity}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,20%)" />
                <XAxis dataKey="name" stroke="hsl(220,10%,55%)" fontSize={9} />
                <YAxis stroke="hsl(220,10%,55%)" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(220,18%,13%)", border: "1px solid hsl(220,14%,20%)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="velocity" fill="hsl(38,92%,50%)" name="Weekly Velocity" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Product Detail + Top Movers */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top Movers */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Top Demand Products
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topMovers.map((d) => (
              <div
                key={d.id}
                className={`flex items-center gap-3 p-2 rounded-lg bg-secondary/50 cursor-pointer hover:bg-secondary/70 transition-colors ${selectedProduct === d.id ? "bg-primary/10 border border-primary/30" : ""}`}
                onClick={() => setSelectedProduct(d.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{d.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono text-muted-foreground">{d.sku}</span>
                    <Badge className={`text-[9px] ${d.demandTrend === "rising" ? "bg-success/20 text-success border-success/30" : d.demandTrend === "falling" ? "bg-danger/20 text-danger border-danger/30" : "bg-muted text-muted-foreground"}`}>
                      {d.demandTrend === "rising" ? <ArrowUp className="h-2 w-2 mr-0.5" /> : d.demandTrend === "falling" ? <ArrowDown className="h-2 w-2 mr-0.5" /> : null}
                      {d.demandTrend}
                    </Badge>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-sm font-bold">{d.velocity}/wk</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{d.daysOfStock}d supply</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Product Detail */}
        {selectedData ? (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm font-medium">{selectedData.name}</CardTitle>
              <p className="text-[10px] text-muted-foreground font-mono">{selectedData.sku} • {selectedData.category}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Funnel metrics */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded bg-secondary/50 text-center">
                  <Eye className="h-3.5 w-3.5 mx-auto text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground mt-1">View→Cart</p>
                  <p className="font-mono text-sm font-bold">{selectedData.viewToCartRate}%</p>
                </div>
                <div className="p-2 rounded bg-secondary/50 text-center">
                  <ShoppingCart className="h-3.5 w-3.5 mx-auto text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground mt-1">Cart→Order</p>
                  <p className="font-mono text-sm font-bold">{selectedData.cartToOrderRate}%</p>
                </div>
                <div className="p-2 rounded bg-secondary/50 text-center">
                  <Target className="h-3.5 w-3.5 mx-auto text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground mt-1">Forecast Acc.</p>
                  <p className="font-mono text-sm font-bold">{selectedData.forecastAccuracy}%</p>
                </div>
              </div>

              {/* Channel breakdown */}
              <div>
                <p className="text-[10px] text-muted-foreground mb-2">Channel Breakdown</p>
                <div className="space-y-1.5">
                  {Object.entries(selectedData.channels).map(([ch, val]) => {
                    const total = Object.values(selectedData.channels).reduce((a, b) => a + b, 0);
                    const pct = total > 0 ? (val / total) * 100 : 0;
                    const Icon = CHANNEL_ICONS[ch] || Monitor;
                    return (
                      <div key={ch} className="flex items-center gap-2 text-xs">
                        <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="w-20 text-muted-foreground capitalize">{ch}</span>
                        <Progress value={pct} className="h-1.5 flex-1" />
                        <span className="font-mono w-8 text-right">{val}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Forecast chart */}
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">12-Week Forecast vs Actual</p>
                <div className="h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={selectedData.weeklyTrend}>
                      <defs>
                        <linearGradient id="demandGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="week" stroke="hsl(220,10%,55%)" fontSize={9} />
                      <YAxis stroke="hsl(220,10%,55%)" fontSize={9} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(220,18%,13%)", border: "1px solid hsl(220,14%,20%)", borderRadius: 8, fontSize: 11 }} />
                      <Area type="monotone" dataKey="actual" stroke="hsl(38,92%,50%)" strokeWidth={2} fill="url(#demandGrad)" name="Actual" />
                      <Line type="monotone" dataKey="predicted" stroke="hsl(142,71%,45%)" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Predicted" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded bg-secondary/50">
                  <p className="text-[10px] text-muted-foreground">Days of Supply</p>
                  <p className={`font-mono font-bold ${selectedData.daysOfStock < 7 ? "text-danger" : selectedData.daysOfStock < 14 ? "text-warning" : "text-success"}`}>
                    {selectedData.daysOfStock} days
                  </p>
                </div>
                <div className="p-2 rounded bg-secondary/50">
                  <p className="text-[10px] text-muted-foreground">Demand Trend</p>
                  <p className={`font-mono font-bold capitalize ${selectedData.demandTrend === "rising" ? "text-success" : selectedData.demandTrend === "falling" ? "text-danger" : "text-muted-foreground"}`}>
                    {selectedData.demandTrend} ({selectedData.trendMultiplier.toFixed(1)}x)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="py-24 text-center">
              <Brain className="h-16 w-16 mx-auto mb-4 text-muted-foreground/20" />
              <p className="text-muted-foreground">Select a product to view demand intelligence</p>
              <p className="text-xs text-muted-foreground mt-1">Multi-channel analytics, conversion funnels, and AI forecasts</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
