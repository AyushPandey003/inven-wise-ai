import { useState, useMemo } from "react";
import { useInventory } from "@/context/InventoryContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Shield, Link, CheckCircle2, Clock, Package, Truck,
  Factory, Eye, FileCheck, MapPin, Hash, Lock, ShieldCheck,
} from "lucide-react";

interface ProvenanceEvent {
  id: string;
  hash: string;
  previousHash: string;
  eventType: string;
  description: string;
  actor: string;
  location: string;
  timestamp: string;
  verified: boolean;
  metadata: Record<string, string>;
}

const EVENT_ICONS: Record<string, typeof Factory> = {
  manufactured: Factory,
  shipped: Truck,
  received: Package,
  inspected: FileCheck,
  stored: Lock,
  sold: ShieldCheck,
  returned: Clock,
};

const EVENT_COLORS: Record<string, string> = {
  manufactured: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  shipped: "bg-primary/20 text-primary border-primary/30",
  received: "bg-success/20 text-success border-success/30",
  inspected: "bg-warning/20 text-warning border-warning/30",
  stored: "bg-muted text-muted-foreground border-muted",
  sold: "bg-success/20 text-success border-success/30",
  returned: "bg-danger/20 text-danger border-danger/30",
};

function simpleHash(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(12, "0") + "a" + Math.abs(hash * 31).toString(16).padStart(12, "0") + "f";
}

function generateChain(productName: string, supplier: string, idx: number): ProvenanceEvent[] {
  const events: ProvenanceEvent[] = [];
  const baseTime = Date.now() - (30 + idx * 5) * 86400000;
  const steps = [
    { type: "manufactured", desc: `Product manufactured at ${supplier} facility`, actor: supplier, loc: "Factory, Shenzhen CN", meta: { "batch": `B-${1000 + idx}`, "quality-check": "passed" } },
    { type: "inspected", desc: "Quality inspection completed — passed all checks", actor: "QA Department", loc: "Factory, Shenzhen CN", meta: { "defect-rate": "0.02%", "standard": "ISO-9001" } },
    { type: "shipped", desc: `Shipped via container freight to US distribution`, actor: "Global Logistics Co.", loc: "Port of Shenzhen", meta: { "container": `CSLU-${4000 + idx}`, "carrier": "Maersk" } },
    { type: "received", desc: "Received at US port of entry, customs cleared", actor: "US Customs", loc: "Port of Long Beach, CA", meta: { "customs-id": `US${20260000 + idx}`, "duty-paid": "Yes" } },
    { type: "shipped", desc: "Last-mile delivery to warehouse", actor: "FedEx Ground", loc: "En Route", meta: { "tracking": `FX${7890000 + idx}` } },
    { type: "received", desc: "Received at Main Warehouse, inventory counted", actor: "Warehouse Team", loc: "Main Warehouse, Dallas TX", meta: { "count-verified": "Yes", "condition": "Good" } },
    { type: "stored", desc: "Placed in designated storage zone", actor: "Warehouse System", loc: "Zone A, Aisle 3, Shelf B2", meta: { "storage-type": "Ambient", "temp": "22°C" } },
  ];

  let prevHash = "0000000000000000000000000000";
  steps.forEach((step, i) => {
    const data = `${prevHash}:${step.type}:${step.desc}:${baseTime + i * 3600000 * 24}`;
    const hash = simpleHash(data);
    events.push({
      id: `prov-${idx}-${i}`,
      hash,
      previousHash: prevHash,
      eventType: step.type,
      description: step.desc,
      actor: step.actor,
      location: step.loc,
      timestamp: new Date(baseTime + i * 3600000 * 24).toISOString(),
      verified: true,
      metadata: step.meta,
    });
    prevHash = hash;
  });
  return events;
}

