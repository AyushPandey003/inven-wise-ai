import { useState } from "react";
import { useInventory, Warehouse } from "@/context/InventoryContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Warehouse as WarehouseIcon, MapPin, Phone, User, Package, DollarSign } from "lucide-react";
import { toast } from "sonner";

const emptyWarehouse: Partial<Warehouse> = {
  name: "",
  address: "",
  city: "",
  state: "",
  country: "US",
  capacity: 1000,
  managerName: "",
  phone: "",
};

export default function Warehouses() {
  const { warehouses, addWarehouse, updateWarehouse, deleteWarehouse } = useInventory();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Warehouse> | null>(null);

  const handleSave = () => {
    if (!editing?.name) {
      toast.error("Warehouse name required");
      return;
    }
    if (editing.id) {
      updateWarehouse(editing as Warehouse);
    } else {
      addWarehouse(editing);
    }
    setDialogOpen(false);
    setEditing(null);
  };

  const totalCapacity = warehouses.reduce((s, w) => s + (w.capacity || 0), 0);
  const totalStock = warehouses.reduce((s, w) => s + (w.totalQuantity || 0), 0);
  const totalValue = warehouses.reduce((s, w) => s + (w.totalValue || 0), 0);

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-2xl font-bold text-primary">Warehouses</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {warehouses.length} locations • {totalStock.toLocaleString()} total units • ${totalValue.toLocaleString()} value
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing({ ...emptyWarehouse });
            setDialogOpen(true);
          }}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" /> Add Warehouse
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Locations", value: warehouses.length, icon: WarehouseIcon, color: "text-primary" },
          { label: "Total Capacity", value: totalCapacity.toLocaleString(), icon: Package, color: "text-muted-foreground" },
          { label: "Total Stock", value: totalStock.toLocaleString(), icon: Package, color: "text-success" },
          { label: "Total Value", value: `$${totalValue.toLocaleString()}`, icon: DollarSign, color: "text-primary" },
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

      {/* Warehouse cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {warehouses.map((w) => {
          const utilPct = w.utilizationPct || 0;
          return (
            <Card key={w.id} className="bg-card border-border hover:border-primary/30 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-primary/10">
                      <WarehouseIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="font-mono text-base">{w.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {w.city}, {w.state}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${w.isActive ? "border-success/30 text-success" : "border-danger/30 text-danger"}`}
                  >
                    {w.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{w.address}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="h-3 w-3 shrink-0" />
                    <span className="truncate">{w.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                    <User className="h-3 w-3 shrink-0" />
                    <span>Manager: {w.managerName || "Unassigned"}</span>
                  </div>
                </div>

                {/* Utilization */}
                <div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                    <span>Utilization</span>
                    <span className="font-mono">
                      {w.totalQuantity?.toLocaleString() || 0} / {w.capacity?.toLocaleString()} ({utilPct}%)
                    </span>
                  </div>
                  <Progress
                    value={utilPct}
                    className={`h-2 ${utilPct > 90 ? "[&>div]:bg-danger" : utilPct > 70 ? "[&>div]:bg-warning" : ""}`}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Package className="h-2.5 w-2.5" />
                    {w.productCount || 0} products
                  </Badge>
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <DollarSign className="h-2.5 w-2.5" />${(w.totalValue || 0).toLocaleString()}
                  </Badge>
                </div>

                <div className="flex gap-1 pt-1 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setEditing({ ...w });
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-3 w-3 mr-1" /> Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => deleteWarehouse(w.id)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {warehouses.length === 0 && (
        <Card className="bg-card border-border">
          <CardContent className="py-16 text-center">
            <WarehouseIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground">No warehouses configured yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Add your first warehouse to start tracking inventory locations.</p>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono">{editing?.id ? "Edit Warehouse" : "Add Warehouse"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">Warehouse Name</Label>
                <Input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">Address</Label>
                <Input value={editing.address || ""} onChange={(e) => setEditing({ ...editing, address: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">City</Label>
                <Input value={editing.city || ""} onChange={(e) => setEditing({ ...editing, city: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">State</Label>
                <Input value={editing.state || ""} onChange={(e) => setEditing({ ...editing, state: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Country</Label>
                <Input value={editing.country || "US"} onChange={(e) => setEditing({ ...editing, country: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Capacity (units)</Label>
                <Input
                  type="number"
                  value={editing.capacity ?? 1000}
                  onChange={(e) => setEditing({ ...editing, capacity: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Manager Name</Label>
                <Input
                  value={editing.managerName || ""}
                  onChange={(e) => setEditing({ ...editing, managerName: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Phone</Label>
                <Input value={editing.phone || ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
