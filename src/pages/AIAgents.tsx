import { useState, useMemo } from "react";
import { useInventory } from "@/context/InventoryContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Bot, Zap, Brain, Shield, Clock, Play, Pause, Settings, Activity,
  TrendingUp, AlertTriangle, Package, RefreshCw, Cpu, Plus,
} from "lucide-react";
import { toast } from "sonner";

interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string;
  triggerType: "threshold" | "schedule" | "event" | "continuous";
  condition: string;
  action: string;
  active: boolean;
  lastTriggered: string;
  executionCount: number;
}

interface ExecutionEntry {
  id: string;
  timestamp: string;
  agentName: string;
  trigger: string;
  actionTaken: string;
  status: "success" | "failed" | "pending";
  productsAffected: number;
}

const ICON_MAP: Record<string, React.ElementType> = {
  bot: Bot,
  zap: Zap,
  brain: Brain,
  shield: Shield,
  trending: TrendingUp,
  alert: AlertTriangle,
  package: Package,
  refresh: RefreshCw,
};

const TRIGGER_COLORS: Record<string, string> = {
  threshold: "border-warning/30 text-warning",
  schedule: "border-primary/30 text-primary",
  event: "border-success/30 text-success",
  continuous: "border-purple-400/30 text-purple-400",
};

const STATUS_COLORS: Record<string, string> = {
  success: "border-success/30 text-success",
  failed: "border-danger/30 text-danger",
  pending: "border-warning/30 text-warning",
};

const initialAgents: Agent[] = [
  {
    id: "agent-1",
    name: "Auto-Reorder Agent",
    description: "Automatically creates purchase orders when stock levels fall below configured reorder points",
    icon: "bot",
    triggerType: "threshold",
    condition: "When quantity < reorder point",
    action: "Auto-create purchase order",
    active: true,
    lastTriggered: "2 min ago",
    executionCount: 847,
  },
  {
    id: "agent-2",
    name: "Overstock Optimizer",
    description: "Detects overstocked items exceeding 5x reorder threshold and suggests price reductions to move inventory",
    icon: "trending",
    triggerType: "schedule",
    condition: "When quantity > 5x reorder point",
    action: "Suggest price reduction / promotion",
    active: true,
    lastTriggered: "1 hr ago",
    executionCount: 234,
  },
  {
    id: "agent-3",
    name: "Supplier Delay Detector",
    description: "Monitors open purchase orders against expected delivery dates and alerts on potential delays",
    icon: "shield",
    triggerType: "continuous",
    condition: "When PO delivery > expected date",
    action: "Alert procurement team & find alt supplier",
    active: true,
    lastTriggered: "15 min ago",
    executionCount: 156,
  },
  {
    id: "agent-4",
    name: "Expiry Watchdog",
    description: "Tracks perishable inventory approaching expiration and triggers markdown pricing or warehouse transfers",
    icon: "alert",
    triggerType: "schedule",
    condition: "When expiry date < 30 days away",
    action: "Trigger markdown pricing / transfer",
    active: false,
    lastTriggered: "3 days ago",
    executionCount: 89,
  },
  {
    id: "agent-5",
    name: "Demand Spike Responder",
    description: "Detects unusual demand increases using rolling averages and automatically adjusts safety stock levels",
    icon: "zap",
    triggerType: "event",
    condition: "When demand > 2x rolling average",
    action: "Auto-increase safety stock by 50%",
    active: true,
    lastTriggered: "45 min ago",
    executionCount: 312,
  },
  {
    id: "agent-6",
    name: "Dead Stock Identifier",
    description: "Flags inventory items with zero movement for 90+ consecutive days for liquidation review",
    icon: "package",
    triggerType: "schedule",
    condition: "When no movement for 90+ days",
    action: "Flag for liquidation review",
    active: true,
    lastTriggered: "6 hrs ago",
    executionCount: 67,
  },
  {
    id: "agent-7",
    name: "Price Optimization Engine",
    description: "Analyzes profit margins, velocity, and market data to suggest optimal pricing adjustments",
    icon: "brain",
    triggerType: "continuous",
    condition: "When margin deviates > 15% from target",
    action: "Suggest optimal price adjustment",
    active: false,
    lastTriggered: "1 day ago",
    executionCount: 423,
  },
  {
    id: "agent-8",
    name: "Warehouse Balancer",
    description: "Redistributes stock across warehouse locations to optimize fulfillment speed and reduce shipping costs",
    icon: "refresh",
    triggerType: "schedule",
    condition: "When warehouse utilization imbalance > 25%",
    action: "Auto-create transfer orders",
    active: true,
    lastTriggered: "30 min ago",
    executionCount: 198,
  },
];

