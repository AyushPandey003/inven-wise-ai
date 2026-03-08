import { useState, useMemo, useEffect } from "react";
import { useInventory } from "@/context/InventoryContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, BarChart, Bar,
} from "recharts";
import {
  Thermometer, Droplets, Activity, Zap, Waves, Sun,
  AlertTriangle, CheckCircle2, Radio, Wifi, RefreshCw, Eye,
} from "lucide-react";

interface Sensor {
  id: string;
  name: string;
  type: "temperature" | "humidity" | "vibration" | "light";
  warehouse: string;
  zone: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  status: "normal" | "warning" | "critical";
  history: { time: string; value: number }[];
}

const SENSOR_ICONS = {
  temperature: Thermometer,
  humidity: Droplets,
  vibration: Waves,
  light: Sun,
};

const STATUS_COLORS = {
  normal: "text-success",
  warning: "text-warning",
  critical: "text-danger",
};

const STATUS_BG = {
  normal: "bg-success/20 border-success/30",
  warning: "bg-warning/20 border-warning/30",
  critical: "bg-danger/20 border-danger/30",
};

function generateHistory(base: number, variance: number, points = 48): { time: string; value: number }[] {
  return Array.from({ length: points }, (_, i) => {
    const h = Math.floor(i / 2);
    const m = (i % 2) * 30;
    return {
      time: `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`,
      value: Number((base + (Math.random() - 0.5) * variance * 2).toFixed(1)),
    };
  });
}

function getStatus(value: number, min: number, max: number): "normal" | "warning" | "critical" {
  if (value < min * 0.9 || value > max * 1.1) return "critical";
  if (value < min || value > max) return "warning";
  return "normal";
}

