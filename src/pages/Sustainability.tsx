import { useState, useMemo } from "react";
import { useInventory } from "@/context/InventoryContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";
import {
  Leaf, Factory, Truck, Package, Recycle, TrendingDown, AlertTriangle,
  Award, Zap, Globe, TreePine, Droplets,
} from "lucide-react";

const EMISSION_FACTORS = {
  transport: { local: 0.12, regional: 0.45, national: 1.2, international: 3.8 },
  packaging: { minimal: 0.05, standard: 0.15, heavy: 0.35 },
  storage: { ambient: 0.02, cooled: 0.08, frozen: 0.18 },
};

const CATEGORY_EMISSIONS: Record<string, { transport: number; manufacturing: number; packaging: number; storage: number }> = {
  Electronics: { transport: 2.4, manufacturing: 8.5, packaging: 0.3, storage: 0.05 },
  Apparel: { transport: 1.8, manufacturing: 3.2, packaging: 0.2, storage: 0.02 },
  "Food & Beverage": { transport: 0.9, manufacturing: 1.5, packaging: 0.4, storage: 0.12 },
  "Office Supplies": { transport: 0.6, manufacturing: 1.8, packaging: 0.15, storage: 0.02 },
  Hardware: { transport: 1.5, manufacturing: 5.2, packaging: 0.25, storage: 0.03 },
};

function getSustainabilityScore(emissions: number): number {
  if (emissions < 2) return 95;
  if (emissions < 5) return 80;
  if (emissions < 10) return 60;
  if (emissions < 20) return 40;
  return 20;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-warning";
  return "text-danger";
}

function getScoreLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 50) return "Fair";
  if (score >= 25) return "Poor";
  return "Critical";
}

