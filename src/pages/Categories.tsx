import { useState } from "react";
import { useInventory } from "@/context/InventoryContext";
import { Category } from "@/data/inventory";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Plus, Pencil, Trash2, Package, DollarSign, TrendingUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const emptyCategory: Omit<Category, "id" | "createdAt"> = {
  name: "", description: "", icon: "Package", color: "38 92% 50%",
};

export default function Categories() {
  const { categoriesList, products, addCategory, updateCategory, deleteCategory } = useInventory();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Category> | null>(null);

  const handleSave = () => {
    if (!editing?.name) { toast.error("Category name required"); return; }
    if (editing.id) {
      updateCategory(editing as Category);
    } else {
      addCategory(editing as Omit<Category, "id" | "createdAt">);
    }
    setDialogOpen(false);
    setEditing(null);
  };

  const getCategoryStats = (catName: string) => {
    const catProducts = products.filter((p) => p.category === catName);
    const totalQty = catProducts.reduce((s, p) => s + p.quantity, 0);
    const totalValue = catProducts.reduce((s, p) => s + p.quantity * p.unitCost, 0);
    const lowStock = catProducts.filter((p) => p.status === "low" || p.status === "out").length;
    const avgMargin = catProducts.length > 0
      ? catProducts.reduce((s, p) => s + ((p.sellingPrice - p.unitCost) / p.sellingPrice) * 100, 0) / catProducts.length
      : 0;
    return { count: catProducts.length, totalQty, totalValue, lowStock, avgMargin };
  };

  const totalProducts = products.length;

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-2xl font-bold text-primary">Categories</h1>
          <p className="text-xs text-muted-foreground mt-1">{categoriesList.length} categories • {totalProducts} total products</p>
        </div>
        <Button onClick={() => { setEditing({ ...emptyCategory }); setDialogOpen(true); }} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Category
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categoriesList.map((cat) => {
          const stats = getCategoryStats(cat.name);
          const pct = totalProducts > 0 ? (stats.count / totalProducts) * 100 : 0;
          return (
            <Card key={cat.id} className="bg-card border-border hover:border-primary/30 transition-colors">
              <CardContent className="pt-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg" style={{ backgroundColor: `hsl(${cat.color} / 0.15)` }}>
                      <Package className="h-5 w-5" style={{ color: `hsl(${cat.color})` }} />
                    </div>
                    <div>
                      <h3 className="font-mono font-bold text-sm">{cat.name}</h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5 max-w-48 truncate">{cat.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-primary" onClick={() => { setEditing({ ...cat }); setDialogOpen(true); }}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => deleteCategory(cat.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><Package className="h-2.5 w-2.5" /> Products</div>
                    <p className="font-mono font-bold text-lg">{stats.count}</p>
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><DollarSign className="h-2.5 w-2.5" /> Value</div>
                    <p className="font-mono font-bold text-lg">${stats.totalValue.toLocaleString("en", { maximumFractionDigits: 0 })}</p>
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><TrendingUp className="h-2.5 w-2.5" /> Avg Margin</div>
                    <p className="font-mono font-bold">{stats.avgMargin.toFixed(1)}%</p>
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><AlertTriangle className="h-2.5 w-2.5" /> Low/Out</div>
                    <p className="font-mono font-bold">
                      {stats.lowStock > 0 ? (
                        <span className="text-warning">{stats.lowStock}</span>
                      ) : (
                        <span className="text-success">0</span>
                      )}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                    <span>Share of inventory</span>
                    <span className="font-mono">{pct.toFixed(0)}%</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>

                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-[10px]">{stats.totalQty} units</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {categoriesList.length === 0 && (
        <div className="py-16 text-center text-muted-foreground">No categories yet.</div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader><DialogTitle className="font-mono">{editing?.id ? "Edit Category" : "Add Category"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Name</Label>
                <Input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Description</Label>
                <Textarea value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={2} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Color (HSL values, e.g. "38 92% 50%")</Label>
                <Input value={editing.color || ""} onChange={(e) => setEditing({ ...editing, color: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
