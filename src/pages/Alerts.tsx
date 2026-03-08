import { useInventory } from "@/context/InventoryContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, X, Bot, PackageX, TrendingUp, Clock } from "lucide-react";
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

export default function Alerts() {
  const { alerts, products, dismissAlert } = useInventory();
  const navigate = useNavigate();
  const active = alerts.filter((a) => !a.dismissed);
  const dismissed = alerts.filter((a) => a.dismissed);

  const askAI = (message: string) => {
    navigate("/assistant", { state: { prefill: message } });
  };

  return (
    <div className="space-y-6">
      <h1 className="font-mono text-2xl font-bold text-primary">Alerts</h1>

      {active.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No active alerts — everything looks good!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {active.map((alert) => {
            const Icon = alertIcons[alert.type];
            const product = products.find((p) => p.id === alert.productId);
            return (
              <Card key={alert.id} className="bg-card border-border">
                <CardContent className="flex items-center gap-4 py-3">
                  <div className="shrink-0">
                    <Badge className={alertColors[alert.type]}>
                      <Icon className="h-3 w-3 mr-1" />
                      {alert.type.replace("-", " ")}
                    </Badge>
                  </div>
                  <p className="flex-1 text-sm">{alert.message}</p>
                  <Button variant="ghost" size="sm" className="text-primary text-xs" onClick={() => askAI(`What should I do about ${product?.name || "this product"} which is ${alert.type.replace("-", " ")}? Current quantity: ${product?.quantity}, reorder point: ${product?.reorderPoint}`)}>
                    <Bot className="h-3 w-3 mr-1" /> Ask AI
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => dismissAlert(alert.id)}>
                    <X className="h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {dismissed.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">Dismissed ({dismissed.length})</h2>
          <div className="space-y-2 opacity-50">
            {dismissed.slice(0, 5).map((alert) => (
              <Card key={alert.id} className="bg-card border-border">
                <CardContent className="py-2 text-sm text-muted-foreground">{alert.message}</CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
