import { useState, useMemo } from "react";
import { useInventory } from "@/context/InventoryContext";
import { Product, PricingTier, ProductVariant } from "@/context/InventoryContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, DollarSign, TrendingUp, Percent, Plus, Trash2, Tag, Layers } from "lucide-react";
import { toast } from "sonner";

export default function Pricing() {
  const { products, updateProduct } = useInventory();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [tierDialog, setTierDialog] = useState<Product | null>(null);
  const [variantDialog, setVariantDialog] = useState<Product | null>(null);
  const [newTier, setNewTier] = useState<PricingTier>({ minQty: 10, price: 0 });
  const [newVariant, setNewVariant] = useState({ label: "", sku: "", quantity: 0, unitCost: 0, attrKey: "", attrValue: "" });

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
      const matchCat = catFilter === "all" || p.category === catFilter;
      return matchSearch && matchCat;
    });
  }, [products, search, catFilter]);

  const cats = [...new Set(products.map((p) => p.category))];

  const globalStats = useMemo(() => {
    const totalRevPotential = products.reduce((s, p) => s + p.quantity * p.sellingPrice, 0);
    const totalCost = products.reduce((s, p) => s + p.quantity * p.unitCost, 0);
    const avgMargin = products.length > 0
      ? products.reduce((s, p) => s + ((p.sellingPrice - p.unitCost) / p.sellingPrice) * 100, 0) / products.length
      : 0;
    const totalVariants = products.reduce((s, p) => s + (p.variants?.length || 0), 0);
    return { totalRevPotential, totalCost, avgMargin, totalVariants, grossProfit: totalRevPotential - totalCost };
  }, [products]);

  const addTier = () => {
    if (!tierDialog) return;
    const tiers = [...(tierDialog.pricingTiers || []), { ...newTier }].sort((a, b) => a.minQty - b.minQty);
    const updated = { ...tierDialog, pricingTiers: tiers };
    updateProduct(updated);
    setTierDialog(updated);
    setNewTier({ minQty: 10, price: 0 });
    toast.success("Pricing tier added");
  };

  const removeTier = (idx: number) => {
    if (!tierDialog) return;
    const tiers = (tierDialog.pricingTiers || []).filter((_, i) => i !== idx);
    const updated = { ...tierDialog, pricingTiers: tiers };
    updateProduct(updated);
    setTierDialog(updated);
  };

  const addVariant = () => {
    if (!variantDialog || !newVariant.label) { toast.error("Variant label required"); return; }
    const variant: ProductVariant = {
      id: `var-${Date.now()}`,
      label: newVariant.label,
      sku: newVariant.sku || `${variantDialog.sku}-V${(variantDialog.variants?.length || 0) + 1}`,
      quantity: newVariant.quantity,
      unitCost: newVariant.unitCost || variantDialog.unitCost,
      attributes: newVariant.attrKey ? { [newVariant.attrKey]: newVariant.attrValue } : {},
    };
    const variants = [...(variantDialog.variants || []), variant];
    const updated = { ...variantDialog, variants };
    updateProduct(updated);
    setVariantDialog(updated);
    setNewVariant({ label: "", sku: "", quantity: 0, unitCost: 0, attrKey: "", attrValue: "" });
    toast.success("Variant added");
  };

  const removeVariant = (varId: string) => {
    if (!variantDialog) return;
    const variants = (variantDialog.variants || []).filter((v) => v.id !== varId);
    const updated = { ...variantDialog, variants };
    updateProduct(updated);
    setVariantDialog(updated);
  };

  const margin = (p: Product) => ((p.sellingPrice - p.unitCost) / p.sellingPrice * 100);

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div>
        <h1 className="font-mono text-2xl font-bold text-primary">Pricing & Variants</h1>
        <p className="text-xs text-muted-foreground mt-1">Manage pricing tiers, product variants, and margin analysis</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Revenue Potential", value: `$${globalStats.totalRevPotential.toLocaleString("en", { maximumFractionDigits: 0 })}`, icon: DollarSign, color: "text-success" },
          { label: "Gross Profit", value: `$${globalStats.grossProfit.toLocaleString("en", { maximumFractionDigits: 0 })}`, icon: TrendingUp, color: "text-primary" },
          { label: "Avg Margin", value: `${globalStats.avgMargin.toFixed(1)}%`, icon: Percent, color: "text-primary" },
          { label: "Total Variants", value: `${globalStats.totalVariants}`, icon: Layers, color: "text-muted-foreground" },
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {cats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Product pricing table */}
      <div className="rounded-lg border border-border overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/80">
            <tr>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Product</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Unit Cost</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Selling Price</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Margin</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Markup</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Tiers</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Variants</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const m = margin(p);
              const markup = ((p.sellingPrice - p.unitCost) / p.unitCost * 100);
              return (
                <tr key={p.id} className="border-t border-border hover:bg-secondary/40 transition-colors">
                  <td className="px-3 py-2.5">
                    <div>
                      <span className="font-medium text-sm">{p.name}</span>
                      <span className="text-[10px] text-muted-foreground ml-2 font-mono">{p.sku}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-mono">${p.unitCost.toFixed(2)}</td>
                  <td className="px-3 py-2.5 font-mono font-medium">${p.sellingPrice.toFixed(2)}</td>
                  <td className="px-3 py-2.5">
                    <Badge className={`${m >= 40 ? "bg-success/20 text-success border-success/30" : m >= 20 ? "bg-warning/20 text-warning border-warning/30" : "bg-danger/20 text-danger border-danger/30"} text-[10px] font-mono`}>
                      {m.toFixed(1)}%
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{markup.toFixed(0)}%</td>
                  <td className="px-3 py-2.5">
                    <Badge variant="outline" className="text-[10px] font-mono">{p.pricingTiers?.length || 0}</Badge>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge variant="outline" className="text-[10px] font-mono">{p.variants?.length || 0}</Badge>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-0.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-primary" onClick={() => { setTierDialog(p); setNewTier({ minQty: 10, price: p.sellingPrice * 0.9 }); }} title="Pricing tiers">
                        <Tag className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-primary" onClick={() => setVariantDialog(p)} title="Variants">
                        <Layers className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">No products match your filters.</div>
        )}
      </div>

      {/* Pricing Tiers Dialog */}
      <Dialog open={!!tierDialog} onOpenChange={() => setTierDialog(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader><DialogTitle className="font-mono">Pricing Tiers — {tierDialog?.name}</DialogTitle></DialogHeader>
          {tierDialog && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Base price: <span className="font-mono font-bold">${tierDialog.sellingPrice.toFixed(2)}</span></p>
              {(tierDialog.pricingTiers || []).length > 0 && (
                <div className="space-y-1">
                  {(tierDialog.pricingTiers || []).map((t, i) => (
                    <div key={i} className="flex items-center justify-between bg-secondary/50 rounded px-3 py-2 text-sm">
                      <span className="font-mono">≥ {t.minQty} units</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold">${t.price.toFixed(2)}</span>
                        <Badge className="text-[10px] bg-success/20 text-success border-success/30">
                          {((1 - t.price / tierDialog.sellingPrice) * 100).toFixed(0)}% off
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-danger" onClick={() => removeTier(i)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground mb-2">Add new tier</p>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-[10px] text-muted-foreground">Min Qty</Label>
                    <Input type="number" value={newTier.minQty} onChange={(e) => setNewTier({ ...newTier, minQty: Number(e.target.value) })} />
                  </div>
                  <div className="flex-1">
                    <Label className="text-[10px] text-muted-foreground">Price</Label>
                    <Input type="number" step="0.01" value={newTier.price} onChange={(e) => setNewTier({ ...newTier, price: Number(e.target.value) })} />
                  </div>
                  <div className="flex items-end">
                    <Button size="sm" onClick={addTier}><Plus className="h-3 w-3" /></Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Variants Dialog */}
      <Dialog open={!!variantDialog} onOpenChange={() => setVariantDialog(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle className="font-mono">Variants — {variantDialog?.name}</DialogTitle></DialogHeader>
          {variantDialog && (
            <div className="space-y-3">
              {(variantDialog.variants || []).length > 0 && (
                <div className="space-y-1">
                  {(variantDialog.variants || []).map((v) => (
                    <div key={v.id} className="flex items-center justify-between bg-secondary/50 rounded px-3 py-2 text-sm">
                      <div>
                        <span className="font-medium">{v.label}</span>
                        <span className="text-[10px] text-muted-foreground ml-2 font-mono">{v.sku}</span>
                        {Object.entries(v.attributes).map(([k, val]) => (
                          <Badge key={k} variant="outline" className="text-[10px] ml-1">{k}: {val}</Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{v.quantity} × ${v.unitCost.toFixed(2)}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-danger" onClick={() => removeVariant(v.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground mb-2">Add new variant</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Label (e.g. Red / L)</Label>
                    <Input value={newVariant.label} onChange={(e) => setNewVariant({ ...newVariant, label: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">SKU suffix</Label>
                    <Input value={newVariant.sku} onChange={(e) => setNewVariant({ ...newVariant, sku: e.target.value })} placeholder="Auto-generated" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Quantity</Label>
                    <Input type="number" value={newVariant.quantity} onChange={(e) => setNewVariant({ ...newVariant, quantity: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Unit Cost</Label>
                    <Input type="number" step="0.01" value={newVariant.unitCost} onChange={(e) => setNewVariant({ ...newVariant, unitCost: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Attribute name</Label>
                    <Input value={newVariant.attrKey} onChange={(e) => setNewVariant({ ...newVariant, attrKey: e.target.value })} placeholder="e.g. Color" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Attribute value</Label>
                    <Input value={newVariant.attrValue} onChange={(e) => setNewVariant({ ...newVariant, attrValue: e.target.value })} placeholder="e.g. Red" />
                  </div>
                </div>
                <Button size="sm" className="mt-2" onClick={addVariant}><Plus className="h-3 w-3 mr-1" /> Add Variant</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
