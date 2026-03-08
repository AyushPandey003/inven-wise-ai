import { Product } from "@/context/InventoryContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";
import { useMemo } from "react";
import { Package, Calendar, Truck, DollarSign, TrendingUp } from "lucide-react";

interface Props {
  product: Product | null;
  open: boolean;
  onClose: () => void;
}

export function ProductDetailSheet({ product, open, onClose }: Props) {
  const stockHistory = useMemo(() => {
    if (!product) return [];
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const variance = Math.round((Math.random() - 0.3) * product.reorderPoint * 0.5);
      return {
        date: d.toLocaleDateString("en", { month: "short", day: "numeric" }),
        qty: Math.max(0, product.quantity + variance - Math.round(i * 0.3)),
      };
    });
  }, [product]);

  if (!product) return null;

  const stockLevel = product.reorderPoint > 0 ? Math.min((product.quantity / (product.reorderPoint * 3)) * 100, 100) : 100;
  const statusColor = product.status === "in-stock" ? "text-success" : product.status === "low" ? "text-warning" : "text-danger";

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="bg-card border-border w-full sm:max-w-lg overflow-auto">
        <SheetHeader>
          <SheetTitle className="font-mono text-primary">{product.name}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          {/* Product Image */}
          {product.imageUrl && (
            <div className="rounded-lg overflow-hidden border border-border">
              <img src={product.imageUrl} alt={product.name} className="w-full h-48 object-cover" />
            </div>
          )}

          {/* Status & SKU */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="outline" className="font-mono text-xs">{product.sku}</Badge>
            {product.barcode && <Badge variant="outline" className="font-mono text-[10px]">Barcode: {product.barcode}</Badge>}
            {product.warehouseName && <Badge variant="outline" className="font-mono text-[10px]">{product.warehouseName}</Badge>}
            <Badge className={`${product.status === "in-stock" ? "bg-success/20 text-success" : product.status === "low" ? "bg-warning/20 text-warning" : "bg-danger/20 text-danger"}`}>
              {product.status === "in-stock" ? "In Stock" : product.status === "low" ? "Low Stock" : "Out of Stock"}
            </Badge>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Package, label: "Quantity", value: product.quantity.toString(), sub: `Reorder at ${product.reorderPoint}` },
              { icon: DollarSign, label: "Unit Cost", value: `$${product.unitCost.toFixed(2)}`, sub: `Total: $${(product.quantity * product.unitCost).toLocaleString()}` },
              { icon: Truck, label: "Supplier", value: product.supplier, sub: product.category },
              { icon: Calendar, label: "Last Updated", value: new Date(product.lastUpdated).toLocaleDateString(), sub: new Date(product.lastUpdated).toLocaleTimeString() },
            ].map(m => (
              <div key={m.label} className="p-3 rounded-lg bg-secondary/50 space-y-1">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <m.icon className="h-3 w-3" />
                  <span className="text-[10px] uppercase tracking-wider">{m.label}</span>
                </div>
                <p className="font-mono text-sm font-medium truncate">{m.value}</p>
                <p className="text-[10px] text-muted-foreground truncate">{m.sub}</p>
              </div>
            ))}
          </div>

          {/* Stock Level Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Stock Level</span>
              <span className={`font-mono ${statusColor}`}>{product.quantity} / {product.reorderPoint * 3}</span>
            </div>
            <Progress value={stockLevel} className="h-2" />
          </div>

          {/* Simulated Stock History Chart */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>Stock History (30 days, simulated)</span>
            </div>
            <div className="h-32 rounded-lg bg-secondary/30 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stockHistory}>
                  <defs>
                    <linearGradient id="detailGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(220,18%,13%)", border: "1px solid hsl(220,14%,20%)", borderRadius: 8, fontSize: 11 }} />
                  <Area type="monotone" dataKey="qty" stroke="hsl(38,92%,50%)" strokeWidth={1.5} fill="url(#detailGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