export default function Sustainability() {
  const { products, categoriesList, suppliers } = useInventory();
  const [selectedCategory, setSelectedCategory] = useState("all");

  const productEmissions = useMemo(() =>
    products.map((p) => {
      const catFactors = CATEGORY_EMISSIONS[p.category] || CATEGORY_EMISSIONS.Hardware;
      const transport = catFactors.transport * p.quantity * 0.01;
      const manufacturing = catFactors.manufacturing * p.quantity * 0.01;
      const packaging = catFactors.packaging * p.quantity * 0.01;
      const storage = catFactors.storage * p.quantity * 0.05;
      const total = transport + manufacturing + packaging + storage;
      return {
        ...p,
        emissions: { transport, manufacturing, packaging, storage, total },
        score: getSustainabilityScore(total / Math.max(p.quantity, 1) * 10),
      };
    }),
    [products]
  );

  const filtered = selectedCategory === "all"
    ? productEmissions
    : productEmissions.filter((p) => p.category === selectedCategory);

  const totalEmissions = useMemo(() =>
    productEmissions.reduce((s, p) => s + p.emissions.total, 0),
    [productEmissions]
  );

  const avgScore = useMemo(() =>
    productEmissions.length
      ? Math.round(productEmissions.reduce((s, p) => s + p.score, 0) / productEmissions.length)
      : 0,
    [productEmissions]
  );

  const categoryBreakdown = useMemo(() =>
    categoriesList.map((cat) => {
      const catProducts = productEmissions.filter((p) => p.category === cat.name);
      const total = catProducts.reduce((s, p) => s + p.emissions.total, 0);
      const transport = catProducts.reduce((s, p) => s + p.emissions.transport, 0);
      const manufacturing = catProducts.reduce((s, p) => s + p.emissions.manufacturing, 0);
      const packaging = catProducts.reduce((s, p) => s + p.emissions.packaging, 0);
      const storage = catProducts.reduce((s, p) => s + p.emissions.storage, 0);
      const avgScore = catProducts.length
        ? Math.round(catProducts.reduce((s, p) => s + p.score, 0) / catProducts.length) : 0;
      return { name: cat.name, total: Number(total.toFixed(1)), transport: Number(transport.toFixed(1)), manufacturing: Number(manufacturing.toFixed(1)), packaging: Number(packaging.toFixed(1)), storage: Number(storage.toFixed(1)), score: avgScore, products: catProducts.length };
    }),
    [categoriesList, productEmissions]
  );

  const emissionBySource = useMemo(() => [
    { name: "Manufacturing", value: Number(productEmissions.reduce((s, p) => s + p.emissions.manufacturing, 0).toFixed(1)), fill: "hsl(0, 72%, 51%)" },
    { name: "Transport", value: Number(productEmissions.reduce((s, p) => s + p.emissions.transport, 0).toFixed(1)), fill: "hsl(38, 92%, 50%)" },
    { name: "Packaging", value: Number(productEmissions.reduce((s, p) => s + p.emissions.packaging, 0).toFixed(1)), fill: "hsl(200, 80%, 50%)" },
    { name: "Storage", value: Number(productEmissions.reduce((s, p) => s + p.emissions.storage, 0).toFixed(1)), fill: "hsl(142, 71%, 45%)" },
  ], [productEmissions]);

  const monthlyTrend = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => {
      const month = new Date(2026, i, 1).toLocaleString("en", { month: "short" });
      const baseline = totalEmissions / 12;
      const reduction = i * 0.02;
      return {
        month,
        emissions: Number((baseline * (1 - reduction) + (Math.random() - 0.5) * baseline * 0.1).toFixed(1)),
        target: Number((baseline * (1 - i * 0.03)).toFixed(1)),
      };
    }),
    [totalEmissions]
  );

  const topEmitters = useMemo(() =>
    [...productEmissions].sort((a, b) => b.emissions.total - a.emissions.total).slice(0, 8),
    [productEmissions]
  );

  const supplierSustainability = useMemo(() =>
    suppliers.map((s) => {
      const supProducts = productEmissions.filter((p) => p.supplier === s.name);
      const totalEm = supProducts.reduce((acc, p) => acc + p.emissions.total, 0);
      const avgSc = supProducts.length
        ? Math.round(supProducts.reduce((acc, p) => acc + p.score, 0) / supProducts.length)
        : 50;
      return { name: s.name, emissions: Number(totalEm.toFixed(1)), score: avgSc, products: supProducts.length };
    }).sort((a, b) => b.emissions - a.emissions).slice(0, 6),
    [suppliers, productEmissions]
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold text-primary flex items-center gap-2">
            <Leaf className="h-6 w-6" /> Carbon Footprint & Sustainability
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Track environmental impact across your inventory lifecycle — sourcing to storage
          </p>
        </div>
        <Badge variant="outline" className="text-xs font-mono gap-1">
          <Globe className="h-3 w-3" /> EU ESPR Compliant
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total CO₂e", value: `${totalEmissions.toFixed(0)} kg`, icon: Factory, color: "text-danger", sub: "Across all products" },
          { label: "Sustainability Score", value: `${avgScore}/100`, icon: Award, color: getScoreColor(avgScore), sub: getScoreLabel(avgScore) },
          { label: "Carbon Intensity", value: `${(totalEmissions / Math.max(products.length, 1)).toFixed(1)} kg/SKU`, icon: Zap, color: "text-warning", sub: "Per product average" },
          { label: "YoY Reduction", value: "-12.4%", icon: TrendingDown, color: "text-success", sub: "vs. previous year" },
        ].map((s) => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-secondary"><s.icon className={`h-4 w-4 ${s.color}`} /></div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                  <p className={`font-mono text-lg font-bold ${s.color}`}>{s.value}</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-sm font-medium">Emissions by Source</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={emissionBySource} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value">
                  {emissionBySource.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(220,18%,13%)", border: "1px solid hsl(220,14%,20%)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => `${v} kg CO₂e`} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader><CardTitle className="text-sm font-medium">Monthly Emissions Trend vs Target</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="emGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,20%)" />
                <XAxis dataKey="month" stroke="hsl(220,10%,55%)" fontSize={10} />
                <YAxis stroke="hsl(220,10%,55%)" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(220,18%,13%)", border: "1px solid hsl(220,14%,20%)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => `${v} kg`} />
                <Area type="monotone" dataKey="emissions" stroke="hsl(0,72%,51%)" strokeWidth={2} fill="url(#emGrad)" name="Actual" />
                <Area type="monotone" dataKey="target" stroke="hsl(142,71%,45%)" strokeWidth={1.5} strokeDasharray="5 5" fill="transparent" name="Target" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-sm font-medium">Category Emissions Breakdown</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,20%)" />
                  <XAxis dataKey="name" stroke="hsl(220,10%,55%)" fontSize={9} />
                  <YAxis stroke="hsl(220,10%,55%)" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(220,18%,13%)", border: "1px solid hsl(220,14%,20%)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => `${v} kg CO₂e`} />
                  <Bar dataKey="manufacturing" stackId="a" fill="hsl(0, 50%, 50%)" name="Manufacturing" />
                  <Bar dataKey="transport" stackId="a" fill="hsl(38, 92%, 50%)" name="Transport" />
                  <Bar dataKey="packaging" stackId="a" fill="hsl(200, 80%, 50%)" name="Packaging" />
                  <Bar dataKey="storage" stackId="a" fill="hsl(142, 71%, 45%)" name="Storage" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {categoryBreakdown.map((c) => (
                <div key={c.name} className="p-3 rounded-lg bg-secondary/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{c.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] font-mono ${getScoreColor(c.score)}`}>
                        Score: {c.score}
                      </Badge>
                      <span className="text-xs font-mono text-muted-foreground">{c.total} kg CO₂e</span>
                    </div>
                  </div>
                  <Progress value={c.score} className={`h-1.5 ${c.score < 50 ? "[&>div]:bg-danger" : c.score < 75 ? "[&>div]:bg-warning" : ""}`} />
                  <div className="flex gap-4 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Factory className="h-2.5 w-2.5" /> {c.manufacturing}kg</span>
                    <span className="flex items-center gap-1"><Truck className="h-2.5 w-2.5" /> {c.transport}kg</span>
                    <span className="flex items-center gap-1"><Package className="h-2.5 w-2.5" /> {c.packaging}kg</span>
                    <span className="flex items-center gap-1"><Droplets className="h-2.5 w-2.5" /> {c.storage}kg</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top Emitters */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" /> Highest Impact Products
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topEmitters.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                <div className={`h-2 w-2 rounded-full shrink-0 ${p.score >= 75 ? "bg-success" : p.score >= 50 ? "bg-warning" : "bg-danger"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{p.emissions.total.toFixed(1)} kg CO₂e</p>
                </div>
                <Badge variant="outline" className={`text-[10px] font-mono ${getScoreColor(p.score)}`}>
                  {p.score}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Supplier Sustainability */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TreePine className="h-4 w-4 text-success" /> Supplier Sustainability Rankings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs text-muted-foreground">Supplier</th>
                    <th className="px-3 py-2 text-left text-xs text-muted-foreground">Products</th>
                    <th className="px-3 py-2 text-left text-xs text-muted-foreground">Emissions</th>
                    <th className="px-3 py-2 text-left text-xs text-muted-foreground">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierSustainability.map((s) => (
                    <tr key={s.name} className="border-t border-border">
                      <td className="px-3 py-2 font-medium">{s.name}</td>
                      <td className="px-3 py-2 font-mono text-xs">{s.products}</td>
                      <td className="px-3 py-2 font-mono text-xs">{s.emissions} kg</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Progress value={s.score} className="h-1.5 w-16" />
                          <span className={`text-[10px] font-mono ${getScoreColor(s.score)}`}>{s.score}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Recycle className="h-4 w-4 text-success" /> AI Sustainability Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[
            { title: "Consolidate Shipments", desc: "Combine orders from TechFlow Inc. and ConnectPro Ltd. — both Austin, TX based. Could reduce transport emissions by ~18%.", impact: "-18% transport", icon: Truck },
            { title: "Switch to Eco Packaging", desc: "Office Supplies category uses standard packaging. Switching to recycled materials saves 0.08 kg CO₂e per unit.", impact: "-35% packaging", icon: Package },
            { title: "Local Supplier for F&B", desc: "GreenBean Supply (Portland, OR) ships nationally. A local distributor could cut transport emissions by 60%.", impact: "-60% transport", icon: Globe },
            { title: "Optimize Cold Storage", desc: "Food & Beverage storage at 4°C. Raising to 6°C (within safe range) reduces cooling energy by 15%.", impact: "-15% storage", icon: Droplets },
            { title: "Solar-Powered Warehouse", desc: "Main Warehouse in Dallas, TX has 300+ sunny days/year. Solar panels could offset 40% of storage emissions.", impact: "-40% storage", icon: Zap },
            { title: "Reduce Overstock", desc: "High-Vis Vests have 150 units (7.5x reorder point). Reducing overstock minimizes storage waste.", impact: "-25% waste", icon: Recycle },
          ].map((rec) => (
            <div key={rec.title} className="p-3 rounded-lg bg-secondary/50 space-y-2 hover:bg-secondary/70 transition-colors">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-success/10"><rec.icon className="h-3.5 w-3.5 text-success" /></div>
                <span className="text-sm font-medium">{rec.title}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{rec.desc}</p>
              <Badge className="bg-success/20 text-success border-success/30 text-[10px]">{rec.impact}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
