/**
 * Blockchain provenance panel — shows on-chain data for a product.
 * Works alongside the existing DB-based provenance.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@/context/WalletContext";
import { useBlockchain, EVENT_TYPE_NAMES, type EventTypeName } from "@/hooks/useContract";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, Link, CheckCircle2, Clock, Package, Truck,
  Factory, FileCheck, MapPin, Hash, Lock, ShieldCheck,
  Plus, Loader2, ExternalLink, Wallet, AlertTriangle,
} from "lucide-react";

const EVENT_ICONS: Record<string, typeof Factory> = {
  Manufactured: Factory,
  Shipped: Truck,
  Received: Package,
  Inspected: FileCheck,
  Stored: Lock,
  Sold: ShieldCheck,
  Returned: Clock,
};

const EVENT_COLORS: Record<string, string> = {
  Manufactured: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Shipped: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Received: "bg-green-500/20 text-green-400 border-green-500/30",
  Inspected: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  Stored: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  Sold: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Returned: "bg-red-500/20 text-red-400 border-red-500/30",
};

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "";

interface Props {
  productId: string;
  productName: string;
  productSku: string;
}

export default function BlockchainPanel({ productId, productName, productSku }: Props) {
  const { isConnected, isCorrectNetwork, address, connect, switchToBaseSepolia } = useWallet();
  const blockchain = useBlockchain();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showRecordDialog, setShowRecordDialog] = useState(false);
  const [newEvent, setNewEvent] = useState({
    eventType: "Manufactured" as EventTypeName,
    location: "",
    metadataURI: "",
  });

  // Use SKU as on-chain product ID (cleaner than UUID)
  const onChainProductId = productSku;

  // ── Queries ─────────────────────────────────────────
  const {
    data: chainEvents = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["blockchain-chain", onChainProductId],
    queryFn: () => blockchain.getProductHistory(onChainProductId),
    enabled: blockchain.isReady,
    staleTime: 10_000,
  });

  const { data: verification } = useQuery({
    queryKey: ["blockchain-verify", onChainProductId],
    queryFn: () => blockchain.verifyChain(onChainProductId),
    enabled: blockchain.isReady && chainEvents.length > 0,
  });

  const { data: totalEvents } = useQuery({
    queryKey: ["blockchain-total"],
    queryFn: () => blockchain.getTotalEvents(),
    enabled: blockchain.isReady,
  });

  // ── Record event mutation ──────────────────────────
  const recordMutation = useMutation({
    mutationFn: async () => {
      return blockchain.recordEvent(
        onChainProductId,
        newEvent.eventType,
        newEvent.location,
        newEvent.metadataURI || ""
      );
    },
    onSuccess: (data) => {
      toast({
        title: "✅ Event recorded on-chain!",
        description: (
          <span className="font-mono text-xs">
            Tx:{" "}
            <a
              href={`https://sepolia.etherscan.io/tx/${data.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {data.txHash.slice(0, 20)}...
            </a>
          </span>
        ),
      });
      queryClient.invalidateQueries({ queryKey: ["blockchain-chain", onChainProductId] });
      queryClient.invalidateQueries({ queryKey: ["blockchain-total"] });
      queryClient.invalidateQueries({ queryKey: ["blockchain-verify", onChainProductId] });
      setShowRecordDialog(false);
      setNewEvent({ eventType: "Manufactured", location: "", metadataURI: "" });
    },
    onError: (err: Error) => {
      toast({
        title: "Transaction failed",
        description: err.message.includes("Unauthorized")
          ? "Your wallet is not authorized. Ask the contract owner to authorize you."
          : err.message,
        variant: "destructive",
      });
    },
  });

  // ── Not configured ─────────────────────────────────
  if (!CONTRACT_ADDRESS) {
    return (
      <Card className="border-dashed border-yellow-500/30">
        <CardContent className="py-8 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-yellow-500/50" />
          <p className="text-sm text-muted-foreground">Smart contract not deployed yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Set <code className="bg-muted px-1 rounded">VITE_CONTRACT_ADDRESS</code> after deploying
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Not connected ──────────────────────────────────
  if (!isConnected) {
    return (
      <Card className="border-dashed border-primary/30">
        <CardContent className="py-8 text-center">
          <Wallet className="h-8 w-8 mx-auto mb-2 text-primary/50" />
          <p className="text-sm text-muted-foreground">Connect wallet to view on-chain provenance</p>
          <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={connect}>
            <Wallet className="h-3.5 w-3.5" /> Connect MetaMask
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Wrong network ──────────────────────────────────
  if (!isCorrectNetwork) {
    return (
      <Card className="border-dashed border-red-500/30">
        <CardContent className="py-8 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-500/50" />
          <p className="text-sm text-muted-foreground">Please switch to Base Sepolia</p>
          <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={switchToBaseSepolia}>
            Switch Network
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                On-Chain Provenance (Sepolia) — {productName}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[10px] text-muted-foreground font-mono">
                  Product ID: {onChainProductId}
                </p>
                {verification && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      verification.valid
                        ? "text-green-400 border-green-500/30"
                        : "text-red-400 border-red-500/30"
                    }`}
                  >
                    {verification.valid ? (
                      <><CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Chain Valid</>
                    ) : (
                      <><AlertTriangle className="h-2.5 w-2.5 mr-1" /> Chain Broken</>
                    )}
                  </Badge>
                )}
                {totalEvents !== undefined && (
                  <Badge variant="secondary" className="text-[10px]">
                    {totalEvents} total on-chain events
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[10px] gap-1"
                onClick={() => setShowRecordDialog(true)}
                disabled={!blockchain.canWrite}
                title={!blockchain.canWrite ? "Connect wallet on Base Sepolia to record" : ""}
              >
                <Plus className="h-3 w-3" /> Record Event
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[10px] gap-1"
                asChild
              >
                <a
                  href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3 w-3" /> Etherscan
                </a>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">Loading from blockchain...</p>
            </div>
          ) : chainEvents.length === 0 ? (
            <div className="py-12 text-center">
              <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No on-chain events for this product yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Click "Record Event" to add the first blockchain entry
              </p>
            </div>
          ) : (
            <div className="space-y-0">
              {chainEvents.map((event, i) => {
                const Icon = EVENT_ICONS[event.eventTypeName] || Package;
                const colorClass = EVENT_COLORS[event.eventTypeName] || "bg-muted text-muted-foreground";
                return (
                  <div key={`${event.eventHash}-${i}`} className="relative">
                    {i < chainEvents.length - 1 && (
                      <div className="absolute left-[19px] top-10 w-0.5 h-[calc(100%-20px)] bg-border" />
                    )}
                    <div className="flex gap-3 pb-4">
                      <div className="relative z-10 shrink-0 p-2 rounded-lg border-2 border-green-500/50 bg-green-500/10">
                        <Icon className="h-4 w-4 text-green-500" />
                      </div>
                      <div className="flex-1 p-3 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={`${colorClass} text-[10px]`}>
                              {event.eventTypeName}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(event.timestamp * 1000).toLocaleDateString()}{" "}
                              {new Date(event.timestamp * 1000).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <Badge variant="outline" className="text-[9px] font-mono border-green-500/20 text-green-400">
                              <Shield className="h-2 w-2 mr-0.5" /> On-Chain
                            </Badge>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1 font-mono">
                            <Wallet className="h-2.5 w-2.5" />
                            {event.actor.slice(0, 6)}...{event.actor.slice(-4)}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-2.5 w-2.5" /> {event.location}
                            </span>
                          )}
                          {event.metadataURI && (
                            <a
                              href={event.metadataURI.startsWith("ipfs://")
                                ? `https://ipfs.io/ipfs/${event.metadataURI.slice(7)}`
                                : event.metadataURI}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-primary hover:underline"
                            >
                              <ExternalLink className="h-2.5 w-2.5" /> Metadata
                            </a>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[9px] font-mono text-muted-foreground/60">
                          <Hash className="h-2.5 w-2.5" />
                          <span className="truncate">Hash: {event.eventHash}</span>
                        </div>
                        {event.previousHash !== "0x0000000000000000000000000000000000000000000000000000000000000000" && (
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Record Event Dialog */}
      <Dialog open={showRecordDialog} onOpenChange={setShowRecordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4" /> Record On-Chain Event
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
              <p className="text-[10px] text-blue-400">
                This will create a real blockchain transaction on Ethereum Sepolia.
                You'll need to confirm in MetaMask.
              </p>
            </div>
            <div>
              <Label className="text-xs">Event Type</Label>
              <Select
                value={newEvent.eventType}
                onValueChange={(v) => setNewEvent((s) => ({ ...s, eventType: v as EventTypeName }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPE_NAMES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Location</Label>
              <Input
                className="mt-1"
                placeholder="e.g., Shanghai Factory, LA Warehouse"
                value={newEvent.location}
                onChange={(e) => setNewEvent((s) => ({ ...s, location: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Metadata URI (optional)</Label>
              <Input
                className="mt-1 font-mono text-xs"
                placeholder="ipfs://... or https://..."
                value={newEvent.metadataURI}
                onChange={(e) => setNewEvent((s) => ({ ...s, metadataURI: e.target.value }))}
              />
            </div>
            <div className="p-2 rounded bg-muted text-[10px] font-mono space-y-1">
              <p>Product: {onChainProductId}</p>
              <p>From: {address?.slice(0, 10)}...{address?.slice(-6)}</p>
              <p>Network: Ethereum Sepolia (Chain ID: 11155111)</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowRecordDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => recordMutation.mutate()}
              disabled={!newEvent.location || recordMutation.isPending}
            >
              {recordMutation.isPending ? (
                <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Confirming...</>
              ) : (
                <><Shield className="h-3 w-3 mr-1" /> Record on Blockchain</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
