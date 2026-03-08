import { Product } from "@/context/InventoryContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Package, Trash2, ArrowUpDown, Eye } from "lucide-react";

const statusBadge = (status: string) => {
  switch (status) {
    case "in-stock": return <Badge className="bg-success/20 text-success border-success/30">In Stock</Badge>;
    case "low": return <Badge className="bg-warning/20 text-warning border-warning/30 animate-pulse">Low Stock</Badge>;
    case "out": return <Badge className="bg-danger/20 text-danger border-danger/30">Out of Stock</Badge>;
    default: return null;
  }
};

interface Props {
  products: Product[];
  selected: Set<string>;
  sortKey: keyof Product;
  sortDir: "asc" | "desc";
  onToggleSort: (key: keyof Product) => void;
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
  onEdit: (p: Product) => void;
  onRestock: (id: string, suggestedQty: number) => void;
  onDelete: (ids: string[]) => void;
  onViewDetail: (p: Product) => void;
}

export function InventoryTable({ products, selected, sortKey, sortDir, onToggleSort, onToggleSelect, onToggleAll, onEdit, onRestock, onDelete, onViewDetail }: Props) {
  const SortHeader = ({ label, field }: { label: string; field: keyof Product }) => (
    <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => onToggleSort(field)}>
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortKey === field ? "text-primary" : ""}`} />
      </span>
    </th>
  );

  return (
    <div className="rounded-lg border border-border overflow-auto">
      <table className="w-full text-sm">
        <thead className="bg-secondary/80">
          <tr>
            <th className="px-3 py-2.5 w-8">
              <input type="checkbox" checked={selected.size === products.length && products.length > 0} onChange={onToggleAll} className="accent-primary rounded" />
            </th>
            <SortHeader label="SKU" field="sku" />
            <SortHeader label="Product" field="name" />
            <SortHeader label="Category" field="category" />
            <SortHeader label="Qty" field="quantity" />
            <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Reorder Pt</th>
            <SortHeader label="Unit Cost" field="unitCost" />
            <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Total Value</th>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, idx) => (
            <tr
              key={p.id}
              className={`border-t border-border hover:bg-secondary/40 transition-colors ${selected.has(p.id) ? "bg-primary/5" : ""}`}
              style={{ animationDelay: `${idx * 20}ms` }}
            >
              <td className="px-3 py-2.5"><input type="checkbox" checked={selected.has(p.id)} onChange={() => onToggleSelect(p.id)} className="accent-primary rounded" /></td>
              <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{p.sku}</td>
              <td className="px-3 py-2.5 font-medium max-w-48 truncate">{p.name}</td>
              <td className="px-3 py-2.5 text-muted-foreground text-xs">{p.category}</td>
              <td className="px-3 py-2.5">
                <span className={`font-mono ${p.quantity === 0 ? "text-danger" : p.quantity <= p.reorderPoint ? "text-warning" : ""}`}>
                  {p.quantity}
                </span>
              </td>
              <td className="px-3 py-2.5 font-mono text-muted-foreground text-xs">{p.reorderPoint}</td>
              <td className="px-3 py-2.5 font-mono">${p.unitCost.toFixed(2)}</td>
              <td className="px-3 py-2.5 font-mono text-muted-foreground">${(p.quantity * p.unitCost).toLocaleString("en", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
              <td className="px-3 py-2.5">{statusBadge(p.status)}</td>
              <td className="px-3 py-2.5">
                <div className="flex gap-0.5">
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-primary" onClick={() => onViewDetail(p)} title="View details">
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-primary" onClick={() => onEdit(p)} title="Edit">
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-success" onClick={() => onRestock(p.id, Math.max(p.reorderPoint - p.quantity + 5, 10))} title="Restock">
                    <Package className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-danger" onClick={() => onDelete([p.id])} title="Delete">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {products.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">No products match your filters.</div>
      )}
    </div>
  );
}
