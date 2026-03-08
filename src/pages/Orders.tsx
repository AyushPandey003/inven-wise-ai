import { useState } from "react";
import { useInventory } from "@/context/InventoryContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { POStatus } from "@/context/InventoryContext";
import { ShoppingCart, Plus, Package, FileText, Truck, CheckCircle2 } from "lucide-react";

const statusConfig: Record<POStatus, { color: string; icon: typeof FileText }> = {
  draft: { color: "bg-muted text-muted-foreground", icon: FileText },
  sent: { color: "bg-primary/20 text-primary border-primary/30", icon: Truck },
  received: { color: "bg-success/20 text-success border-success/30", icon: CheckCircle2 },
};

export default function Orders() {
  const { orders, products, updateOrderStatus, createOrder } = useInventory();
  const [tab, setTab] = useState("all");

  const lowStockItems = products.filter((p) => p.status === "low" || p.status === "out");

  const filteredOrders = tab === "all" ? orders : orders.filter(o => o.status === tab);

  const handleAutoGenerate = () => {
    if (lowStockItems.length === 0) return;
    const bySupplier: Record<string, typeof lowStockItems> = {};
    lowStockItems.forEach((p) => {
      (bySupplier[p.supplier] ??= []).push(p);
    });
    Object.entries(bySupplier).forEach(([supplier, items]) => {
      createOrder({
        items: items.map((p) => ({
          productId: p.id,
          quantity: Math.max(p.reorderPoint - p.quantity + 10, 10),
          unitCost: p.unitCost,
        })),
        status: "draft",
        supplier,
        total: items.reduce((s, p) => s + Math.max(p.reorderPoint - p.quantity + 10, 10) * p.unitCost, 0),
      });
    });
  };

  const totalPOValue = orders.reduce((s, o) => s + o.total, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-2xl font-bold text-primary">Purchase Orders</h1>
          <p className="text-xs text-muted-foreground mt-1">{orders.length} orders • ${totalPOValue.toLocaleString()} total value</p>
        </div>
        <Button onClick={handleAutoGenerate} disabled={lowStockItems.length === 0} className="gap-1.5">
          <Plus className="h-4 w-4" /> Auto-Generate from Low Stock ({lowStockItems.length})
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-3">
        {([
          { label: "Draft", status: "draft" as POStatus, icon: FileText },
          { label: "Sent", status: "sent" as POStatus, icon: Truck },
          { label: "Received", status: "received" as POStatus, icon: CheckCircle2 },
        ]).map(s => {
          const count = orders.filter(o => o.status === s.status).length;
          return (
            <Card key={s.status} className="bg-card border-border cursor-pointer hover:border-primary/30 transition-all" onClick={() => setTab(s.status)}>
              <CardContent className="py-3 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary">
                  <s.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-mono text-xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-secondary">
          <TabsTrigger value="all">All ({orders.length})</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
          <TabsTrigger value="received">Received</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {filteredOrders.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No orders in this category.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const StatusIcon = statusConfig[order.status].icon;
                return (
                  <Card key={order.id} className="bg-card border-border hover:border-primary/20 transition-all">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-secondary">
                          <StatusIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <CardTitle className="font-mono text-sm">{order.id}</CardTitle>
                          <p className="text-xs text-muted-foreground">{order.supplier}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={statusConfig[order.status].color}>{order.status.toUpperCase()}</Badge>
                        <Select value={order.status} onValueChange={(v) => updateOrderStatus(order.id, v as POStatus)}>
                          <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="sent">Sent</SelectItem>
                            <SelectItem value="received">Received</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-lg border border-border overflow-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-secondary/50">
                            <tr>
                              <th className="px-3 py-1.5 text-left text-xs text-muted-foreground">Product</th>
                              <th className="px-3 py-1.5 text-left text-xs text-muted-foreground">Qty</th>
                              <th className="px-3 py-1.5 text-left text-xs text-muted-foreground">Unit Cost</th>
                              <th className="px-3 py-1.5 text-left text-xs text-muted-foreground">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.items.map((item, i) => {
                              const prod = products.find((p) => p.id === item.productId);
                              return (
                                <tr key={i} className="border-t border-border">
                                  <td className="px-3 py-1.5">{prod?.name || item.productId}</td>
                                  <td className="px-3 py-1.5 font-mono">{item.quantity}</td>
                                  <td className="px-3 py-1.5 font-mono">${item.unitCost.toFixed(2)}</td>
                                  <td className="px-3 py-1.5 font-mono">${(item.quantity * item.unitCost).toFixed(2)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <p className="text-xs text-muted-foreground">
                          Created {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                        <span className="font-mono text-sm">
                          Total: <span className="text-primary font-bold">${order.total.toFixed(2)}</span>
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
