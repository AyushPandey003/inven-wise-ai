import { useInventory } from "@/context/InventoryContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, X, Bot, PackageX, TrendingUp, Clock, Bell, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const alertIcons = {
  "low-stock": AlertTriangle,
  "out-of-stock": PackageX,
  "overstock": TrendingUp,
  "expiring": Clock,
};

const alertColors = {
  "low-stock": "bg-warning/20 text-warning border-warning/30",
  "out-of-stock": "bg-danger/20 text-danger border-danger/30",
  "overstock": "bg-primary/20 text-primary border-primary/30",
  "expiring": "bg-muted text-muted-foreground",
};

const alertPriority = { "out-of-stock": 0, "low-stock": 1, "overstock": 2, "expiring": 3 };

export default function Alerts() {
  const { alerts, products, dismissAlert } = useInventory();
  const navigate = useNavigate();
  const active = alerts.filter((a) => !a.dismissed).sort((a, b) => alertPriority[a.type] - alertPriority[b.type]);
  const dismissed = alerts.filter((a) => a.dismissed);

  const byType = {
    all: active,
    "out-of-stock": active.filter(a => a.type === "out-of-stock"),
    "low-stock": active.filter(a => a.type === "low-stock"),
    "overstock": active.filter(a => a.type === "overstock"),
  };

  const askAI = (message: string) => {
    navigate("/assistant", { state: { prefill: message } });
  };

  const dismissAll = () => {
    active.forEach(a => dismissAlert(a.id));
  };

  const AlertCard = ({ alert }: { alert: typeof alerts[0] }) => {
    const Icon = alertIcons[alert.type];
    const product = products.find((p) => p.id === alert.productId);
    return (
      <Card className="bg-card border-border hover:border-primary/20 transition-all group">
        <CardContent className="flex items-center gap-4 py-3">
          <div className="shrink-0 p-2 rounded-lg bg-secondary">
            <Icon className={`h-4 w-4 ${alert.type === "out-of-stock" ? "text-danger" : alert.type === "low-stock" ? "text-warning" : "text-primary"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <Badge className={`${alertColors[alert.type]} text-[10px]`}>
                {alert.type.replace("-", " ")}
              </Badge>
              {product && <span className="text-[10px] font-mono text-muted-foreground">{product.sku}</span>}
            </div>
            <p className="text-sm truncate">{alert.message}</p>
          </div>
          <Button variant="ghost" size="sm" className="text-primary text-xs opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => askAI(`What should I do about ${product?.name || "this product"} which is ${alert.type.replace("-", " ")}? Current quantity: ${product?.quantity}, reorder point: ${product?.reorderPoint}`)}>
            <Bot className="h-3 w-3 mr-1" /> Ask AI
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => dismissAlert(alert.id)}>
            <X className="h-3 w-3" />
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-2xl font-bold text-primary">Alerts</h1>
          {active.length > 0 && (
            <Badge variant="outline" className="font-mono text-xs border-danger/30 text-danger">
              <Bell className="h-3 w-3 mr-1" />{active.length} active
            </Badge>
          )}
        </div>
        {active.length > 0 && (
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={dismissAll}>
            <CheckCircle2 className="h-3 w-3 mr-1" /> Dismiss All
          </Button>
        )}
      </div>

      {active.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-16 text-center">
            <div className="p-4 rounded-2xl bg-success/10 inline-block mb-4">
              <CheckCircle2 className="h-10 w-10 text-success" />
            </div>
            <p className="text-muted-foreground font-medium">No active alerts — everything looks good!</p>
            <p className="text-xs text-muted-foreground mt-1">We'll notify you when stock levels need attention.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="all">
          <TabsList className="bg-secondary">
            <TabsTrigger value="all">All ({byType.all.length})</TabsTrigger>
            <TabsTrigger value="out-of-stock" className="text-danger">Out of Stock ({byType["out-of-stock"].length})</TabsTrigger>
            <TabsTrigger value="low-stock" className="text-warning">Low Stock ({byType["low-stock"].length})</TabsTrigger>
            <TabsTrigger value="overstock">Overstock ({byType.overstock.length})</TabsTrigger>
          </TabsList>
          {Object.entries(byType).map(([key, items]) => (
            <TabsContent key={key} value={key} className="space-y-2 mt-3">
              {items.map(alert => <AlertCard key={alert.id} alert={alert} />)}
              {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No alerts in this category.</p>}
            </TabsContent>
          ))}
        </Tabs>
      )}

      {dismissed.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">Dismissed ({dismissed.length})</h2>
          <div className="space-y-1.5 opacity-40 hover:opacity-60 transition-opacity">
            {dismissed.slice(0, 5).map((alert) => (
              <Card key={alert.id} className="bg-card border-border">
                <CardContent className="py-2 text-xs text-muted-foreground line-through">{alert.message}</CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