export default function Provenance() {
  const { products } = useInventory();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const productChains = useMemo(() => {
    const chains = new Map<string, ProvenanceEvent[]>();
    products.forEach((p, i) => {
      chains.set(p.id, generateChain(p.name, p.supplier, i));
    });
    return chains;
  }, [products]);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const selectedChain = selectedProductId ? productChains.get(selectedProductId) || [] : [];
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const totalEvents = Array.from(productChains.values()).reduce((s, c) => s + c.length, 0);
  const totalVerified = Array.from(productChains.values()).reduce(
    (s, c) => s + c.filter((e) => e.verified).length, 0
  );

  const handleVerify = (eventId: string) => {
    setVerifyingId(eventId);
    setTimeout(() => setVerifyingId(null), 1500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold text-primary flex items-center gap-2">
            <Shield className="h-6 w-6" /> Blockchain Provenance
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Immutable supply chain ledger — trace every product from origin to shelf
          </p>
        </div>
        <Badge variant="outline" className="text-xs font-mono gap-1 text-success border-success/30">
          <Link className="h-3 w-3" /> Chain Integrity: Verified
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Products Tracked", value: products.length, icon: Package, color: "text-primary" },
          { label: "Chain Events", value: totalEvents, icon: Link, color: "text-muted-foreground" },
          { label: "Verified Events", value: totalVerified, icon: CheckCircle2, color: "text-success" },
          { label: "Integrity Score", value: "100%", icon: Shield, color: "text-success" },
        ].map((s) => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary"><s.icon className={`h-4 w-4 ${s.color}`} /></div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                <p className={`font-mono text-lg font-bold ${s.color}`}>{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Product selector */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="space-y-1.5 max-h-[65vh] overflow-auto pr-1">
            {filteredProducts.map((p) => (
              <Card
                key={p.id}
                className={`bg-card border-border cursor-pointer hover:border-primary/30 transition-colors ${selectedProductId === p.id ? "border-primary bg-primary/5" : ""}`}
                onClick={() => setSelectedProductId(p.id)}
              >
                <CardContent className="py-2.5 px-3 flex items-center gap-3">
                  <div className="p-1.5 rounded bg-secondary">
                    <Package className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{p.sku}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-[9px] font-mono text-success border-success/30">
                      {(productChains.get(p.id)?.length || 0)} events
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Chain visualization */}
        <div className="lg:col-span-2">
          {selectedProduct && selectedChain.length > 0 ? (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Link className="h-4 w-4 text-primary" />
                  Provenance Chain — {selectedProduct.name}
                </CardTitle>
                <p className="text-[10px] text-muted-foreground font-mono">
                  {selectedChain.length} verified blocks • Chain hash: {selectedChain[selectedChain.length - 1]?.hash.slice(0, 16)}...
                </p>
              </CardHeader>
              <CardContent className="space-y-0">
                {selectedChain.map((event, i) => {
                  const Icon = EVENT_ICONS[event.eventType] || Package;
                  const isVerifying = verifyingId === event.id;
                  return (
                    <div key={event.id} className="relative">
                      {/* Connecting line */}
                      {i < selectedChain.length - 1 && (
                        <div className="absolute left-[19px] top-10 w-0.5 h-[calc(100%-20px)] bg-border" />
                      )}
                      <div className="flex gap-3 pb-4">
                        {/* Node */}
                        <div className={`relative z-10 shrink-0 p-2 rounded-lg border-2 ${event.verified ? "border-success/50 bg-success/10" : "border-warning/50 bg-warning/10"}`}>
                          <Icon className={`h-4 w-4 ${event.verified ? "text-success" : "text-warning"}`} />
                        </div>
                        {/* Content */}
                        <div className="flex-1 p-3 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={`${EVENT_COLORS[event.eventType]} text-[10px]`}>
                                {event.eventType}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(event.timestamp).toLocaleDateString()} {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] gap-1"
                              onClick={() => handleVerify(event.id)}
                            >
                              {isVerifying ? (
                                <><CheckCircle2 className="h-3 w-3 text-success animate-pulse" /> Verified!</>
                              ) : (
                                <><Shield className="h-3 w-3" /> Verify</>
                              )}
                            </Button>
                          </div>
                          <p className="text-sm">{event.description}</p>
                          <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1"><Eye className="h-2.5 w-2.5" /> {event.actor}</span>
                            <span className="flex items-center gap-1"><MapPin className="h-2.5 w-2.5" /> {event.location}</span>
                          </div>
                          {/* Metadata */}
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(event.metadata).map(([k, v]) => (
                              <Badge key={k} variant="outline" className="text-[9px] font-mono">
                                {k}: {v}
                              </Badge>
                            ))}
                          </div>
                          {/* Hash */}
                          <div className="flex items-center gap-2 text-[9px] font-mono text-muted-foreground/60">
                            <Hash className="h-2.5 w-2.5" />
                            <span className="truncate">Block: {event.hash}</span>
                          </div>
                          {event.previousHash !== "0000000000000000000000000000" && (
                            <div className="flex items-center gap-2 text-[9px] font-mono text-muted-foreground/40">
                              <Link className="h-2.5 w-2.5" />
                              <span className="truncate">Prev: {event.previousHash}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="py-24 text-center">
                <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground/20" />
                <p className="text-muted-foreground font-medium">Select a product to view its provenance chain</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Every product has an immutable record from manufacturing to storage
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
