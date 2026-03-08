import { useState, useMemo } from "react";
import { useInventory } from "@/context/InventoryContext";
import { Product, categories } from "@/data/inventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search, Plus, Trash2, Download, Package, Pencil, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";

const statusBadge = (status: string) => {
  switch (status) {
    case "in-stock": return <Badge className="bg-success/20 text-success border-success/30">In Stock</Badge>;
    case "low": return <Badge className="bg-warning/20 text-warning border-warning/30">Low Stock</Badge>;
    case "out": return <Badge className="bg-danger/20 text-danger border-danger/30">Out of Stock</Badge>;
    default: return null;
  }
};

const emptyProduct = {
  sku: "", name: "", category: "Electronics", quantity: 0, reorderPoint: 10, unitCost: 0, supplier: "",
};

export default function Inventory() {
  const { products, addProduct, updateProduct, deleteProducts, restockProduct } = useInventory();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<keyof Product>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [restockDialog, setRestockDialog] = useState<string | null>(null);
  const [restockQty, setRestockQty] = useState(10);

  const filtered = useMemo(() => {
    let res = products.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
      const matchCat = catFilter === "all" || p.category === catFilter;
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      return matchSearch && matchCat && matchStatus;
    });
    res.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const cmp = typeof av === "number" ? av - (bv as number) : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return res;
  }, [products, search, catFilter, statusFilter, sortKey, sortDir]);

  const toggleSort = (key: keyof Product) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((p) => p.id)));
  };

  const handleSave = () => {
    if (!editingProduct?.name || !editingProduct?.sku) { toast.error("Name and SKU required"); return; }
    if (editingProduct.id) {
      updateProduct(editingProduct as Product);
    } else {
      addProduct(editingProduct as any);
    }
    setDialogOpen(false);
    setEditingProduct(null);
  };

  const exportCSV = () => {
    const items = selected.size > 0 ? products.filter((p) => selected.has(p.id)) : filtered;
    const header = "SKU,Name,Category,Quantity,Reorder Point,Unit Cost,Supplier,Status\n";
    const rows = items.map((p) => `${p.sku},${p.name},${p.category},${p.quantity},${p.reorderPoint},${p.unitCost},${p.supplier},${p.status}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "inventory.csv"; a.click();
    toast.success("CSV exported");
  };

  const SortHeader = ({ label, field }: { label: string; field: keyof Product }) => (
    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort(field)}>
      <span className="inline-flex items-center gap-1">{label} <ArrowUpDown className="h-3 w-3" /></span>
    </th>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="font-mono text-2xl font-bold text-primary">Inventory</h1>
        <Button onClick={() => { setEditingProduct({ ...emptyProduct }); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Product
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="flex flex-col sm:flex-row gap-3 pt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search SKU or name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="in-stock">In Stock</SelectItem>
              <SelectItem value="low">Low Stock</SelectItem>
              <SelectItem value="out">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{selected.size} selected</span>
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-3 w-3 mr-1" /> Export</Button>
          <Button variant="destructive" size="sm" onClick={() => { deleteProducts([...selected]); setSelected(new Set()); }}>
            <Trash2 className="h-3 w-3 mr-1" /> Delete
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            selected.forEach((id) => restockProduct(id, 20));
            setSelected(new Set());
          }}>
            <Package className="h-3 w-3 mr-1" /> Restock +20
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="px-3 py-2 w-8">
                <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} className="accent-primary" />
              </th>
              <SortHeader label="SKU" field="sku" />
              <SortHeader label="Product" field="name" />
              <SortHeader label="Category" field="category" />
              <SortHeader label="Qty" field="quantity" />
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Reorder Pt</th>
              <SortHeader label="Unit Cost" field="unitCost" />
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Total Value</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Status</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-t border-border hover:bg-secondary/50 transition-colors">
                <td className="px-3 py-2"><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} className="accent-primary" /></td>
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{p.sku}</td>
                <td className="px-3 py-2 font-medium max-w-48 truncate">{p.name}</td>
                <td className="px-3 py-2 text-muted-foreground">{p.category}</td>
                <td className="px-3 py-2 font-mono">{p.quantity}</td>
                <td className="px-3 py-2 font-mono text-muted-foreground">{p.reorderPoint}</td>
                <td className="px-3 py-2 font-mono">${p.unitCost.toFixed(2)}</td>
                <td className="px-3 py-2 font-mono">${(p.quantity * p.unitCost).toFixed(0)}</td>
                <td className="px-3 py-2">{statusBadge(p.status)}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingProduct({ ...p }); setDialogOpen(true); }}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setRestockDialog(p.id); setRestockQty(Math.max(p.reorderPoint - p.quantity + 5, 10)); }}>
                      <Package className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-danger" onClick={() => deleteProducts([p.id])}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">No products match your filters.</div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle className="font-mono">{editingProduct?.id ? "Edit Product" : "Add Product"}</DialogTitle></DialogHeader>
          {editingProduct && (
            <div className="grid grid-cols-2 gap-3">
              {([
                ["sku", "SKU"], ["name", "Product Name"], ["supplier", "Supplier"],
              ] as const).map(([key, label]) => (
                <div key={key} className={key === "name" ? "col-span-2" : ""}>
                  <Label className="text-xs text-muted-foreground">{label}</Label>
                  <Input value={(editingProduct as any)[key] || ""} onChange={(e) => setEditingProduct({ ...editingProduct, [key]: e.target.value })} />
                </div>
              ))}
              <div>
                <Label className="text-xs text-muted-foreground">Category</Label>
                <Select value={editingProduct.category || "Electronics"} onValueChange={(v) => setEditingProduct({ ...editingProduct, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {([
                ["quantity", "Quantity"], ["reorderPoint", "Reorder Point"], ["unitCost", "Unit Cost"],
              ] as const).map(([key, label]) => (
                <div key={key}>
                  <Label className="text-xs text-muted-foreground">{label}</Label>
                  <Input type="number" value={(editingProduct as any)[key] ?? 0} onChange={(e) => setEditingProduct({ ...editingProduct, [key]: Number(e.target.value) })} />
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restock Dialog */}
      <Dialog open={!!restockDialog} onOpenChange={() => setRestockDialog(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader><DialogTitle className="font-mono">Restock Product</DialogTitle></DialogHeader>
          <div>
            <Label className="text-xs text-muted-foreground">Quantity to add</Label>
            <Input type="number" value={restockQty} onChange={(e) => setRestockQty(Number(e.target.value))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestockDialog(null)}>Cancel</Button>
            <Button onClick={() => { if (restockDialog) restockProduct(restockDialog, restockQty); setRestockDialog(null); }}>Restock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
