import { useState } from "react";
import { useInventory } from "@/context/InventoryContext";
import { Supplier } from "@/context/InventoryContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Plus, Pencil, Trash2, Star, Phone, Mail, MapPin, Clock, Package } from "lucide-react";
import { toast } from "sonner";

const emptySupplier: Omit<Supplier, "id" | "createdAt"> = {
  name: "", contactName: "", email: "", phone: "", address: "", leadTimeDays: 7, rating: 3, productsSupplied: [], notes: "",
};

export default function Suppliers() {
  const { suppliers, products, addSupplier, updateSupplier, deleteSupplier } = useInventory();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Supplier> | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.contactName.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = () => {
    if (!editing?.name) { toast.error("Supplier name required"); return; }
    if (editing.id) {
      updateSupplier(editing as Supplier);
    } else {
      addSupplier(editing as Omit<Supplier, "id" | "createdAt">);
    }
    setDialogOpen(false);
    setEditing(null);
  };

  const getSupplierProducts = (s: Supplier) =>
    products.filter((p) => p.supplier === s.name);

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`h-3.5 w-3.5 ${i < rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
    ));

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-2xl font-bold text-primary">Suppliers</h1>
          <p className="text-xs text-muted-foreground mt-1">{suppliers.length} suppliers managed</p>
        </div>
        <Button onClick={() => { setEditing({ ...emptySupplier }); setDialogOpen(true); }} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Supplier
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((s) => {
          const supplierProducts = getSupplierProducts(s);
          const expanded = expandedId === s.id;
          return (
            <Card key={s.id} className="bg-card border-border hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setExpandedId(expanded ? null : s.id)}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="font-mono text-base">{s.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.contactName}</p>
                  </div>
                  <div className="flex gap-0.5">{renderStars(s.rating)}</div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Mail className="h-3 w-3 shrink-0" /><span className="truncate">{s.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="h-3 w-3 shrink-0" /><span className="truncate">{s.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                    <MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{s.address}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Clock className="h-2.5 w-2.5" />{s.leadTimeDays}d lead
                  </Badge>
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Package className="h-2.5 w-2.5" />{supplierProducts.length} products
                  </Badge>
                </div>

                {expanded && (
                  <div className="pt-2 border-t border-border space-y-2 animate-in fade-in duration-200">
                    {s.notes && <p className="text-xs text-muted-foreground italic">{s.notes}</p>}
                    {supplierProducts.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Products</p>
                        <div className="flex flex-wrap gap-1">
                          {supplierProducts.map((p) => (
                            <Badge key={p.id} variant="secondary" className="text-[10px]">{p.name}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-1 pt-1">
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); setEditing({ ...s }); setDialogOpen(true); }}>
                        <Pencil className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); deleteSupplier(s.id); }}>
                        <Trash2 className="h-3 w-3 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center text-muted-foreground">No suppliers found.</div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle className="font-mono">{editing?.id ? "Edit Supplier" : "Add Supplier"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">Company Name</Label>
                <Input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Contact Name</Label>
                <Input value={editing.contactName || ""} onChange={(e) => setEditing({ ...editing, contactName: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input value={editing.email || ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Phone</Label>
                <Input value={editing.phone || ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Lead Time (days)</Label>
                <Input type="number" value={editing.leadTimeDays ?? 7} onChange={(e) => setEditing({ ...editing, leadTimeDays: Number(e.target.value) })} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">Address</Label>
                <Input value={editing.address || ""} onChange={(e) => setEditing({ ...editing, address: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Rating (1-5)</Label>
                <Input type="number" min={1} max={5} value={editing.rating ?? 3} onChange={(e) => setEditing({ ...editing, rating: Math.min(5, Math.max(1, Number(e.target.value))) })} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <Textarea value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} rows={2} />
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
