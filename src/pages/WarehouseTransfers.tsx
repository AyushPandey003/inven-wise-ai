import { useState, useMemo } from "react";
import { useInventory, Warehouse } from "@/context/InventoryContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowRight,
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
  Package,
  TrendingUp,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";

interface Transfer {
  id: string;
  productId: string;
  productName: string;
  fromWarehouse: string;
  toWarehouse: string;
  quantity: number;
  status: "pending" | "in-transit" | "received" | "cancelled";
  reason: string;
  createdAt: string;
  expectedArrival?: string;
  actualArrival?: string;
}

export default function WarehouseTransferManager() {
  const { products, warehouses } = useInventory();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "in-transit" | "received">("all");

  // Form state
  const [selectedProduct, setSelectedProduct] = useState("");
  const [fromWarehouse, setFromWarehouse] = useState("");
  const [toWarehouse, setToWarehouse] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");

  // Available products in source warehouse
  const availableProducts = useMemo(() => {
    if (!fromWarehouse) return [];
    return products
      .filter(
        (p) => p.warehouseId === fromWarehouse || (p.warehouseId === "" && products.length === 0)
      )
      .map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        quantity: p.quantity,
      }));
  }, [fromWarehouse, products]);

  // Get max available quantity
  const maxQuantity = useMemo(() => {
    if (!selectedProduct) return 0;
    const product = products.find((p) => p.id === selectedProduct);
    return product?.quantity || 0;
  }, [selectedProduct, products]);

  // Filter transfers
  const filteredTransfers = useMemo(() => {
    if (filter === "all") return transfers;
    return transfers.filter((t) => t.status === filter);
  }, [transfers, filter]);

  // Warehouse recommendations for balancing
  const balancingRecommendations = useMemo(() => {
    const warehouseStats = warehouses
      .filter((w) => w.isActive !== false)
      .map((w) => {
        const warehouseProducts = products.filter((p) => p.warehouseId === w.id);
        const totalStock = warehouseProducts.reduce((sum, p) => sum + p.quantity, 0);
        const utilization = (totalStock / (w.capacity || 1)) * 100;
        return {
          id: w.id,
          name: w.name,
          totalStock,
          capacity: w.capacity || 1000,
          utilization,
          isOverloaded: utilization > 85,
          isUnderutilized: utilization < 40,
        };
      });

    const overloaded = warehouseStats.filter((w) => w.isOverloaded);
    const underutilized = warehouseStats.filter((w) => w.isUnderutilized);

    return overloaded.map((src) => {
      const target = underutilized[0];
      if (!target) return null;
      return {
        from: src,
        to: target,
        suggestion: `Transfer high-volume items from ${src.name} (${src.utilization.toFixed(0)}%) to ${target.name} (${target.utilization.toFixed(0)}%)`,
      };
    });
  }, [warehouses, products]);

  const handleCreateTransfer = () => {
    if (!selectedProduct || !fromWarehouse || !toWarehouse || !quantity) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (parseInt(quantity) <= 0 || parseInt(quantity) > maxQuantity) {
      toast.error("Invalid quantity");
      return;
    }

    if (fromWarehouse === toWarehouse) {
      toast.error("Source and destination must be different");
      return;
    }

    const product = products.find((p) => p.id === selectedProduct);
    const from = warehouses.find((w) => w.id === fromWarehouse);
    const to = warehouses.find((w) => w.id === toWarehouse);

    const newTransfer: Transfer = {
      id: `TRF-${Date.now()}`,
      productId: selectedProduct,
      productName: product?.name || "",
      fromWarehouse: from?.name || "",
      toWarehouse: to?.name || "",
      quantity: parseInt(quantity),
      status: "pending",
      reason: reason || "Inventory rebalancing",
      createdAt: new Date().toISOString(),
      expectedArrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    };

    setTransfers([newTransfer, ...transfers]);
    toast.success("Transfer created successfully");

    // Reset form
    setSelectedProduct("");
    setFromWarehouse("");
    setToWarehouse("");
    setQuantity("");
    setReason("");
    setDialogOpen(false);
  };

  const handleUpdateTransfer = (id: string, newStatus: Transfer["status"]) => {
    setTransfers(
      transfers.map((t) =>
        t.id === id
          ? {
              ...t,
              status: newStatus,
              ...(newStatus === "received" && { actualArrival: new Date().toISOString() }),
            }
          : t
      )
    );
    toast.success(`Transfer ${newStatus}`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "in-transit":
        return <TrendingUp className="h-4 w-4 text-blue-600" />;
      case "received":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold text-primary">Warehouse Transfers</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage inter-warehouse inventory movements
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Transfer
        </Button>
      </div>

      {/* Balancing Recommendations */}
      {balancingRecommendations.filter((r) => r).length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Optimization Recommendations</h3>
          {balancingRecommendations.map(
            (rec, idx) =>
              rec && (
                <Alert key={idx} className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-sm">
                    {rec.suggestion}
                  </AlertDescription>
                </Alert>
              )
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Pending",
            value: transfers.filter((t) => t.status === "pending").length,
            icon: Clock,
            color: "text-yellow-600",
          },
          {
            label: "In Transit",
            value: transfers.filter((t) => t.status === "in-transit").length,
            icon: ArrowRight,
            color: "text-blue-600",
          },
          {
            label: "Received",
            value: transfers.filter((t) => t.status === "received").length,
            icon: CheckCircle,
            color: "text-green-600",
          },
          {
            label: "Total Units",
            value: transfers.reduce((sum, t) => sum + t.quantity, 0),
            icon: Package,
            color: "text-primary",
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Transfers List */}
      <Card>
        <CardHeader>
          <CardTitle>Transfer History</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={filter} onValueChange={(v: any) => setFilter(v)}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="in-transit">In Transit</TabsTrigger>
              <TabsTrigger value="received">Received</TabsTrigger>
            </TabsList>

            <TabsContent value={filter} className="mt-0">
              {filteredTransfers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No transfers found
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransfers.map((transfer) => (
                        <TableRow key={transfer.id}>
                          <TableCell>
                            <div>
                              <p className="font-semibold text-sm">{transfer.productName}</p>
                              <p className="text-xs text-muted-foreground">{transfer.productId}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{transfer.fromWarehouse}</TableCell>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-1">
                              <ArrowRight className="h-3 w-3" />
                              {transfer.toWarehouse}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {transfer.quantity}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(transfer.status)}
                              <Badge
                                variant={
                                  transfer.status === "received"
                                    ? "secondary"
                                    : transfer.status === "pending"
                                    ? "outline"
                                    : "default"
                                }
                              >
                                {transfer.status}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {transfer.reason}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(transfer.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {transfer.status === "pending" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleUpdateTransfer(transfer.id, "in-transit")}
                              >
                                Ship
                              </Button>
                            )}
                            {transfer.status === "in-transit" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleUpdateTransfer(transfer.id, "received")}
                              >
                                Receive
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create Transfer Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Transfer</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Source Warehouse *</Label>
              <Select value={fromWarehouse} onValueChange={setFromWarehouse}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses
                    .filter((w) => w.isActive !== false)
                    .map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Product *</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {availableProducts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} (Qty: {p.quantity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Destination Warehouse *</Label>
              <Select value={toWarehouse} onValueChange={setToWarehouse}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses
                    .filter((w) => w.isActive !== false && w.id !== fromWarehouse)
                    .map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>
                Quantity * (Max: {maxQuantity})
              </Label>
              <Input
                type="number"
                min="1"
                max={maxQuantity}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
              />
            </div>

            <div>
              <Label>Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inventory rebalancing">Inventory Rebalancing</SelectItem>
                  <SelectItem value="Demand redistribution">Demand Redistribution</SelectItem>
                  <SelectItem value="Warehouse consolidation">Warehouse Consolidation</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Optimization">Optimization</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTransfer}>
              Create Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