export default function IoTSensors() {
  const { warehouses } = useInventory();
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  const sensors: Sensor[] = useMemo(() => {
    const warehouseNames = warehouses.length > 0
      ? warehouses.map((w) => w.name)
      : ["Main Warehouse", "West Coast Hub", "East Coast Depot"];

    return [
      // Temperature sensors
      { id: "s1", name: "Temp-A1", type: "temperature" as const, warehouse: warehouseNames[0], zone: "Zone A - Electronics", value: 22.4 + (Math.random() - 0.5) * 2, unit: "°C", min: 18, max: 26, status: "normal" as const, history: generateHistory(22, 2) },
      { id: "s2", name: "Temp-B1", type: "temperature" as const, warehouse: warehouseNames[0], zone: "Zone B - Apparel", value: 21.8 + (Math.random() - 0.5) * 1.5, unit: "°C", min: 18, max: 26, status: "normal" as const, history: generateHistory(22, 1.5) },
      { id: "s3", name: "Temp-C1", type: "temperature" as const, warehouse: warehouseNames[0], zone: "Zone C - Cold Storage", value: 4.2 + (Math.random() - 0.5) * 3, unit: "°C", min: 2, max: 6, status: "normal" as const, history: generateHistory(4, 1.5) },
      { id: "s4", name: "Temp-C2", type: "temperature" as const, warehouse: warehouseNames[1] || warehouseNames[0], zone: "Zone C - Cold Storage", value: 7.8 + (Math.random() - 0.5) * 1, unit: "°C", min: 2, max: 6, status: "critical" as const, history: generateHistory(6, 2) },
      // Humidity sensors
      { id: "s5", name: "Humid-A1", type: "humidity" as const, warehouse: warehouseNames[0], zone: "Zone A - Electronics", value: 42 + (Math.random() - 0.5) * 8, unit: "%", min: 30, max: 55, status: "normal" as const, history: generateHistory(42, 5) },
      { id: "s6", name: "Humid-B1", type: "humidity" as const, warehouse: warehouseNames[0], zone: "Zone B - Apparel", value: 48 + (Math.random() - 0.5) * 6, unit: "%", min: 35, max: 60, status: "normal" as const, history: generateHistory(48, 4) },
      { id: "s7", name: "Humid-D1", type: "humidity" as const, warehouse: warehouseNames[1] || warehouseNames[0], zone: "Zone D - Office", value: 62 + (Math.random() - 0.5) * 4, unit: "%", min: 30, max: 55, status: "warning" as const, history: generateHistory(58, 6) },
      // Vibration sensors
      { id: "s8", name: "Vib-E1", type: "vibration" as const, warehouse: warehouseNames[0], zone: "Zone E - Hardware", value: 0.3 + Math.random() * 0.4, unit: "g", min: 0, max: 0.5, status: "normal" as const, history: generateHistory(0.3, 0.15) },
      { id: "s9", name: "Vib-Loading", type: "vibration" as const, warehouse: warehouseNames[0], zone: "Loading Dock", value: 1.2 + Math.random() * 0.8, unit: "g", min: 0, max: 1.5, status: "warning" as const, history: generateHistory(1.0, 0.4) },
      // Light sensors
      { id: "s10", name: "Light-A1", type: "light" as const, warehouse: warehouseNames[0], zone: "Zone A - Electronics", value: 320 + (Math.random() - 0.5) * 60, unit: "lux", min: 200, max: 500, status: "normal" as const, history: generateHistory(320, 40) },
      { id: "s11", name: "Light-C1", type: "light" as const, warehouse: warehouseNames[0], zone: "Zone C - Cold Storage", value: 85 + (Math.random() - 0.5) * 30, unit: "lux", min: 50, max: 200, status: "normal" as const, history: generateHistory(85, 20) },
      { id: "s12", name: "Light-Ext", type: "light" as const, warehouse: warehouseNames[2] || warehouseNames[0], zone: "External", value: 890 + (Math.random() - 0.5) * 100, unit: "lux", min: 100, max: 800, status: "warning" as const, history: generateHistory(750, 150) },
    ].map((s) => ({ ...s, value: Number(s.value.toFixed(1)), status: getStatus(s.value, s.min, s.max) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouses, tick]);

  const stats = useMemo(() => ({
    total: sensors.length,
    normal: sensors.filter((s) => s.status === "normal").length,
    warning: sensors.filter((s) => s.status === "warning").length,
    critical: sensors.filter((s) => s.status === "critical").length,
    avgTemp: Number((sensors.filter((s) => s.type === "temperature").reduce((a, s) => a + s.value, 0) / Math.max(sensors.filter((s) => s.type === "temperature").length, 1)).toFixed(1)),
    avgHumidity: Number((sensors.filter((s) => s.type === "humidity").reduce((a, s) => a + s.value, 0) / Math.max(sensors.filter((s) => s.type === "humidity").length, 1)).toFixed(1)),
  }), [sensors]);

  const selectedSensorData = sensors.find((s) => s.id === selectedSensor);

  const alertSensors = sensors.filter((s) => s.status !== "normal");

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold text-primary flex items-center gap-2">
            <Radio className="h-6 w-6" /> IoT Environmental Monitoring
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time sensor data — temperature, humidity, vibration, and light across all warehouses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[10px] text-success">
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span></span>
            Live
          </div>
          <Badge variant="outline" className="text-[10px] font-mono">
            <Wifi className="h-3 w-3 mr-1" /> {sensors.length} sensors
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: "Total Sensors", value: stats.total, icon: Radio, color: "text-primary" },
          { label: "Normal", value: stats.normal, icon: CheckCircle2, color: "text-success" },
          { label: "Warning", value: stats.warning, icon: AlertTriangle, color: "text-warning" },
          { label: "Critical", value: stats.critical, icon: Zap, color: "text-danger" },
          { label: "Avg Temp", value: `${stats.avgTemp}°C`, icon: Thermometer, color: "text-primary" },
          { label: "Avg Humidity", value: `${stats.avgHumidity}%`, icon: Droplets, color: "text-primary" },
        ].map((s) => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="pt-3 pb-2 flex items-center gap-2">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <div>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                <p className={`font-mono text-lg font-bold ${s.color}`}>{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts */}
      {alertSensors.length > 0 && (
        <Card className="bg-card border-border border-warning/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" /> Active Alerts ({alertSensors.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alertSensors.map((s) => {
              const Icon = SENSOR_ICONS[s.type];
              return (
                <div key={s.id} className={`flex items-center gap-3 p-2 rounded-lg border ${STATUS_BG[s.status]}`}>
                  <Icon className={`h-4 w-4 ${STATUS_COLORS[s.status]}`} />
                  <div className="flex-1">
                    <span className="text-sm font-medium">{s.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{s.zone} — {s.warehouse}</span>
                  </div>
                  <span className={`font-mono text-sm font-bold ${STATUS_COLORS[s.status]}`}>
                    {s.value} {s.unit}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Range: {s.min}–{s.max} {s.unit}
                  </span>
                  <Badge className={`${STATUS_BG[s.status]} text-[10px]`}>{s.status}</Badge>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setSelectedSensor(s.id)}>
                    <Eye className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Sensor Grid */}
        <div className="lg:col-span-2 space-y-3">
          <Tabs defaultValue="all">
            <TabsList className="bg-secondary">
              <TabsTrigger value="all">All ({sensors.length})</TabsTrigger>
              <TabsTrigger value="temperature"><Thermometer className="h-3 w-3 mr-1" /> Temp</TabsTrigger>
              <TabsTrigger value="humidity"><Droplets className="h-3 w-3 mr-1" /> Humidity</TabsTrigger>
              <TabsTrigger value="vibration"><Waves className="h-3 w-3 mr-1" /> Vibration</TabsTrigger>
              <TabsTrigger value="light"><Sun className="h-3 w-3 mr-1" /> Light</TabsTrigger>
            </TabsList>
            {["all", "temperature", "humidity", "vibration", "light"].map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  {sensors
                    .filter((s) => tab === "all" || s.type === tab)
                    .map((s) => {
                      const Icon = SENSOR_ICONS[s.type];
                      const pct = ((s.value - s.min) / (s.max - s.min)) * 100;
                      return (
                        <Card
                          key={s.id}
                          className={`bg-card border-border hover:border-primary/30 transition-colors cursor-pointer ${selectedSensor === s.id ? "border-primary" : ""}`}
                          onClick={() => setSelectedSensor(s.id)}
                        >
                          <CardContent className="pt-3 pb-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-lg ${s.status === "normal" ? "bg-success/10" : s.status === "warning" ? "bg-warning/10" : "bg-danger/10"}`}>
                                  <Icon className={`h-3.5 w-3.5 ${STATUS_COLORS[s.status]}`} />
                                </div>
                                <div>
                                  <p className="text-sm font-mono font-medium">{s.name}</p>
                                  <p className="text-[10px] text-muted-foreground">{s.zone}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`font-mono text-lg font-bold ${STATUS_COLORS[s.status]}`}>
                                  {s.value}{s.unit}
                                </p>
                                <Badge className={`${STATUS_BG[s.status]} text-[9px]`}>{s.status}</Badge>
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-[9px] text-muted-foreground mb-0.5">
                                <span>{s.min}{s.unit}</span>
                                <span>{s.max}{s.unit}</span>
                              </div>
                              <Progress
                                value={Math.min(100, Math.max(0, pct))}
                                className={`h-1 ${s.status === "critical" ? "[&>div]:bg-danger" : s.status === "warning" ? "[&>div]:bg-warning" : ""}`}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Detail Panel */}
        <div>
          {selectedSensorData ? (
            <Card className="bg-card border-border sticky top-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {(() => { const Icon = SENSOR_ICONS[selectedSensorData.type]; return <Icon className="h-4 w-4 text-primary" />; })()}
                  {selectedSensorData.name} Detail
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-2">
                  <p className={`font-mono text-4xl font-bold ${STATUS_COLORS[selectedSensorData.status]}`}>
                    {selectedSensorData.value}{selectedSensorData.unit}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{selectedSensorData.zone}</p>
                  <p className="text-[10px] text-muted-foreground">{selectedSensorData.warehouse}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-secondary/50">
                    <p className="text-[10px] text-muted-foreground">Min Threshold</p>
                    <p className="font-mono font-bold">{selectedSensorData.min}{selectedSensorData.unit}</p>
                  </div>
                  <div className="p-2 rounded bg-secondary/50">
                    <p className="text-[10px] text-muted-foreground">Max Threshold</p>
                    <p className="font-mono font-bold">{selectedSensorData.max}{selectedSensorData.unit}</p>
                  </div>
                </div>

                {/* 24h Chart */}
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">24h History</p>
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={selectedSensorData.history}>
                        <defs>
                          <linearGradient id="sensorGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="time" stroke="hsl(220,10%,55%)" fontSize={8} interval={7} />
                        <YAxis stroke="hsl(220,10%,55%)" fontSize={8} domain={[selectedSensorData.min * 0.8, selectedSensorData.max * 1.2]} />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(220,18%,13%)", border: "1px solid hsl(220,14%,20%)", borderRadius: 8, fontSize: 11 }} />
                        <Area type="monotone" dataKey="value" stroke="hsl(38,92%,50%)" strokeWidth={1.5} fill="url(#sensorGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="space-y-1 text-[10px] text-muted-foreground">
                  <p>Type: {selectedSensorData.type}</p>
                  <p>Status: <span className={STATUS_COLORS[selectedSensorData.status]}>{selectedSensorData.status}</span></p>
                  <p>Last Update: Just now</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="py-16 text-center">
                <Activity className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Select a sensor to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
