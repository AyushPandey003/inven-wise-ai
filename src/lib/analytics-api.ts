/**
 * Advanced Inventory Analytics API Integration
 * 
 * This file provides TypeScript hooks and API functions for the new advanced features.
 * Add this to your project and import where needed.
 */

import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

// ────── API Response Types ──────────

export interface ABCAnalysisItem {
  productId: string;
  classification: "A" | "B" | "C";
  totalValue: number;
  percentageOfValue: number;
}

export interface InventoryTurnoverData {
  productId: string;
  productName: string;
  turnoverRatio: number;
  daysInventoryOutstanding: number;
}

export interface DemandForecast {
  productId: string;
  predictedDemand: number;
  forecastPeriod: number;
  confidenceInterval: number;
  method: string;
  historicalAverage: number;
}

export interface Recommendation {
  productId: string;
  type: "reorder" | "reduce" | "transfer" | "obsolete" | "bundle";
  priority: "low" | "medium" | "high" | "critical";
  action: string;
  estimatedCost?: number;
}

export interface WarehouseTransfer {
  id: string;
  productId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: number;
  status: "pending" | "in-transit" | "received" | "cancelled";
  reason: string;
  createdAt: string;
}

// ────── API Functions ──────────

export const analyticsApi = {
  // ABC Analysis
  generateABCAnalysis: async (): Promise<{ summary: any; classifications: ABCAnalysisItem[] }> => {
    const res = await fetch("/api/analytics/abc-analysis", { method: "POST" });
    if (!res.ok) throw new Error("Failed to generate ABC analysis");
    return res.json();
  },

  getABCAnalysis: async (): Promise<ABCAnalysisItem[]> => {
    const res = await fetch("/api/analytics/abc-analysis");
    if (!res.ok) throw new Error("Failed to fetch ABC analysis");
    return res.json();
  },

  // Inventory Turnover
  generateInventoryTurnover: async (): Promise<{
    message: string;
    topPerformers: InventoryTurnoverData[];
    slowMovers: InventoryTurnoverData[];
  }> => {
    const res = await fetch("/api/analytics/inventory-turnover", { method: "POST" });
    if (!res.ok) throw new Error("Failed to generate turnover analysis");
    return res.json();
  },

  // Demand Forecast
  generateDemandForecast: async (
    productId: string,
    options?: { forecastPeriod?: number; method?: string }
  ): Promise<DemandForecast> => {
    const res = await fetch(`/api/analytics/demand-forecast/${productId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
    });
    if (!res.ok) throw new Error("Failed to generate forecast");
    return res.json();
  },

  // Recommendations
  generateRecommendations: async (): Promise<{
    message: string;
    count: number;
    recommendations: Recommendation[];
  }> => {
    const res = await fetch("/api/analytics/recommendations", { method: "POST" });
    if (!res.ok) throw new Error("Failed to generate recommendations");
    return res.json();
  },

  // Warehouse Transfers
  createTransfer: async (transferData: {
    productId: string;
    fromWarehouseId: string;
    toWarehouseId: string;
    quantity: number;
    reason?: string;
  }): Promise<WarehouseTransfer> => {
    const res = await fetch("/api/analytics/warehouse-transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(transferData),
    });
    if (!res.ok) throw new Error("Failed to create transfer");
    return res.json();
  },

  getTransfers: async (): Promise<WarehouseTransfer[]> => {
    const res = await fetch("/api/analytics/warehouse-transfers");
    if (!res.ok) throw new Error("Failed to fetch transfers");
    return res.json();
  },
};

// ────── React Hooks ──────────

/**
 * Hook: ABC Analysis Data
 * Fetches and manages ABC inventory classification
 */
export function useABCAnalysis() {
  return useQuery({
    queryKey: ["abc-analysis"],
    queryFn: () => analyticsApi.getABCAnalysis(),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Hook: Generate ABC Analysis
 * Triggers ABC analysis generation
 */
export function useGenerateABCAnalysis() {
  return useMutation({
    mutationFn: analyticsApi.generateABCAnalysis,
    onSuccess: () => {
      toast.success("ABC analysis generated successfully");
    },
    onError: (error) => {
      toast.error(`Error: ${(error as Error).message}`);
    },
  });
}

/**
 * Hook: Inventory Turnover Analysis
 * Generates and fetches inventory turnover metrics
 */
export function useInventoryTurnover() {
  return useQuery({
    queryKey: ["inventory-turnover"],
    queryFn: () => analyticsApi.generateInventoryTurnover(),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Hook: Demand Forecast
 * Generates demand forecast for a specific product
 */
export function useDemandForecast(
  productId: string | null,
  options?: { forecastPeriod?: number; method?: string }
) {
  return useQuery({
    queryKey: ["demand-forecast", productId],
    queryFn: () => analyticsApi.generateDemandForecast(productId!, options),
    enabled: !!productId,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Hook: Recommendations
 * Fetches AI-generated optimization recommendations
 */
export function useRecommendations() {
  return useQuery({
    queryKey: ["recommendations"],
    queryFn: () => analyticsApi.generateRecommendations(),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Hook: Create Warehouse Transfer
 * Creates a new inter-warehouse transfer
 */
export function useCreateTransfer() {
  return useMutation({
    mutationFn: analyticsApi.createTransfer,
    onSuccess: () => {
      toast.success("Transfer created successfully");
    },
    onError: (error) => {
      toast.error(`Error: ${(error as Error).message}`);
    },
  });
}

/**
 * Hook: Warehouse Transfers
 * Fetches list of all warehouse transfers
 */
export function useWarehouseTransfers() {
  return useQuery({
    queryKey: ["warehouse-transfers"],
    queryFn: () => analyticsApi.getTransfers(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 1, // Refetch every minute
  });
}

// ────── Component Example Usage ──────────

/**
 * Example component showing how to use the hooks
 */
export function AnalyticsExample() {
  const { data: recommendations, isLoading } = useRecommendations();
  const generateABC = useGenerateABCAnalysis();
  const createTransfer = useCreateTransfer();

  return (
    <div className="space-y-4">
      <button onClick={() => generateABC.mutate()}>
        {generateABC.isPending ? "Generating..." : "Generate ABC Analysis"}
      </button>

      {isLoading && <p>Loading recommendations...</p>}

      {recommendations?.recommendations.map((rec) => (
        <div key={rec.productId} className="p-4 border rounded">
          <p>{rec.action}</p>
          <span className="badge">{rec.priority}</span>
        </div>
      ))}

      <button
        onClick={() => {
          createTransfer.mutate({
            productId: "prod-001",
            fromWarehouseId: "wh-001",
            toWarehouseId: "wh-002",
            quantity: 100,
            reason: "Rebalancing",
          });
        }}
      >
        Create Transfer
      </button>
    </div>
  );
}

// ────── Utility Functions ──────────

/**
 * Format ABC classification for display
 */
export function getABCBadgeColor(classification: "A" | "B" | "C"): string {
  switch (classification) {
    case "A":
      return "bg-red-100 text-red-800";
    case "B":
      return "bg-yellow-100 text-yellow-800";
    case "C":
      return "bg-green-100 text-green-800";
  }
}

/**
 * Get recommendation priority badge color
 */
export function getPriorityColor(priority: Recommendation["priority"]): string {
  switch (priority) {
    case "critical":
      return "bg-red-500 text-white";
    case "high":
      return "bg-orange-500 text-white";
    case "medium":
      return "bg-yellow-500 text-white";
    case "low":
      return "bg-blue-500 text-white";
  }
}

/**
 * Get transfer status badge color
 */
export function getTransferStatusColor(status: WarehouseTransfer["status"]): string {
  switch (status) {
    case "pending":
      return "bg-gray-100 text-gray-800";
    case "in-transit":
      return "bg-blue-100 text-blue-800";
    case "received":
      return "bg-green-100 text-green-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
  }
}

/**
 * Calculate confidence percentage for display
 */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence)}%`;
}

/**
 * Calculate days until needing reorder based on turnover
 */
export function calculateReorderDays(daysInventoryOutstanding: number, safetyStock: number = 7): number {
  return Math.max(0, daysInventoryOutstanding - safetyStock);
}