function generateExecutionLog(
  products: { name: string; supplier: string }[],
  suppliers: { name: string }[]
): ExecutionEntry[] {
  const productNames = products.length > 0 ? products.map((p) => p.name) : ["Widget A", "Gadget B", "Part C"];
  const supplierNames = suppliers.length > 0 ? suppliers.map((s) => s.name) : ["Acme Corp", "GlobalTech"];

  const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

  const templates: { agent: string; trigger: (p: string, s: string) => string; action: (p: string, s: string) => string; status: "success" | "failed" | "pending" }[] = [
    { agent: "Auto-Reorder Agent", trigger: (p) => `${p} dropped below reorder point (qty: 12)`, action: (p, s) => `Created PO-${Math.floor(1000 + Math.random() * 9000)} for ${p} from ${s}`, status: "success" },
    { agent: "Auto-Reorder Agent", trigger: (p) => `${p} critically low (qty: 3)`, action: (p, s) => `Expedited PO created with ${s}, priority shipping`, status: "success" },
    { agent: "Overstock Optimizer", trigger: (p) => `${p} overstocked at 6.2x reorder level`, action: (p) => `Suggested 15% price reduction for ${p}`, status: "success" },
    { agent: "Overstock Optimizer", trigger: (p) => `${p} excess inventory detected (1,240 units)`, action: (p) => `Created promotional bundle for ${p}`, status: "pending" },
    { agent: "Supplier Delay Detector", trigger: (_, s) => `PO from ${s} overdue by 3 days`, action: (_, s) => `Alert sent to procurement, ${s} contacted`, status: "success" },
    { agent: "Supplier Delay Detector", trigger: (_, s) => `${s} shipment tracking shows delay`, action: () => `Escalated to manager, backup supplier identified`, status: "failed" },
    { agent: "Expiry Watchdog", trigger: (p) => `${p} batch #B2847 expires in 18 days`, action: (p) => `Applied 30% markdown on ${p}, notified sales`, status: "success" },
    { agent: "Demand Spike Responder", trigger: (p) => `${p} demand up 340% vs 7-day avg`, action: (p) => `Safety stock for ${p} increased to 150 units`, status: "success" },
    { agent: "Demand Spike Responder", trigger: (p) => `Unusual order volume for ${p} detected`, action: (p, s) => `Emergency reorder placed with ${s}`, status: "pending" },
    { agent: "Dead Stock Identifier", trigger: (p) => `${p} no movement for 112 days`, action: (p) => `Flagged ${p} for liquidation review`, status: "success" },
    { agent: "Dead Stock Identifier", trigger: (p) => `${p} dormant for 95 days`, action: (p) => `${p} added to clearance campaign`, status: "success" },
    { agent: "Price Optimization Engine", trigger: (p) => `${p} margin at 8.2%, below 20% target`, action: (p) => `Recommended price increase: $24.99 -> $29.99 for ${p}`, status: "success" },
    { agent: "Price Optimization Engine", trigger: (p) => `${p} competitor price drop detected`, action: (p) => `Price match analysis generated for ${p}`, status: "failed" },
    { agent: "Warehouse Balancer", trigger: () => `Warehouse East at 94% capacity, West at 41%`, action: (p) => `Transfer order created: 200 units of ${p} East -> West`, status: "success" },
    { agent: "Warehouse Balancer", trigger: () => `Fulfillment imbalance detected across 3 locations`, action: () => `Redistribution plan generated for 12 SKUs`, status: "pending" },
    { agent: "Auto-Reorder Agent", trigger: (p) => `${p} stock depleted, zero on hand`, action: (p, s) => `Emergency PO created with ${s}, overnight shipping`, status: "success" },
    { agent: "Demand Spike Responder", trigger: (p) => `${p} trending on social media, demand +280%`, action: (p) => `Pre-emptive reorder for ${p}, safety stock doubled`, status: "success" },
    { agent: "Expiry Watchdog", trigger: (p) => `${p} lot #L9921 expires in 7 days`, action: (p) => `${p} transferred to outlet channel at 50% markdown`, status: "success" },
  ];

  const now = Date.now();
  return templates.map((t, i) => {
    const p = pick(productNames);
    const s = pick(supplierNames);
    const minutesAgo = i * 17 + Math.floor(Math.random() * 15);
    const ts = new Date(now - minutesAgo * 60 * 1000);
    return {
      id: `exec-${i}`,
      timestamp: ts.toLocaleString(),
      agentName: t.agent,
      trigger: t.trigger(p, s),
      actionTaken: t.action(p, s),
      status: t.status,
      productsAffected: Math.floor(1 + Math.random() * 24),
    };
  });
}

