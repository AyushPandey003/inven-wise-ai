import { useState, useMemo } from "react";
import { useInventory } from "@/context/InventoryContext";
import { StockEvent } from "@/data/inventory";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ArrowUpDown, ArrowUp, ArrowDown, RotateCcw, AlertTriangle, Truck, Package, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const PAGE_SIZE = 15;

const eventTypeConfig: Record<StockEvent["type"], { label: string; color: string; icon: typeof ArrowUp }> = {
  restock: { label: "Restock", color: "bg-success/20 text-success border-success/30", icon: ArrowUp },
  sale: { label: "Sale", color: "bg-primary/20 text-primary border-primary/30", icon: ArrowDown },
  adjustment: { label: "Adjustment", color: "bg-muted text-muted-foreground border-muted", icon: ArrowUpDown },
  return: { label: "Return", color: "bg-success/20 text-success border-success/30", icon: RotateCcw },
  damaged: { label: "Damaged", color: "bg-danger/20 text-danger border-danger/30", icon: AlertTriangle },
  transfer: { label: "Transfer", color: "bg-warning/20 text-warning border-warning/30", icon: Truck },
};

export default function StockHistory() {
  const { stockEvents } = useInventory();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    return stockEvents
      .filter((e) => {
        const matchSearch = e.productName.toLowerCase().includes(search.toLowerCase()) ||
          e.reason.toLowerCase().includes(search.toLowerCase()) ||
          e.performedBy.toLowerCase().includes(search.toLowerCase());
        const matchType = typeFilter === "all" || e.type === typeFilter;
        return matchSearch && matchType;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [stockEvents, search, typeFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const summaryStats = useMemo(() => {
    const totalIn = stockEvents.filter((e) => e.quantityChange > 0).reduce((s, e) => s + e.quantityChange, 0);
    const totalOut = stockEvents.filter((e) => e.quantityChange < 0).reduce((s, e) => s + Math.abs(e.quantityChange), 0);
    const damaged = stockEvents.filter((e) => e.type === "damaged").reduce((s, e) => s + Math.abs(e.quantityChange), 0);
    return { totalIn, totalOut, damaged, netChange: totalIn - totalOut };
  }, [stockEvents]);

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div>
        <h1 className="font-mono text-2xl font-bold text-primary">Stock History</h1>
        <p className="text-xs text-muted-foreground mt-1">Complete audit log of all inventory movements</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total In", value: `+${summaryStats.totalIn}`, color: "text-success" },
          { label: "Total Out", value: `-${summaryStats.totalOut}`, color: "text-danger" },
          { label: "Net Change", value: summaryStats.netChange >= 0 ? `+${summaryStats.netChange}` : `${summaryStats.netChange}`, color: summaryStats.netChange >= 0 ? "text-success" : "text-danger" },
          { label: "Damaged/Lost", value: `${summaryStats.damaged}`, color: "text-warning" },
        ].map((s) => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="pt-4 pb-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
              <p className={`font-mono text-xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search product, reason, or person..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Event type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(eventTypeConfig).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Events timeline */}
      <div className="space-y-2">
        {paged.map((event) => {
          const cfg = eventTypeConfig[event.type];
          const Icon = cfg.icon;
          return (
            <Card key={event.id} className="bg-card border-border hover:border-primary/20 transition-colors">
              <CardContent className="py-3 px-4 flex items-center gap-4">
                <div className={`p-2 rounded-lg ${event.quantityChange > 0 ? "bg-success/10" : "bg-danger/10"}`}>
                  <Icon className={`h-4 w-4 ${event.quantityChange > 0 ? "text-success" : "text-danger"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-medium">{event.productName}</span>
                    <Badge className={`${cfg.color} text-[10px]`}>{cfg.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{event.reason}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-mono font-bold text-sm ${event.quantityChange > 0 ? "text-success" : "text-danger"}`}>
                    {event.quantityChange > 0 ? "+" : ""}{event.quantityChange}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono">{event.previousQty} → {event.newQty}</p>
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  <p className="text-xs text-muted-foreground">{event.performedBy}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{format(new Date(event.timestamp), "MMM d, HH:mm")}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {paged.length === 0 && (
        <div className="py-16 text-center text-muted-foreground">No stock events match your filters.</div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground text-xs font-mono">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === totalPages - 1} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
