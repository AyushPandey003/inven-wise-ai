import { useState } from "react";
import { useInventory } from "@/context/InventoryContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { POStatus } from "@/data/inventory";
import { ShoppingCart, Plus, Package } from "lucide-react";

const statusColors: Record<POStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-primary/20 text-primary border-primary/30",
  received: "bg-success/20 text-success border-success/30",
};

export default function Orders() {
  const { orders, products, updateOrderStatus, createOrder } = useInventory();

  const lowStockItems = products.filter((p) => p.status === "low" || p.status === "out");

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="font-mono text-2xl font-bold text-primary">Purchase Orders</h1>
        <Button onClick={handleAutoGenerate} disabled={lowStockItems.length === 0}>
          <Plus className="h-4 w-4 mr-1" /> Auto-Generate from Low Stock
        </Button>
      </div>

      {orders.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No purchase orders yet. Generate from low stock items.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="font-mono text-sm">
                  {order.id} — {order.supplier}
                </CardTitle>
                <div className="flex items-center gap-3">
                  <Badge className={statusColors[order.status]}>{order.status.toUpperCase()}</Badge>
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
                <div className="rounded border border-border overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary">
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
                <div className="mt-2 text-right font-mono text-sm">
                  Total: <span className="text-primary font-bold">${order.total.toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Created {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