export default function AIAgents() {
  const { products, suppliers } = useInventory();
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [configAgent, setConfigAgent] = useState<Partial<Agent> | null>(null);

  const executionLog = useMemo(
    () => generateExecutionLog(products, suppliers),
    [products, suppliers]
  );

  const activeCount = agents.filter((a) => a.active).length;
  const totalExecutions = agents.reduce((s, a) => s + a.executionCount, 0);
  const actionsToday = 47;
  const successRate = 94.7;

  const toggleAgent = (id: string) => {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, active: !a.active } : a
      )
    );
  };

  const handleSaveAgent = () => {
    if (!configAgent?.name) {
      toast.error("Agent name is required");
      return;
    }
    if (configAgent.id) {
      setAgents((prev) =>
        prev.map((a) => (a.id === configAgent.id ? { ...a, ...configAgent } as Agent : a))
      );
    } else {
      const newAgent: Agent = {
        id: `agent-${Date.now()}`,
        name: configAgent.name || "",
        description: configAgent.description || "",
        icon: "bot",
        triggerType: (configAgent.triggerType as Agent["triggerType"]) || "threshold",
        condition: configAgent.condition || "",
        action: configAgent.action || "",
        active: configAgent.active ?? true,
        lastTriggered: "Never",
        executionCount: 0,
      };
      setAgents((prev) => [...prev, newAgent]);
    }
    setDialogOpen(false);
    setConfigAgent(null);
    toast.success(configAgent.id ? "Agent updated" : "Agent created");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-2xl font-bold text-primary">Autonomous AI Agents</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Configure intelligent agents that monitor and act on your inventory autonomously
          </p>
        </div>
        <Button
          onClick={() => {
            setConfigAgent({ name: "", description: "", triggerType: "threshold", condition: "", action: "", active: true });
            setDialogOpen(true);
          }}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" /> Add Agent
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Active Agents", value: activeCount, icon: Bot, color: "text-success" },
          { label: "Total Executions", value: totalExecutions.toLocaleString(), icon: Activity, color: "text-primary" },
          { label: "Actions Today", value: actionsToday, icon: Zap, color: "text-warning" },
          { label: "Success Rate", value: `${successRate}%`, icon: Cpu, color: "text-success" },
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

      {/* Agent Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {agents.map((agent) => {
          const IconComp = ICON_MAP[agent.icon] || Bot;
          return (
            <Card key={agent.id} className="bg-card border-border hover:border-primary/30 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${agent.active ? "bg-primary/10" : "bg-secondary"}`}>
                      <IconComp className={`h-5 w-5 ${agent.active ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="font-mono text-sm leading-tight">{agent.name}</CardTitle>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className={`h-1.5 w-1.5 rounded-full ${agent.active ? "bg-success animate-pulse" : "bg-muted-foreground"}`} />
                        <span className="text-[10px] text-muted-foreground">
                          {agent.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={agent.active}
                    onCheckedChange={() => toggleAgent(agent.id)}
                    className="scale-75"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                  {agent.description}
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-[10px] ${TRIGGER_COLORS[agent.triggerType]}`}>
                    {agent.triggerType}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Activity className="h-2.5 w-2.5" />
                    {agent.executionCount} runs
                  </Badge>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground shrink-0">IF</span>
                    <span className="font-mono text-primary/80">{agent.condition}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground shrink-0">DO</span>
                    <span className="font-mono text-success/80">{agent.action}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Last triggered: {agent.lastTriggered}
                </div>

                <div className="flex gap-1 pt-1 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs flex-1"
                    onClick={() => toast.info(`Execution log for ${agent.name}: ${agent.executionCount} total runs`)}
                  >
                    <Play className="h-3 w-3 mr-1" /> View Log
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs flex-1"
                    onClick={() => {
                      setConfigAgent({ ...agent });
                      setDialogOpen(true);
                    }}
                  >
                    <Settings className="h-3 w-3 mr-1" /> Configure
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Execution Log */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Recent Execution Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs text-muted-foreground">Timestamp</th>
                  <th className="px-3 py-2 text-left text-xs text-muted-foreground">Agent</th>
                  <th className="px-3 py-2 text-left text-xs text-muted-foreground">Trigger</th>
                  <th className="px-3 py-2 text-left text-xs text-muted-foreground">Action Taken</th>
                  <th className="px-3 py-2 text-left text-xs text-muted-foreground">Status</th>
                  <th className="px-3 py-2 text-left text-xs text-muted-foreground">Affected</th>
                </tr>
              </thead>
              <tbody>
                {executionLog.map((entry) => (
                  <tr key={entry.id} className="border-t border-border">
                    <td className="px-3 py-2 text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {entry.timestamp}
                    </td>
                    <td className="px-3 py-2 font-medium text-xs whitespace-nowrap">{entry.agentName}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground max-w-[220px] truncate">
                      {entry.trigger}
                    </td>
                    <td className="px-3 py-2 text-xs max-w-[220px] truncate">{entry.actionTaken}</td>
                    <td className="px-3 py-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${STATUS_COLORS[entry.status]}`}
                      >
                        {entry.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-center">{entry.productsAffected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add / Configure Agent Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono">
              {configAgent?.id ? "Configure Agent" : "Add New Agent"}
            </DialogTitle>
          </DialogHeader>
          {configAgent && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">Agent Name</Label>
                <Input
                  value={configAgent.name || ""}
                  onChange={(e) => setConfigAgent({ ...configAgent, name: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">Description</Label>
                <Input
                  value={configAgent.description || ""}
                  onChange={(e) => setConfigAgent({ ...configAgent, description: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Trigger Type</Label>
                <Select
                  value={configAgent.triggerType || "threshold"}
                  onValueChange={(val) => setConfigAgent({ ...configAgent, triggerType: val as Agent["triggerType"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="threshold">Threshold</SelectItem>
                    <SelectItem value="schedule">Schedule</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="continuous">Continuous</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2 pb-1">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={configAgent.active ?? true}
                    onCheckedChange={(val) => setConfigAgent({ ...configAgent, active: val })}
                  />
                  <Label className="text-xs text-muted-foreground">
                    {configAgent.active ? "Active" : "Inactive"}
                  </Label>
                </div>
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">Condition (when to trigger)</Label>
                <Input
                  value={configAgent.condition || ""}
                  onChange={(e) => setConfigAgent({ ...configAgent, condition: e.target.value })}
                  placeholder='e.g. quantity < reorderPoint'
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">Action (what to do)</Label>
                <Input
                  value={configAgent.action || ""}
                  onChange={(e) => setConfigAgent({ ...configAgent, action: e.target.value })}
                  placeholder="e.g. Create purchase order"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAgent}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
