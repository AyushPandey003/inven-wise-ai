import { useMemo } from "react";
import { ethers } from "ethers";
import { useWallet } from "@/context/WalletContext";
import ABI from "@/lib/InventoryProvenanceABI.json";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "";

export const EVENT_TYPE_MAP = {
  Manufactured: 0,
  Inspected: 1,
  Shipped: 2,
  Received: 3,
  Stored: 4,
  Sold: 5,
  Returned: 6,
} as const;

export const EVENT_TYPE_NAMES = [
  "Manufactured",
  "Inspected",
  "Shipped",
  "Received",
  "Stored",
  "Sold",
  "Returned",
] as const;

export type EventTypeName = (typeof EVENT_TYPE_NAMES)[number];

export interface OnChainEvent {
  eventHash: string;
  previousHash: string;
  eventType: number;
  eventTypeName: EventTypeName;
  actor: string;
  timestamp: number;
  productId: string;
  location: string;
  metadataURI: string;
}

/** Returns read-only contract (uses public RPC, no wallet needed) */
export function useReadContract() {
  return useMemo(() => {
    if (!CONTRACT_ADDRESS) return null;
    const provider = new ethers.JsonRpcProvider("https://eth-sepolia.publicrpc.com");
    return new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
  }, []);
}

/** Returns read-write contract (needs connected wallet) */
export function useWriteContract() {
  const { signer, isConnected, isCorrectNetwork } = useWallet();

  return useMemo(() => {
    if (!CONTRACT_ADDRESS || !signer || !isConnected || !isCorrectNetwork)
      return null;
    return new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
  }, [signer, isConnected, isCorrectNetwork]);
}

/** Parse raw contract event tuple into clean object */
function parseEvent(raw: any): OnChainEvent {
  return {
    eventHash: raw.eventHash,
    previousHash: raw.previousHash,
    eventType: Number(raw.eventType),
    eventTypeName: EVENT_TYPE_NAMES[Number(raw.eventType)] ?? "Manufactured",
    actor: raw.actor,
    timestamp: Number(raw.timestamp),
    productId: raw.productId,
    location: raw.location,
    metadataURI: raw.metadataURI,
  };
}

/** High-level contract interaction hooks */
export function useBlockchain() {
  const readContract = useReadContract();
  const writeContract = useWriteContract();
  const { address } = useWallet();

  const isReady = !!readContract;
  const canWrite = !!writeContract;

  // ─── Read functions ────────────────────────────────

  async function getProductHistory(productId: string): Promise<OnChainEvent[]> {
    if (!readContract) throw new Error("Contract not available");
    const length = await readContract.getChainLength(productId);
    if (length === 0n) return [];
    const events = await readContract.getProductEvents(productId, 0, length);
    return events.map(parseEvent);
  }

  async function getChainLength(productId: string): Promise<number> {
    if (!readContract) throw new Error("Contract not available");
    return Number(await readContract.getChainLength(productId));
  }

  async function verifyChain(
    productId: string
  ): Promise<{ valid: boolean; length: number }> {
    if (!readContract) throw new Error("Contract not available");
    const [valid, length] = await readContract.verifyChain(productId);
    return { valid, length: Number(length) };
  }

  async function getTotalEvents(): Promise<number> {
    if (!readContract) throw new Error("Contract not available");
    return Number(await readContract.totalEvents());
  }

  async function isAuthorized(addr?: string): Promise<boolean> {
    if (!readContract) throw new Error("Contract not available");
    return readContract.authorizedActors(addr || address);
  }

  async function getContractOwner(): Promise<string> {
    if (!readContract) throw new Error("Contract not available");
    return readContract.owner();
  }

  // ─── Write functions ───────────────────────────────

  async function recordEvent(
    productId: string,
    eventType: EventTypeName | number,
    location: string,
    metadataURI: string
  ): Promise<{ txHash: string; eventIndex: bigint; eventHash: string }> {
    if (!writeContract) throw new Error("Wallet not connected or wrong network");
    const typeNum =
      typeof eventType === "string" ? EVENT_TYPE_MAP[eventType] : eventType;

    const tx = await writeContract.recordEvent(
      productId,
      typeNum,
      location,
      metadataURI
    );
    const receipt = await tx.wait();

    // Parse EventRecorded from logs
    let eventIndex = 0n;
    let eventHash = "";
    for (const log of receipt.logs) {
      try {
        const parsed = writeContract.interface.parseLog(log);
        if (parsed?.name === "EventRecorded") {
          eventIndex = parsed.args.eventIndex;
          eventHash = parsed.args.eventHash;
          break;
        }
      } catch {}
    }

    return { txHash: receipt.hash, eventIndex, eventHash };
  }

  async function authorizeActor(actorAddress: string): Promise<string> {
    if (!writeContract) throw new Error("Wallet not connected or wrong network");
    const tx = await writeContract.authorizeActor(actorAddress);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async function revokeActor(actorAddress: string): Promise<string> {
    if (!writeContract) throw new Error("Wallet not connected or wrong network");
    const tx = await writeContract.revokeActor(actorAddress);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  return {
    isReady,
    canWrite,
    contractAddress: CONTRACT_ADDRESS,
    // Read
    getProductHistory,
    getChainLength,
    verifyChain,
    getTotalEvents,
    isAuthorized,
    getContractOwner,
    // Write
    recordEvent,
    authorizeActor,
    revokeActor,
  };
}
