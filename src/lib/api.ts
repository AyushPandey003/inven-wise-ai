const API_BASE = import.meta.env.VITE_API_URL || "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || "Request failed");
  }
  return res.json();
}

// ── Dashboard ──────────────────────────────────────────

export interface DashboardData {
  kpis: {
    totalProducts: number;
    totalQuantity: number;
    totalValue: number;
    totalRetailValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    pendingOrders: number;
    activeAlerts: number;
  };
  categoryBreakdown: Array<{
    categoryId: string;
    categoryName: string;
    color: string;
    productCount: number;
    totalValue: number;
  }>;
  topProducts: Array<{
    id: string;
    name: string;
    sku: string;
    value: number;
    quantity: number;
  }>;
  recentActivities: Array<{
    id: string;
    type: string;
    message: string;
    createdAt: string;
  }>;
  stockTimeline: Array<{
    date: string;
    totalIn: number;
    totalOut: number;
  }>;
}

export const dashboardApi = {
  get: () => request<DashboardData>("/dashboard"),
};

// ── Products ───────────────────────────────────────────

export interface ApiProduct {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  supplierId: string | null;
  quantity: number;
  reorderPoint: number;
  unitCost: string;
  sellingPrice: string;
  imageUrl: string | null;
  barcode: string | null;
  weight: string | null;
  dimensions: string | null;
  status: "in-stock" | "low" | "out";
  warehouseId: string | null;
  location: string | null;
  lastUpdated: string;
  createdAt: string;
  category?: { id: string; name: string; color: string; icon: string } | null;
  supplier?: { id: string; name: string } | null;
  warehouse?: { id: string; name: string } | null;
  variants?: Array<{
    id: string;
    label: string;
    sku: string;
    quantity: number;
    unitCost: string;
    attributes: Record<string, string>;
  }>;
  pricingTiers?: Array<{
    id: string;
    minQty: number;
    maxQty: number | null;
    price: string;
  }>;
}

export interface ProductsResponse {
  products: ApiProduct[];
  total: number;
  page: number;
  limit: number;
}

export const productsApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<ProductsResponse>(`/products${qs}`);
  },
  get: (id: string) => request<ApiProduct>(`/products/${id}`),
  create: (data: Partial<ApiProduct>) =>
    request<ApiProduct>("/products", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<ApiProduct>) =>
    request<ApiProduct>(`/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (ids: string[]) =>
    request<{ deleted: number }>("/products", {
      method: "DELETE",
      body: JSON.stringify({ ids }),
    }),
  restock: (id: string, quantity: number) =>
    request<ApiProduct>(`/products/${id}/restock`, {
      method: "POST",
      body: JSON.stringify({ quantity }),
    }),
  addVariant: (productId: string, data: any) =>
    request(`/products/${productId}/variants`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  addPricingTier: (productId: string, data: any) =>
    request(`/products/${productId}/pricing-tiers`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateImage: (productId: string, imageUrl: string) =>
    request(`/upload/product-image/${productId}`, {
      method: "PUT",
      body: JSON.stringify({ imageUrl }),
    }),
};

// ── Categories ─────────────────────────────────────────

export interface ApiCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  productCount?: number;
  totalQuantity?: number;
  totalValue?: number;
}

export const categoriesApi = {
  list: () => request<ApiCategory[]>("/categories"),
  create: (data: Partial<ApiCategory>) =>
    request<ApiCategory>("/categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<ApiCategory>) =>
    request<ApiCategory>(`/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<{ deleted: boolean }>(`/categories/${id}`, { method: "DELETE" }),
};

// ── Suppliers ──────────────────────────────────────────

export interface ApiSupplier {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  leadTimeDays: number;
  rating: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
  productCount?: number;
}

export const suppliersApi = {
  list: (search?: string) => {
    const qs = search ? `?search=${encodeURIComponent(search)}` : "";
    return request<ApiSupplier[]>(`/suppliers${qs}`);
  },
  get: (id: string) => request<ApiSupplier>(`/suppliers/${id}`),
  create: (data: Partial<ApiSupplier>) =>
    request<ApiSupplier>("/suppliers", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<ApiSupplier>) =>
    request<ApiSupplier>(`/suppliers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<{ deleted: boolean }>(`/suppliers/${id}`, { method: "DELETE" }),
};

// ── Orders ─────────────────────────────────────────────

export interface ApiOrder {
  id: string;
  supplierId: string | null;
  supplierName: string;
  status: "draft" | "sent" | "received";
  totalAmount: string;
  notes: string;
  expectedDate: string | null;
  receivedDate: string | null;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: string;
    productId: string | null;
    productName: string;
    quantity: number;
    unitCost: string;
  }>;
  supplier?: ApiSupplier | null;
}

export const ordersApi = {
  list: () => request<ApiOrder[]>("/orders"),
  get: (id: string) => request<ApiOrder>(`/orders/${id}`),
  create: (data: {
    items: Array<{ productId: string; productName: string; quantity: number; unitCost: number }>;
    supplierName: string;
    supplierId?: string;
    notes?: string;
    expectedDate?: string;
  }) =>
    request<ApiOrder>("/orders", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateStatus: (id: string, status: "draft" | "sent" | "received") =>
    request<ApiOrder>(`/orders/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),
  delete: (id: string) =>
    request<{ deleted: boolean }>(`/orders/${id}`, { method: "DELETE" }),
};

