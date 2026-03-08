import { useState, useMemo } from "react";
import { useInventory } from "@/context/InventoryContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Warehouse,
  Thermometer,
  Droplets,
  Eye,
  AlertTriangle,
  MapPin,
  Layers,
  Activity,
  Scan,
  Maximize2,
  ZoomIn,
} from "lucide-react";

interface ZoneData {
  id: string;
  name: string;
  label: string;
  category: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  utilization: number;
  temperature: number;
  humidity: number;
  products: { id: string; name: string; sku: string; quantity: number; status: string }[];
  recentActivity: string[];
}

const ZONE_DEFS = [
  { id: "A", label: "Zone A", category: "Electronics", x: 30, y: 50, w: 200, h: 160 },
  { id: "B", label: "Zone B", category: "Apparel", x: 260, y: 50, w: 200, h: 160 },
  { id: "C", label: "Zone C", category: "Food", x: 30, y: 250, w: 200, h: 160 },
  { id: "D", label: "Zone D", category: "Office", x: 260, y: 250, w: 200, h: 160 },
  { id: "E", label: "Zone E", category: "Hardware", x: 520, y: 50, w: 150, h: 360 },
];

const ENV_DATA: Record<string, { temp: number; humidity: number }> = {
  A: { temp: 22, humidity: 40 },
  B: { temp: 23, humidity: 45 },
  C: { temp: 28, humidity: 55 },
  D: { temp: 21, humidity: 42 },
  E: { temp: 24, humidity: 48 },
};

const ACTIVITIES = [
  "Pallet received at dock #2",
  "Stock count completed",
  "Pick order #1084 fulfilled",
  "Forklift transport to shelf B-3",
  "Cycle count discrepancy resolved",
  "Temperature sensor calibrated",
  "Inventory audit passed",
  "Replenishment triggered",
];

function getUtilColor(pct: number): string {
  if (pct > 80) return "hsl(0, 72%, 51%)";
  if (pct >= 50) return "hsl(38, 92%, 50%)";
  return "hsl(142, 71%, 45%)";
}

function getUtilBg(pct: number): string {
  if (pct > 80) return "rgba(239,68,68,0.15)";
  if (pct >= 50) return "rgba(234,179,8,0.12)";
  return "rgba(34,197,94,0.12)";
}

