import { useState, useMemo } from "react";
import { useInventory } from "@/context/InventoryContext";
import { Product, categories } from "@/data/inventory";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search, Plus, Trash2, Download, Package, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { InventoryTable } from "@/components/inventory/InventoryTable";
import { ProductDetailSheet } from "@/components/inventory/ProductDetailSheet";

const PAGE_SIZE = 10;

const emptyProduct = {
  sku: "", name: "", category: "Electronics", quantity: 0, reorderPoint: 10, unitCost: 0, sellingPrice: 0, supplier: "",
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
  const [page, setPage] = useState(0);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

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

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = (key: keyof Product) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleAll = () => {
    if (selected.size === paged.length) setSelected(new Set());
    else setSelected(new Set(paged.map((p) => p.id)));
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

  const handleRestock = (id: string, suggestedQty: number) => {
    setRestockDialog(id);
    setRestockQty(suggestedQty);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-2xl font-bold text-primary">Inventory</h1>
          <p className="text-xs text-muted-foreground mt-1">{filtered.length} products • ${products.reduce((s, p) => s + p.quantity * p.unitCost, 0).toLocaleString()} total value</p>
        </div>
        <Button onClick={() => { setEditingProduct({ ...emptyProduct }); setDialogOpen(true); }} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="flex flex-col sm:flex-row gap-3 pt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search SKU or name..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
          </div>
          <Select value={catFilter} onValueChange={(v) => { setCatFilter(v); setPage(0); }}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
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
        <div className="flex items-center gap-2 text-sm p-2 rounded-lg bg-primary/5 border border-primary/20">
          <span className="text-muted-foreground font-mono">{selected.size} selected</span>
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
      <InventoryTable
        products={paged}
        selected={selected}
        sortKey={sortKey}
        sortDir={sortDir}
        onToggleSort={toggleSort}
        onToggleSelect={toggleSelect}
        onToggleAll={toggleAll}
        onEdit={(p) => { setEditingProduct({ ...p }); setDialogOpen(true); }}
        onRestock={handleRestock}
        onDelete={(ids) => deleteProducts(ids)}
        onViewDetail={setDetailProduct}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground text-xs font-mono">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => (
              <Button key={i} variant={i === page ? "default" : "outline"} size="icon" className="h-8 w-8 text-xs" onClick={() => setPage(i)}>
                {i + 1}
              </Button>
            ))}
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Product Detail Sheet */}
      <ProductDetailSheet product={detailProduct} open={!!detailProduct} onClose={() => setDetailProduct(null)} />

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle className="font-mono">{editingProduct?.id ? "Edit Product" : "Add Product"}</DialogTitle></DialogHeader>
          {editingProduct && (
            <div className="grid grid-cols-2 gap-3">
              {([["sku", "SKU"], ["name", "Product Name"], ["supplier", "Supplier"]] as const).map(([key, label]) => (
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
              {([["quantity", "Quantity"], ["reorderPoint", "Reorder Point"], ["unitCost", "Unit Cost"], ["sellingPrice", "Selling Price"]] as const).map(([key, label]) => (
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