// ── Stock Events ───────────────────────────────────────

export interface ApiStockEvent {
  id: string;
  productId: string | null;
  productName: string;
  type: "restock" | "sale" | "adjustment" | "return" | "damaged" | "transfer";
  quantityChange: number;
  previousQty: number;
  newQty: number;
  reason: string;
  performedBy: string;
  createdAt: string;
}

export interface StockEventsResponse {
  events: ApiStockEvent[];
  total: number;
  page: number;
  limit: number;
  summary: Array<{
    type: string;
    totalChange: string;
    eventCount: number;
  }>;
}

export const stockEventsApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<StockEventsResponse>(`/stock-events${qs}`);
  },
  create: (data: {
    productId: string;
    type: string;
    quantityChange: number;
    reason: string;
    performedBy?: string;
  }) =>
    request<ApiStockEvent>("/stock-events", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ── Warehouses ─────────────────────────────────────────

export interface ApiWarehouse {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  capacity: number;
  currentStock: number;
  managerName: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  productCount?: number;
  totalQuantity?: number;
  totalValue?: number;
  utilizationPct?: number;
}

export const warehousesApi = {
  list: () => request<ApiWarehouse[]>("/warehouses"),
  get: (id: string) => request<ApiWarehouse>(`/warehouses/${id}`),
  create: (data: Partial<ApiWarehouse>) =>
    request<ApiWarehouse>("/warehouses", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<ApiWarehouse>) =>
    request<ApiWarehouse>(`/warehouses/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<{ deleted: boolean }>(`/warehouses/${id}`, { method: "DELETE" }),
};

// ── Alerts ─────────────────────────────────────────────

export interface ApiAlert {
  id: string;
  productId: string | null;
  type: "low-stock" | "out-of-stock" | "overstock" | "expiring";
  message: string;
  dismissed: boolean;
  createdAt: string;
}

export const alertsApi = {
  list: () => request<ApiAlert[]>("/alerts"),
  dismiss: (id: string) =>
    request<ApiAlert>(`/alerts/${id}/dismiss`, { method: "PUT" }),
  clearDismissed: () =>
    request<{ cleared: boolean }>("/alerts/dismissed", { method: "DELETE" }),
};

// ── Provenance ────────────────────────────────────────

export interface ProvenanceRecord {
  id: string;
  productId: string | null;
  eventType: string;
  description: string;
  actor: string;
  location: string | null;
  previousHash: string | null;
  hash: string;
  metadata: Record<string, unknown> | null;
  verified: boolean | null;
  createdAt: string;
}

export interface ProvenanceStats {
  productsTracked: number;
  totalEvents: number;
  verifiedEvents: number;
  integrityScore: number;
}

export interface ProvenanceVerification {
  valid: boolean;
  length: number;
  brokenAt?: number;
  message: string;
}

export const provenanceApi = {
  stats: () => request<ProvenanceStats>("/provenance/stats"),
  chain: (productId: string) =>
    request<ProvenanceRecord[]>(`/provenance/chain/${productId}`),
  record: (data: {
    productId: string;
    eventType: string;
    description: string;
    actor: string;
    location?: string;
    metadata?: Record<string, unknown>;
  }) =>
    request<ProvenanceRecord>("/provenance/record", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  verify: (productId: string) =>
    request<ProvenanceVerification>(`/provenance/verify/${productId}`),
  verifyEvent: (eventId: string) =>
    request<{ valid: boolean; eventId: string; hash: string }>(`/provenance/verify-event/${eventId}`, {
      method: "POST",
    }),
  seedProduct: (productId: string, supplier?: string) =>
    request<{ seeded: number; chain: ProvenanceRecord[] }>(`/provenance/seed/${productId}`, {
      method: "POST",
      body: JSON.stringify({ supplier }),
    }),
  seedAll: () =>
    request<{ seeded: number; total: number }>("/provenance/seed-all", {
      method: "POST",
    }),
};