function getUtilLabel(pct: number): string {
  if (pct > 80) return "Critical";
  if (pct >= 50) return "Moderate";
  return "Optimal";
}

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export default function DigitalTwin() {
  const { products, warehouses } = useInventory();
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
  const [selectedZone, setSelectedZone] = useState<ZoneData | null>(null);
  const [mapScale, setMapScale] = useState(1);

  const zones: ZoneData[] = useMemo(() => {
    return ZONE_DEFS.map((zd, zi) => {
      const categoryProducts = products.filter(
        (p) => p.category?.toLowerCase() === zd.category.toLowerCase()
      );
      const totalQty = categoryProducts.reduce((s, p) => s + p.quantity, 0);
      const totalReorder = categoryProducts.reduce((s, p) => s + (p.reorderPoint || 50), 0);
      const utilization =
        totalReorder > 0
          ? Math.min(100, Math.round((totalQty / (totalReorder * 2)) * 100))
          : Math.round(30 + seededRandom(zi + 7) * 60);

      const env = ENV_DATA[zd.id];
      const activitySlice = ACTIVITIES.slice(zi % ACTIVITIES.length).concat(
        ACTIVITIES.slice(0, zi % ACTIVITIES.length)
      ).slice(0, 3);

      return {
        id: zd.id,
        name: `${zd.label} - ${zd.category}`,
        label: zd.label,
        category: zd.category,
        x: zd.x,
        y: zd.y,
        w: zd.w,
        h: zd.h,
        color: getUtilColor(utilization),
        utilization,
        temperature: env.temp,
        humidity: env.humidity,
        products: categoryProducts.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          quantity: p.quantity,
          status: p.status,
        })),
        recentActivity: activitySlice,
      };
    });
  }, [products]);

  const totalProducts = products.length;
  const avgUtilization =
    zones.length > 0
      ? Math.round(zones.reduce((s, z) => s + z.utilization, 0) / zones.length)
      : 0;
  const hotZone = zones.reduce((a, b) => (a.utilization > b.utilization ? a : b), zones[0]);
  const anomalyCount = zones.filter((z) => z.utilization > 80 || z.temperature > 26).length;

  const alerts = useMemo(() => {
    const list: { id: string; severity: "critical" | "warning" | "info"; message: string; zone: string }[] = [];
    zones.forEach((z) => {
      if (z.temperature > 26) {
        list.push({
          id: `temp-${z.id}`,
          severity: "critical",
          message: `${z.label}-3: Temperature anomaly detected (${z.temperature}\u00B0C, threshold 25\u00B0C)`,
          zone: z.id,
        });
      }
      if (z.utilization > 90) {
        list.push({
          id: `util-${z.id}`,
          severity: "warning",
          message: `${z.label}-1: Utilization at ${z.utilization}%, consider redistribution`,
          zone: z.id,
        });
      }
      const misplaced = z.products.find((p) => p.status === "low");
      if (misplaced) {
        list.push({
          id: `sku-${z.id}`,
          severity: "info",
          message: `${z.label}-2: Misplaced SKU ${misplaced.sku} detected via last scan`,
          zone: z.id,
        });
      }
    });
    if (list.length === 0) {
      list.push(
        { id: "demo-1", severity: "critical", message: "Zone C-3: Temperature anomaly detected (28\u00B0C, threshold 25\u00B0C)", zone: "C" },
        { id: "demo-2", severity: "info", message: "Zone A-2: Misplaced SKU ELEC-003 detected via last scan", zone: "A" },
        { id: "demo-3", severity: "warning", message: "Zone E-1: Utilization at 95%, consider redistribution", zone: "E" },
      );
    }
    return list;
  }, [zones]);

  const warehouseOptions = [
    { id: "all", name: "All Warehouses" },
    ...warehouses.map((w) => ({ id: w.id, name: w.name })),
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-2xl font-bold text-primary">Digital Twin</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time interactive warehouse visualization and spatial analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] gap-1 border-success/30 text-success">
            <Activity className="h-2.5 w-2.5" /> Live
          </Badge>
          <Badge variant="outline" className="text-[10px] gap-1">
            <Layers className="h-2.5 w-2.5" /> {zones.length} Zones
          </Badge>
        </div>
      </div>

      {/* Warehouse Selector */}
      <Tabs value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
        <TabsList className="bg-secondary/50">
          {warehouseOptions.map((w) => (
            <TabsTrigger key={w.id} value={w.id} className="text-xs font-mono">
              {w.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Space Utilization", value: `${avgUtilization}%`, icon: Maximize2, color: avgUtilization > 80 ? "text-danger" : avgUtilization >= 50 ? "text-warning" : "text-success" },
          { label: "Total Products", value: totalProducts.toLocaleString(), icon: Scan, color: "text-primary" },
          { label: "Hotspot Zone", value: hotZone?.label || "-", icon: Activity, color: "text-warning" },
          { label: "Anomalies", value: anomalyCount.toString(), icon: AlertTriangle, color: anomalyCount > 0 ? "text-danger" : "text-success" },
        ].map((s) => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary">
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                <p className={`font-mono text-lg font-bold ${s.color}`}>{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content: Map + Sidebar */}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Interactive Warehouse Map */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Warehouse className="h-4 w-4 text-primary" /> Floor Plan View
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setMapScale((s) => Math.min(1.5, s + 0.1))}
                >
                  <ZoomIn className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setMapScale(1)}
                >
                  <Maximize2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative rounded-lg bg-secondary/30 border border-border overflow-hidden" style={{ minHeight: 480 }}>
              <svg
                viewBox="0 0 720 460"
                className="w-full h-full"
                style={{ transform: `scale(${mapScale})`, transformOrigin: "center center", transition: "transform 0.3s ease" }}
              >
                {/* Warehouse outline */}
                <rect x="10" y="10" width="700" height="440" rx="6" fill="none" stroke="hsl(220,14%,25%)" strokeWidth="2" strokeDasharray="8 4" />

                {/* Loading docks */}
                <rect x="10" y="425" width="80" height="24" rx="3" fill="hsl(220,14%,18%)" stroke="hsl(220,14%,30%)" strokeWidth="1" />
                <text x="50" y="440" textAnchor="middle" fill="hsl(220,10%,55%)" fontSize="8" fontFamily="monospace">DOCK 1</text>

                <rect x="110" y="425" width="80" height="24" rx="3" fill="hsl(220,14%,18%)" stroke="hsl(220,14%,30%)" strokeWidth="1" />
                <text x="150" y="440" textAnchor="middle" fill="hsl(220,10%,55%)" fontSize="8" fontFamily="monospace">DOCK 2</text>

                <rect x="210" y="425" width="80" height="24" rx="3" fill="hsl(220,14%,18%)" stroke="hsl(220,14%,30%)" strokeWidth="1" />
                <text x="250" y="440" textAnchor="middle" fill="hsl(220,10%,55%)" fontSize="8" fontFamily="monospace">DOCK 3</text>

                {/* Aisles - horizontal */}
                <rect x="30" y="215" width="430" height="30" rx="2" fill="hsl(220,14%,15%)" opacity="0.6" />
                <text x="245" y="234" textAnchor="middle" fill="hsl(220,10%,40%)" fontSize="7" fontFamily="monospace">AISLE 1</text>

                {/* Aisles - vertical */}
                <rect x="235" y="50" width="20" height="160" rx="2" fill="hsl(220,14%,15%)" opacity="0.6" />
                <rect x="235" y="250" width="20" height="160" rx="2" fill="hsl(220,14%,15%)" opacity="0.6" />
                <rect x="465" y="50" width="20" height="360" rx="2" fill="hsl(220,14%,15%)" opacity="0.6" />

                {/* Zones */}
                {zones.map((zone) => (
                  <g
                    key={zone.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedZone(selectedZone?.id === zone.id ? null : zone)}
                    role="button"
                    tabIndex={0}
                  >
                    {/* Zone background */}
                    <rect
                      x={zone.x}
                      y={zone.y}
                      width={zone.w}
                      height={zone.h}
                      rx="4"
                      fill={getUtilBg(zone.utilization)}
                      stroke={selectedZone?.id === zone.id ? "hsl(38, 92%, 50%)" : zone.color}
                      strokeWidth={selectedZone?.id === zone.id ? 2.5 : 1.5}
                      className="transition-all duration-300"
                    />

                    {/* Zone label */}
                    <text
                      x={zone.x + zone.w / 2}
                      y={zone.y + 18}
                      textAnchor="middle"
                      fill="hsl(220,10%,85%)"
                      fontSize="10"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {zone.label}
                    </text>
                    <text
                      x={zone.x + zone.w / 2}
                      y={zone.y + 32}
                      textAnchor="middle"
                      fill="hsl(220,10%,60%)"
                      fontSize="8"
                      fontFamily="monospace"
                    >
                      {zone.category}
                    </text>

                    {/* Utilization bar */}
                    <rect
                      x={zone.x + 10}
                      y={zone.y + zone.h - 20}
                      width={zone.w - 20}
                      height="6"
                      rx="3"
                      fill="hsl(220,14%,20%)"
                    />
                    <rect
                      x={zone.x + 10}
                      y={zone.y + zone.h - 20}
                      width={(zone.w - 20) * (zone.utilization / 100)}
                      height="6"
                      rx="3"
                      fill={zone.color}
                      className="transition-all duration-500"
                    />
                    <text
                      x={zone.x + zone.w / 2}
                      y={zone.y + zone.h - 8}
                      textAnchor="middle"
                      fill="hsl(220,10%,55%)"
                      fontSize="7"
                      fontFamily="monospace"
                    >
                      {zone.utilization}% utilized
                    </text>

                    {/* Product dots */}
                    {zone.products.slice(0, 12).map((prod, pi) => {
                      const cols = Math.min(6, zone.products.length);
                      const row = Math.floor(pi / cols);
                      const col = pi % cols;
                      const dotX = zone.x + 20 + col * ((zone.w - 40) / Math.max(cols - 1, 1));
                      const dotY = zone.y + 48 + row * 20;
                      const isLow = prod.status === "low" || prod.status === "out";
                      return (
                        <g key={prod.id}>
                          <circle
                            cx={dotX}
                            cy={dotY}
                            r={isLow ? 4 : 3}
                            fill={isLow ? "hsl(0, 72%, 51%)" : "hsl(200, 80%, 50%)"}
                            opacity={0.8}
                          >
                            {isLow && (
                              <animate
                                attributeName="r"
                                values="3;5;3"
                                dur="1.5s"
                                repeatCount="indefinite"
                              />
                            )}
                            {isLow && (
                              <animate
                                attributeName="opacity"
                                values="0.8;0.3;0.8"
                                dur="1.5s"
                                repeatCount="indefinite"
                              />
                            )}
                          </circle>
                        </g>
                      );
                    })}

                    {/* Product count badge */}
                    <rect
                      x={zone.x + zone.w - 36}
                      y={zone.y + 4}
                      width="30"
                      height="14"
                      rx="7"
                      fill="hsl(220,14%,15%)"
                      stroke="hsl(220,14%,25%)"
                      strokeWidth="0.5"
                    />
                    <text
                      x={zone.x + zone.w - 21}
                      y={zone.y + 14}
                      textAnchor="middle"
                      fill="hsl(220,10%,70%)"
                      fontSize="7"
                      fontFamily="monospace"
                    >
                      {zone.products.length}
                    </text>
                  </g>
                ))}

                {/* Office area */}
                <rect x="580" y="360" width="120" height="50" rx="4" fill="hsl(220,14%,14%)" stroke="hsl(220,14%,25%)" strokeWidth="1" />
                <text x="640" y="389" textAnchor="middle" fill="hsl(220,10%,45%)" fontSize="8" fontFamily="monospace">OFFICE</text>

                {/* Receiving area */}
                <rect x="580" y="300" width="120" height="50" rx="4" fill="hsl(220,14%,14%)" stroke="hsl(220,14%,25%)" strokeWidth="1" />
                <text x="640" y="329" textAnchor="middle" fill="hsl(220,10%,45%)" fontSize="8" fontFamily="monospace">RECEIVING</text>

                {/* Legend */}
                <g transform="translate(560, 50)">
                  <text x="0" y="0" fill="hsl(220,10%,60%)" fontSize="8" fontWeight="bold" fontFamily="monospace">LEGEND</text>
                  <circle cx="6" cy="14" r="4" fill="hsl(142, 71%, 45%)" />
                  <text x="16" y="17" fill="hsl(220,10%,55%)" fontSize="7" fontFamily="monospace">{"< 50%"}</text>
                  <circle cx="6" cy="28" r="4" fill="hsl(38, 92%, 50%)" />
                  <text x="16" y="31" fill="hsl(220,10%,55%)" fontSize="7" fontFamily="monospace">50-80%</text>
                  <circle cx="6" cy="42" r="4" fill="hsl(0, 72%, 51%)" />
                  <text x="16" y="45" fill="hsl(220,10%,55%)" fontSize="7" fontFamily="monospace">{"> 80%"}</text>
                  <line x1="0" y1="54" x2="60" y2="54" stroke="hsl(220,14%,25%)" strokeWidth="0.5" />
                  <circle cx="6" cy="66" r="3" fill="hsl(200, 80%, 50%)" />
                  <text x="16" y="69" fill="hsl(220,10%,55%)" fontSize="7" fontFamily="monospace">Product</text>
                  <circle cx="6" cy="80" r="3" fill="hsl(0, 72%, 51%)">
                    <animate attributeName="r" values="3;5;3" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                  <text x="16" y="83" fill="hsl(220,10%,55%)" fontSize="7" fontFamily="monospace">Low Stock</text>
                </g>
              </svg>
            </div>
          </CardContent>
        </Card>

        {/* Stats Sidebar */}
        <div className="space-y-4">
          {/* Utilization Gauge */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" /> Space Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="relative inline-flex items-center justify-center">
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(220,14%,20%)" strokeWidth="10" />
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke={getUtilColor(avgUtilization)}
                      strokeWidth="10"
                      strokeDasharray={`${(avgUtilization / 100) * 314} 314`}
                      strokeLinecap="round"
                      transform="rotate(-90 60 60)"
                      className="transition-all duration-700"
                    />
                    <text x="60" y="56" textAnchor="middle" fill="hsl(220,10%,85%)" fontSize="22" fontWeight="bold" fontFamily="monospace">
                      {avgUtilization}%
                    </text>
                    <text x="60" y="72" textAnchor="middle" fill="hsl(220,10%,55%)" fontSize="8" fontFamily="monospace">
                      AVG UTILIZATION
                    </text>
                  </svg>
                </div>
              </div>

              {/* Per-zone breakdown */}
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Products per Zone</p>
                {zones.map((z) => (
                  <div key={z.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{z.label}</span>
                      <span className="font-mono text-muted-foreground">{z.products.length} items</span>
                    </div>
                    <Progress
                      value={z.utilization}
                      className={`h-1.5 ${z.utilization > 80 ? "[&>div]:bg-danger" : z.utilization >= 50 ? "[&>div]:bg-warning" : "[&>div]:bg-success"}`}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Hotspot Indicators */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-warning" /> Hotspots
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[...zones]
                .sort((a, b) => b.utilization - a.utilization)
                .slice(0, 3)
                .map((z) => (
                  <div
                    key={z.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50 cursor-pointer hover:bg-secondary/80 transition-colors"
                    onClick={() => setSelectedZone(z)}
                  >
                    <div className={`h-2 w-2 rounded-full shrink-0 ${z.utilization > 80 ? "bg-danger animate-pulse" : z.utilization >= 50 ? "bg-warning" : "bg-success"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{z.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{z.utilization}% - {getUtilLabel(z.utilization)}</p>
                    </div>
                    <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                  </div>
                ))}
            </CardContent>
          </Card>

          {/* Environment */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-primary" /> Environment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {zones.map((z) => (
                  <div key={z.id} className="flex items-center justify-between p-1.5 rounded bg-secondary/30 text-xs">
                    <span className="font-mono font-medium">{z.label}</span>
                    <div className="flex items-center gap-3">
                      <span className={`flex items-center gap-1 font-mono ${z.temperature > 26 ? "text-danger" : "text-muted-foreground"}`}>
                        <Thermometer className="h-3 w-3" />
                        {z.temperature}&deg;C
                      </span>
                      <span className="flex items-center gap-1 font-mono text-muted-foreground">
                        <Droplets className="h-3 w-3" />
                        {z.humidity}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Anomaly Badges */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-danger" /> Anomaly Detection
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
              {anomalyCount === 0 ? (
                <Badge variant="outline" className="text-[10px] border-success/30 text-success">All Clear</Badge>
              ) : (
                <>
                  {zones.filter((z) => z.temperature > 26).map((z) => (
                    <Badge key={`t-${z.id}`} variant="outline" className="text-[10px] border-danger/30 text-danger gap-1">
                      <Thermometer className="h-2.5 w-2.5" /> {z.label} Temp
                    </Badge>
                  ))}
                  {zones.filter((z) => z.utilization > 80).map((z) => (
                    <Badge key={`u-${z.id}`} variant="outline" className="text-[10px] border-warning/30 text-warning gap-1">
                      <Layers className="h-2.5 w-2.5" /> {z.label} Full
                    </Badge>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Discrepancy Alerts */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Scan className="h-4 w-4 text-warning" /> Discrepancy Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start gap-2 p-3 rounded-lg border ${
                  alert.severity === "critical"
                    ? "bg-danger/5 border-danger/20"
                    : alert.severity === "warning"
                    ? "bg-warning/5 border-warning/20"
                    : "bg-primary/5 border-primary/20"
                }`}
              >
                <AlertTriangle
                  className={`h-4 w-4 shrink-0 mt-0.5 ${
                    alert.severity === "critical"
                      ? "text-danger"
                      : alert.severity === "warning"
                      ? "text-warning"
                      : "text-primary"
                  }`}
                />
                <div>
                  <Badge
                    variant="outline"
                    className={`text-[9px] mb-1 ${
                      alert.severity === "critical"
                        ? "border-danger/30 text-danger"
                        : alert.severity === "warning"
                        ? "border-warning/30 text-warning"
                        : "border-primary/30 text-primary"
                    }`}
                  >
                    {alert.severity.toUpperCase()}
                  </Badge>
                  <p className="text-xs text-muted-foreground leading-relaxed">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Zone Detail Panel */}
      {selectedZone && (
        <Card className="bg-card border-border border-primary/30 animate-in slide-in-from-bottom-2 duration-300">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> {selectedZone.name}
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSelectedZone(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {/* Zone stats */}
              <div className="space-y-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Zone Metrics</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Utilization</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-mono ${
                        selectedZone.utilization > 80
                          ? "border-danger/30 text-danger"
                          : selectedZone.utilization >= 50
                          ? "border-warning/30 text-warning"
                          : "border-success/30 text-success"
                      }`}
                    >
                      {selectedZone.utilization}%
                    </Badge>
                  </div>
                  <Progress
                    value={selectedZone.utilization}
                    className={`h-2 ${selectedZone.utilization > 80 ? "[&>div]:bg-danger" : selectedZone.utilization >= 50 ? "[&>div]:bg-warning" : "[&>div]:bg-success"}`}
                  />
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Thermometer className="h-3 w-3" />
                      <span className={`font-mono ${selectedZone.temperature > 26 ? "text-danger" : ""}`}>
                        {selectedZone.temperature}&deg;C
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Droplets className="h-3 w-3" />
                      <span className="font-mono">{selectedZone.humidity}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Products in zone */}
              <div className="space-y-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Products ({selectedZone.products.length})
                </p>
                <div className="space-y-1 max-h-48 overflow-auto">
                  {selectedZone.products.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No products in this zone</p>
                  ) : (
                    selectedZone.products.slice(0, 10).map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-1.5 rounded bg-secondary/50 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${p.status === "out" ? "bg-danger" : p.status === "low" ? "bg-warning" : "bg-success"}`} />
                          <span className="truncate">{p.name}</span>
                        </div>
                        <span className="font-mono text-muted-foreground shrink-0 ml-2">{p.quantity}</span>
                      </div>
                    ))
                  )}
                  {selectedZone.products.length > 10 && (
                    <p className="text-[10px] text-muted-foreground text-center pt-1">
                      +{selectedZone.products.length - 10} more items
                    </p>
                  )}
                </div>
              </div>

              {/* Recent activity */}
              <div className="space-y-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Recent Activity</p>
                <div className="space-y-1.5">
                  {selectedZone.recentActivity.map((act, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Activity className="h-3 w-3 shrink-0 mt-0.5 text-primary/60" />
                      <span>{act}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
