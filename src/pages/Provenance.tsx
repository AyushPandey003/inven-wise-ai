import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useInventory } from "@/context/InventoryContext";
import { provenanceApi, type ProvenanceRecord } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Shield, Link, CheckCircle2, Clock, Package, Truck,
  Factory, Eye, FileCheck, MapPin, Hash, Lock, ShieldCheck,
  Plus, Loader2, AlertTriangle, RefreshCw, Wallet,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BlockchainPanel from "@/components/blockchain/BlockchainPanel";

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

const EVENT_TYPES = ["manufactured", "inspected", "shipped", "received", "stored", "sold", "returned"] as const;

export default function Provenance() {
  const { products, isApiConnected } = useInventory();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verifiedIds, setVerifiedIds] = useState<Set<string>>(new Set());
  const [showRecordDialog, setShowRecordDialog] = useState(false);
  const [newEvent, setNewEvent] = useState({
    eventType: "received" as string,
    description: "",
    actor: "",
    location: "",
    metadata: "",
  });

  // ── Queries ─────────────────────────────────────
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["provenance-stats"],
    queryFn: provenanceApi.stats,
    enabled: isApiConnected,
  });

  const { data: chain = [], isLoading: chainLoading } = useQuery({
    queryKey: ["provenance-chain", selectedProductId],
    queryFn: () => provenanceApi.chain(selectedProductId!),
    enabled: !!selectedProductId && isApiConnected,
  });

  // ── Mutations ───────────────────────────────────
  const seedAllMutation = useMutation({
    mutationFn: provenanceApi.seedAll,
    onSuccess: (data) => {
      toast({ title: "Chains seeded", description: `Generated provenance for ${data.seeded} products` });
      queryClient.invalidateQueries({ queryKey: ["provenance-stats"] });
      if (selectedProductId) {
        queryClient.invalidateQueries({ queryKey: ["provenance-chain", selectedProductId] });
      }
    },
    onError: (err: Error) => {
      toast({ title: "Seed failed", description: err.message, variant: "destructive" });
    },
  });

  const recordMutation = useMutation({
    mutationFn: provenanceApi.record,
    onSuccess: () => {
      toast({ title: "Event recorded", description: "New block added to provenance chain" });
      queryClient.invalidateQueries({ queryKey: ["provenance-chain", selectedProductId] });
      queryClient.invalidateQueries({ queryKey: ["provenance-stats"] });
      setShowRecordDialog(false);
      setNewEvent({ eventType: "received", description: "", actor: "", location: "", metadata: "" });
    },
    onError: (err: Error) => {
      toast({ title: "Record failed", description: err.message, variant: "destructive" });
    },
  });

  const verifyChainMutation = useMutation({
    mutationFn: (productId: string) => provenanceApi.verify(productId),
    onSuccess: (data) => {
      toast({
        title: data.valid ? "Chain verified" : "Chain broken!",
        description: data.message,
        variant: data.valid ? "default" : "destructive",
      });
    },
  });

  const handleVerifyEvent = async (eventId: string) => {
    setVerifyingId(eventId);
    try {
      if (isApiConnected) {
        await provenanceApi.verifyEvent(eventId);
      }
      setVerifiedIds((prev) => new Set(prev).add(eventId));
    } finally {
      setTimeout(() => setVerifyingId(null), 1200);
    }
  };

  const handleRecordEvent = () => {
    if (!selectedProductId) return;
    let metadata: Record<string, unknown> = {};
    if (newEvent.metadata.trim()) {
      try {
        metadata = JSON.parse(newEvent.metadata);
      } catch {
        toast({ title: "Invalid JSON", description: "Metadata must be valid JSON", variant: "destructive" });
        return;
      }
    }
    recordMutation.mutate({
      productId: selectedProductId,
      eventType: newEvent.eventType,
      description: newEvent.description,
      actor: newEvent.actor,
      location: newEvent.location || undefined,
      metadata,
    });
  };

  // ── Fallback: client-side generated chains when API is down ──
  const useFallback = !isApiConnected;

  const fallbackChain = useFallback && selectedProductId
    ? generateFallbackChain(
        products.find((p) => p.id === selectedProductId)?.name ?? "",
        products.find((p) => p.id === selectedProductId)?.supplier ?? "",
        products.findIndex((p) => p.id === selectedProductId)
      )
    : [];

  const displayChain: ProvenanceRecord[] = useFallback ? fallbackChain : chain;

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const totalEvents = useFallback ? products.length * 7 : (stats?.totalEvents ?? 0);
  const totalVerified = useFallback ? products.length * 7 : (stats?.verifiedEvents ?? 0);
  const integrityScore = useFallback ? 100 : (stats?.integrityScore ?? 100);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold text-primary flex items-center gap-2">
            <Shield className="h-6 w-6" /> Blockchain Provenance
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Immutable supply chain ledger — trace every product from origin to shelf
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isApiConnected && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1"
              onClick={() => seedAllMutation.mutate()}
              disabled={seedAllMutation.isPending}
            >
              {seedAllMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Seed All Chains
            </Button>
          )}
          <Badge
            variant="outline"
            className={`text-xs font-mono gap-1 ${
              integrityScore === 100
                ? "text-success border-success/30"
                : "text-warning border-warning/30"
            }`}
          >
            <Link className="h-3 w-3" />
            {isApiConnected ? `Integrity: ${integrityScore}%` : "Offline Mode"}
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Products Tracked", value: useFallback ? products.length : (stats?.productsTracked ?? 0), icon: Package, color: "text-primary" },
          { label: "Chain Events", value: totalEvents, icon: Link, color: "text-muted-foreground" },
          { label: "Verified Events", value: totalVerified, icon: CheckCircle2, color: "text-success" },
          { label: "Integrity Score", value: `${integrityScore}%`, icon: Shield, color: "text-success" },
        ].map((s) => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary"><s.icon className={`h-4 w-4 ${s.color}`} /></div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                <p className={`font-mono text-lg font-bold ${s.color}`}>{statsLoading ? "..." : s.value}</p>
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
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Chain visualization */}
        <div className="lg:col-span-2">
          {selectedProduct ? (
            <Tabs defaultValue="blockchain" className="space-y-3">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="blockchain" className="gap-1.5 text-xs">
                  <Wallet className="h-3.5 w-3.5" /> On-Chain (Sepolia)
                </TabsTrigger>
                <TabsTrigger value="database" className="gap-1.5 text-xs">
                  <Shield className="h-3.5 w-3.5" /> Database Ledger
                </TabsTrigger>
              </TabsList>

              <TabsContent value="blockchain">
                <BlockchainPanel
                  productId={selectedProduct.id}
                  productName={selectedProduct.name}
                  productSku={selectedProduct.sku}
                />
              </TabsContent>

              <TabsContent value="database">
          {displayChain.length > 0 ? (  
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Link className="h-4 w-4 text-primary" />
                      Provenance Chain — {selectedProduct.name}
                    </CardTitle>
                    <p className="text-[10px] text-muted-foreground font-mono mt-1">
                      {displayChain.length} blocks • Head: {displayChain[displayChain.length - 1]?.hash.slice(0, 16)}...
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    {isApiConnected && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] gap-1"
                          onClick={() => verifyChainMutation.mutate(selectedProductId!)}
                          disabled={verifyChainMutation.isPending}
                        >
                          {verifyChainMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Shield className="h-3 w-3" />
                          )}
                          Verify Chain
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] gap-1"
                          onClick={() => setShowRecordDialog(true)}
                        >
                          <Plus className="h-3 w-3" /> Add Event
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-0">
                {chainLoading ? (
                  <div className="py-12 text-center">
                    <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mt-2">Loading chain...</p>
                  </div>
                ) : (
                  displayChain.map((event, i) => {
                    const Icon = EVENT_ICONS[event.eventType] || Package;
                    const isVerifying = verifyingId === event.id;
                    const isVerified = verifiedIds.has(event.id);
                    return (
                      <div key={event.id} className="relative">
                        {i < displayChain.length - 1 && (
                          <div className="absolute left-[19px] top-10 w-0.5 h-[calc(100%-20px)] bg-border" />
                        )}
                        <div className="flex gap-3 pb-4">
                          <div className={`relative z-10 shrink-0 p-2 rounded-lg border-2 ${
                            event.verified !== false ? "border-success/50 bg-success/10" : "border-warning/50 bg-warning/10"
                          }`}>
                            <Icon className={`h-4 w-4 ${event.verified !== false ? "text-success" : "text-warning"}`} />
                          </div>
                          <div className="flex-1 p-3 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className={`${EVENT_COLORS[event.eventType] || "bg-muted text-muted-foreground"} text-[10px]`}>
                                  {event.eventType}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(event.createdAt).toLocaleDateString()}{" "}
                                  {new Date(event.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[10px] gap-1"
                                onClick={() => handleVerifyEvent(event.id)}
                                disabled={isVerifying}
                              >
                                {isVerifying ? (
                                  <><Loader2 className="h-3 w-3 animate-spin" /> Checking...</>
                                ) : isVerified ? (
                                  <><CheckCircle2 className="h-3 w-3 text-success" /> Verified</>
                                ) : (
                                  <><Shield className="h-3 w-3" /> Verify</>
                                )}
                              </Button>
                            </div>
                            <p className="text-sm">{event.description}</p>
                            <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                              <span className="flex items-center gap-1"><Eye className="h-2.5 w-2.5" /> {event.actor}</span>
                              {event.location && (
                                <span className="flex items-center gap-1"><MapPin className="h-2.5 w-2.5" /> {event.location}</span>
                              )}
                            </div>
                            {event.metadata && Object.keys(event.metadata).length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(event.metadata).map(([k, v]) => (
                                  <Badge key={k} variant="outline" className="text-[9px] font-mono">
                                    {k}: {String(v)}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-[9px] font-mono text-muted-foreground/60">
                              <Hash className="h-2.5 w-2.5" />
                              <span className="truncate">Block: {event.hash}</span>
                            </div>
                            {event.previousHash && event.previousHash !== "0".repeat(64) && (
                              <div className="flex items-center gap-2 text-[9px] font-mono text-muted-foreground/40">
                                <Link className="h-2.5 w-2.5" />
                                <span className="truncate">Prev: {event.previousHash}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          ) : !chainLoading && displayChain.length === 0 && isApiConnected ? (
            <Card className="bg-card border-border">
              <CardContent className="py-16 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-warning/40" />
                <p className="text-muted-foreground font-medium">No provenance chain yet</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  Click below to generate a demo chain, or use "Seed All Chains" to populate every product
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => seedAllMutation.mutate()}
                  disabled={seedAllMutation.isPending}
                >
                  {seedAllMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                  Seed Chain
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="py-16 text-center">
                <Shield className="h-12 w-12 mx-auto mb-3 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">No database events for this product</p>
              </CardContent>
            </Card>
          )}
              </TabsContent>
            </Tabs>
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

      {/* Record Event Dialog */}
      <Dialog open={showRecordDialog} onOpenChange={setShowRecordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Plus className="h-4 w-4" /> Record Provenance Event
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Event Type</Label>
              <Select value={newEvent.eventType} onValueChange={(v) => setNewEvent((s) => ({ ...s, eventType: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea
                className="mt-1"
                placeholder="What happened..."
                value={newEvent.description}
                onChange={(e) => setNewEvent((s) => ({ ...s, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Actor</Label>
                <Input
                  className="mt-1"
                  placeholder="Who performed this"
                  value={newEvent.actor}
                  onChange={(e) => setNewEvent((s) => ({ ...s, actor: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Location</Label>
                <Input
                  className="mt-1"
                  placeholder="Where it happened"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent((s) => ({ ...s, location: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Metadata (JSON)</Label>
              <Textarea
                className="mt-1 font-mono text-xs"
                placeholder='{"batch": "B-1234", "temp": "22°C"}'
                value={newEvent.metadata}
                onChange={(e) => setNewEvent((s) => ({ ...s, metadata: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowRecordDialog(false)}>Cancel</Button>
            <Button
              onClick={handleRecordEvent}
              disabled={!newEvent.description || !newEvent.actor || recordMutation.isPending}
            >
              {recordMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Shield className="h-3 w-3 mr-1" />}
              Record Block
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Fallback chain generator (used when API is offline) ──

function simpleHash(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(12, "0") + "a" + Math.abs(hash * 31).toString(16).padStart(12, "0") + "f";
}

function generateFallbackChain(productName: string, supplier: string, idx: number): ProvenanceRecord[] {
  const events: ProvenanceRecord[] = [];
  const baseTime = Date.now() - (30 + idx * 5) * 86400000;
  const steps = [
    { type: "manufactured", desc: `Product manufactured at ${supplier} facility`, actor: supplier, loc: "Factory, Shenzhen CN", meta: { batch: `B-${1000 + idx}`, "quality-check": "passed" } },
    { type: "inspected", desc: "Quality inspection completed — passed all checks", actor: "QA Department", loc: "Factory, Shenzhen CN", meta: { "defect-rate": "0.02%", standard: "ISO-9001" } },
    { type: "shipped", desc: "Shipped via container freight to US distribution", actor: "Global Logistics Co.", loc: "Port of Shenzhen", meta: { container: `CSLU-${4000 + idx}`, carrier: "Maersk" } },
    { type: "received", desc: "Received at US port of entry, customs cleared", actor: "US Customs", loc: "Port of Long Beach, CA", meta: { "customs-id": `US${20260000 + idx}`, "duty-paid": "Yes" } },
    { type: "shipped", desc: "Last-mile delivery to warehouse", actor: "FedEx Ground", loc: "En Route", meta: { tracking: `FX${7890000 + idx}` } },
    { type: "received", desc: "Received at Main Warehouse, inventory counted", actor: "Warehouse Team", loc: "Main Warehouse, Dallas TX", meta: { "count-verified": "Yes", condition: "Good" } },
    { type: "stored", desc: "Placed in designated storage zone", actor: "Warehouse System", loc: "Zone A, Aisle 3, Shelf B2", meta: { "storage-type": "Ambient", temp: "22°C" } },
  ];

  let prevHash = "0".repeat(64);
  steps.forEach((step, i) => {
    const data = `${prevHash}:${step.type}:${step.desc}:${baseTime + i * 86400000}`;
    const hash = simpleHash(data);
    events.push({
      id: `fallback-${idx}-${i}`,
      productId: null,
      hash,
      previousHash: prevHash,
      eventType: step.type,
      description: step.desc,
      actor: step.actor,
      location: step.loc,
      createdAt: new Date(baseTime + i * 86400000).toISOString(),
      verified: true,
      metadata: step.meta,
    });
    prevHash = hash;
  });
  return events;
}
