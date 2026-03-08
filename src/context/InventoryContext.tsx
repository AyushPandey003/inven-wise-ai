import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  productsApi,
  categoriesApi,
  suppliersApi,
  ordersApi,
  stockEventsApi,
  alertsApi,
  dashboardApi,
  warehousesApi,
  type ApiProduct,
  type ApiCategory,
  type ApiSupplier,
  type ApiOrder,
  type ApiStockEvent,
  type ApiAlert,
  type ApiWarehouse,
  type DashboardData,
} from "@/lib/api";
import { toast } from "sonner";

// ── Legacy-compatible types (kept for existing pages) ──

export type ProductStatus = "in-stock" | "low" | "out";
export type AlertType = "low-stock" | "out-of-stock" | "overstock" | "expiring";
export type POStatus = "draft" | "sent" | "received";

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category: string;
  categoryId?: string;
  quantity: number;
  reorderPoint: number;
  unitCost: number;
  sellingPrice: number;
  supplier: string;
  supplierId?: string;
  imageUrl?: string | null;
  barcode?: string | null;
  warehouseId?: string | null;
  warehouseName?: string | null;
  location?: string | null;
  lastUpdated: string;
  status: ProductStatus;
  variants?: ProductVariant[];
  pricingTiers?: PricingTier[];
}

export interface ProductVariant {
  id: string;
  label: string;
  sku: string;
  quantity: number;
  unitCost: number;
  attributes: Record<string, string>;
}

export interface PricingTier {
  minQty: number;
  price: number;
}

export interface Alert {
  id: string;
  productId: string;
  type: AlertType;
  message: string;
  dismissed: boolean;
  createdAt: string;
}

export interface PurchaseOrder {
  id: string;
  items: { productId: string; productName?: string; quantity: number; unitCost: number }[];
  status: POStatus;
  supplier: string;
  supplierId?: string;
  createdAt: string;
  total: number;
}

export interface ActivityItem {
  id: string;
  type: "restock" | "sale" | "alert" | "order";
  message: string;
  timestamp: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  leadTimeDays: number;
  rating: number;
  productsSupplied: string[];
  notes: string;
  createdAt: string;
  productCount?: number;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  createdAt: string;
  productCount?: number;
  totalQuantity?: number;
  totalValue?: number;
}

export interface StockEvent {
  id: string;
  productId: string;
  productName: string;
  type: "restock" | "sale" | "adjustment" | "return" | "damaged" | "transfer";
  quantityChange: number;
  previousQty: number;
  newQty: number;
  reason: string;
  performedBy: string;
  timestamp: string;
}

export interface Warehouse {
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
  productCount?: number;
  totalQuantity?: number;
  totalValue?: number;
  utilizationPct?: number;
}

// ── Transform API data to legacy format ────────────────

function apiProductToProduct(p: ApiProduct): Product {
  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    description: p.description || "",
    category: p.category?.name || "Uncategorized",
    categoryId: p.categoryId || undefined,
    quantity: p.quantity,
    reorderPoint: p.reorderPoint,
    unitCost: Number(p.unitCost),
    sellingPrice: Number(p.sellingPrice),
    supplier: p.supplier?.name || "Unknown",
    supplierId: p.supplierId || undefined,
    imageUrl: p.imageUrl,
    barcode: p.barcode,
    warehouseId: p.warehouseId,
    warehouseName: p.warehouse?.name || null,
    location: p.location,
    lastUpdated: p.lastUpdated,
    status: p.status,
    variants: p.variants?.map((v) => ({
      id: v.id,
      label: v.label,
      sku: v.sku,
      quantity: v.quantity,
      unitCost: Number(v.unitCost),
      attributes: v.attributes || {},
    })),
    pricingTiers: p.pricingTiers?.map((t) => ({
      minQty: t.minQty,
      price: Number(t.price),
    })),
  };
}

function apiOrderToOrder(o: ApiOrder): PurchaseOrder {
  return {
    id: o.id,
    items: o.items.map((i) => ({
      productId: i.productId || "",
      productName: i.productName,
      quantity: i.quantity,
      unitCost: Number(i.unitCost),
    })),
    status: o.status,
    supplier: o.supplierName,
    supplierId: o.supplierId || undefined,
    createdAt: o.createdAt,
    total: Number(o.totalAmount),
  };
}

function apiAlertToAlert(a: ApiAlert): Alert {
  return {
    id: a.id,
    productId: a.productId || "",
    type: a.type,
    message: a.message,
    dismissed: a.dismissed,
    createdAt: a.createdAt,
  };
}

function apiStockEventToEvent(e: ApiStockEvent): StockEvent {
  return {
    id: e.id,
    productId: e.productId || "",
    productName: e.productName,
    type: e.type,
    quantityChange: e.quantityChange,
    previousQty: e.previousQty,
    newQty: e.newQty,
    reason: e.reason,
    performedBy: e.performedBy,
    timestamp: e.createdAt,
  };
}

// ── Context ────────────────────────────────────────────

interface ContextValue {
  // Data
  products: Product[];
  alerts: Alert[];
  orders: PurchaseOrder[];
  activities: ActivityItem[];
  suppliers: Supplier[];
  categoriesList: Category[];
  stockEvents: StockEvent[];
  warehouses: Warehouse[];
  dashboard: DashboardData | null;

  // Loading states
  isLoading: boolean;
  isApiConnected: boolean;

  // Product actions
  addProduct: (p: Omit<Product, "id" | "status" | "lastUpdated">) => Promise<void>;
  updateProduct: (p: Product) => Promise<void>;
  deleteProducts: (ids: string[]) => Promise<void>;
  restockProduct: (id: string, qty: number) => Promise<void>;

  // Alert actions
  dismissAlert: (id: string) => Promise<void>;

  // Order actions
  createOrder: (o: Omit<PurchaseOrder, "id" | "createdAt">) => Promise<void>;
  updateOrderStatus: (id: string, status: POStatus) => Promise<void>;

  // Supplier actions
  addSupplier: (s: Omit<Supplier, "id" | "createdAt">) => Promise<void>;
  updateSupplier: (s: Supplier) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;

  // Category actions
  addCategory: (c: Omit<Category, "id" | "createdAt">) => Promise<void>;
  updateCategory: (c: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  // Stock event actions
  addStockEvent: (e: Omit<StockEvent, "id">) => Promise<void>;

  // Warehouse actions
  addWarehouse: (w: Partial<Warehouse>) => Promise<void>;
  updateWarehouse: (w: Warehouse) => Promise<void>;
  deleteWarehouse: (id: string) => Promise<void>;

  // Refetch helpers
  refetchProducts: () => void;
  refetchDashboard: () => void;
}

const InventoryContext = createContext<ContextValue | null>(null);

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [isApiConnected, setIsApiConnected] = useState(false);

  // ── Queries ────────────────────────────────────────
  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: () => productsApi.list({ limit: "500" }),
    retry: 1,
    staleTime: 10_000,
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesApi.list,
    retry: 1,
    staleTime: 30_000,
  });

  const suppliersQuery = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => suppliersApi.list(),
    retry: 1,
    staleTime: 30_000,
  });

  const ordersQuery = useQuery({
    queryKey: ["orders"],
    queryFn: ordersApi.list,
    retry: 1,
    staleTime: 15_000,
  });

  const alertsQuery = useQuery({
    queryKey: ["alerts"],
    queryFn: alertsApi.list,
    retry: 1,
    staleTime: 10_000,
  });

  const stockEventsQuery = useQuery({
    queryKey: ["stockEvents"],
    queryFn: () => stockEventsApi.list({ limit: "200" }),
    retry: 1,
    staleTime: 15_000,
  });

  const warehousesQuery = useQuery({
    queryKey: ["warehouses"],
    queryFn: warehousesApi.list,
    retry: 1,
    staleTime: 30_000,
  });

  const dashboardQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: dashboardApi.get,
    retry: 1,
    staleTime: 15_000,
  });

  // Check API connectivity
  useEffect(() => {
    if (productsQuery.isSuccess) setIsApiConnected(true);
    if (productsQuery.isError) setIsApiConnected(false);
  }, [productsQuery.isSuccess, productsQuery.isError]);

  // ── Transformed data ───────────────────────────────
  const products: Product[] = (productsQuery.data?.products || []).map(apiProductToProduct);
  const alerts: Alert[] = (alertsQuery.data || []).map(apiAlertToAlert);
  const orders: PurchaseOrder[] = (ordersQuery.data || []).map(apiOrderToOrder);
  const stockEvents: StockEvent[] = (stockEventsQuery.data?.events || []).map(apiStockEventToEvent);

  const suppliers: Supplier[] = (suppliersQuery.data || []).map((s) => ({
    ...s,
    productsSupplied: [],
  }));

  const categoriesList: Category[] = (categoriesQuery.data || []).map((c) => ({
    ...c,
    description: c.description || "",
    icon: c.icon || "Package",
    color: c.color || "200 80% 50%",
  }));

  const warehouses: Warehouse[] = (warehousesQuery.data || []).map((w) => ({
    ...w,
    currentStock: w.totalQuantity || 0,
  }));

  const activities: ActivityItem[] = (dashboardQuery.data?.recentActivities || []).map((a) => ({
    id: a.id,
    type: a.type as any,
    message: a.message,
    timestamp: a.createdAt,
  }));

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["alerts"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["stockEvents"] });
  };

  // ── Product mutations ──────────────────────────────
  const addProduct = useCallback(async (p: Omit<Product, "id" | "status" | "lastUpdated">) => {
    try {
      await productsApi.create({
        sku: p.sku,
        name: p.name,
        description: p.description,
        categoryId: p.categoryId || categoriesList.find((c) => c.name === p.category)?.id || undefined,
        supplierId: p.supplierId || suppliers.find((s) => s.name === p.supplier)?.id || undefined,
        quantity: p.quantity,
        reorderPoint: p.reorderPoint,
        unitCost: String(p.unitCost) as any,
        sellingPrice: String(p.sellingPrice) as any,
        imageUrl: p.imageUrl,
        barcode: p.barcode,
        warehouseId: p.warehouseId,
      });
      invalidateAll();
      toast.success(`Product "${p.name}" added`);
    } catch (e: any) {
      toast.error(e.message || "Failed to add product");
    }
  }, [categoriesList, suppliers]);

  const updateProduct = useCallback(async (p: Product) => {
    try {
      await productsApi.update(p.id, {
        sku: p.sku,
        name: p.name,
        description: p.description,
        categoryId: p.categoryId || categoriesList.find((c) => c.name === p.category)?.id || undefined,
        supplierId: p.supplierId || suppliers.find((s) => s.name === p.supplier)?.id || undefined,
        quantity: p.quantity,
        reorderPoint: p.reorderPoint,
        unitCost: String(p.unitCost) as any,
        sellingPrice: String(p.sellingPrice) as any,
        imageUrl: p.imageUrl,
        barcode: p.barcode,
        warehouseId: p.warehouseId,
      });
      invalidateAll();
      toast.success(`Product "${p.name}" updated`);
    } catch (e: any) {
      toast.error(e.message || "Failed to update product");
    }
  }, [categoriesList, suppliers]);

  const deleteProducts = useCallback(async (ids: string[]) => {
    try {
      await productsApi.delete(ids);
      invalidateAll();
      toast.success(`${ids.length} product(s) deleted`);
    } catch (e: any) {
      toast.error(e.message || "Failed to delete products");
    }
  }, []);

  const restockProduct = useCallback(async (id: string, qty: number) => {
    try {
      await productsApi.restock(id, qty);
      invalidateAll();
      toast.success("Product restocked");
    } catch (e: any) {
      toast.error(e.message || "Failed to restock product");
    }
  }, []);

  // ── Alert mutations ────────────────────────────────
  const dismissAlert = useCallback(async (id: string) => {
    try {
      await alertsApi.dismiss(id);
      qc.invalidateQueries({ queryKey: ["alerts"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to dismiss alert");
    }
  }, []);

  // ── Order mutations ────────────────────────────────
  const createOrder = useCallback(async (o: Omit<PurchaseOrder, "id" | "createdAt">) => {
    try {
      await ordersApi.create({
        items: o.items.map((i) => ({
          productId: i.productId,
          productName: i.productName || products.find((p) => p.id === i.productId)?.name || "Unknown",
          quantity: i.quantity,
          unitCost: i.unitCost,
        })),
        supplierName: o.supplier,
        supplierId: o.supplierId || suppliers.find((s) => s.name === o.supplier)?.id,
      });
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Purchase order created");
    } catch (e: any) {
      toast.error(e.message || "Failed to create order");
    }
  }, [products, suppliers]);

  const updateOrderStatus = useCallback(async (id: string, status: POStatus) => {
    try {
      await ordersApi.updateStatus(id, status);
      qc.invalidateQueries({ queryKey: ["orders"] });
      invalidateAll();
      toast.success(`Order status updated to ${status}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to update order status");
    }
  }, []);

  // ── Supplier mutations ─────────────────────────────
  const addSupplier = useCallback(async (s: Omit<Supplier, "id" | "createdAt">) => {
    try {
      await suppliersApi.create(s);
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success(`Supplier "${s.name}" added`);
    } catch (e: any) {
      toast.error(e.message || "Failed to add supplier");
    }
  }, []);

  const updateSupplier = useCallback(async (s: Supplier) => {
    try {
      await suppliersApi.update(s.id, s);
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success(`Supplier "${s.name}" updated`);
    } catch (e: any) {
      toast.error(e.message || "Failed to update supplier");
    }
  }, []);

  const deleteSupplier = useCallback(async (id: string) => {
    try {
      await suppliersApi.delete(id);
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Supplier deleted");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete supplier");
    }
  }, []);

  // ── Category mutations ─────────────────────────────
  const addCategory = useCallback(async (c: Omit<Category, "id" | "createdAt">) => {
    try {
      await categoriesApi.create(c);
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success(`Category "${c.name}" added`);
    } catch (e: any) {
      toast.error(e.message || "Failed to add category");
    }
  }, []);

  const updateCategory = useCallback(async (c: Category) => {
    try {
      await categoriesApi.update(c.id, c);
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success(`Category "${c.name}" updated`);
    } catch (e: any) {
      toast.error(e.message || "Failed to update category");
    }
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    try {
      await categoriesApi.delete(id);
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category deleted");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete category");
    }
  }, []);

  // ── Stock event mutations ──────────────────────────
  const addStockEvent = useCallback(async (e: Omit<StockEvent, "id">) => {
    try {
      await stockEventsApi.create({
        productId: e.productId,
        type: e.type,
        quantityChange: e.quantityChange,
        reason: e.reason,
        performedBy: e.performedBy,
      });
      invalidateAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to create stock event");
    }
  }, []);

  // ── Warehouse mutations ────────────────────────────
  const addWarehouse = useCallback(async (w: Partial<Warehouse>) => {
    try {
      await warehousesApi.create(w);
      qc.invalidateQueries({ queryKey: ["warehouses"] });
      toast.success(`Warehouse "${w.name}" added`);
    } catch (e: any) {
      toast.error(e.message || "Failed to add warehouse");
    }
  }, []);

  const updateWarehouse = useCallback(async (w: Warehouse) => {
    try {
      await warehousesApi.update(w.id, w);
      qc.invalidateQueries({ queryKey: ["warehouses"] });
      toast.success(`Warehouse "${w.name}" updated`);
    } catch (e: any) {
      toast.error(e.message || "Failed to update warehouse");
    }
  }, []);

  const deleteWarehouse = useCallback(async (id: string) => {
    try {
      await warehousesApi.delete(id);
      qc.invalidateQueries({ queryKey: ["warehouses"] });
      toast.success("Warehouse deleted");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete warehouse");
    }
  }, []);

  const isLoading =
    productsQuery.isLoading ||
    categoriesQuery.isLoading ||
    suppliersQuery.isLoading;

  return (
    <InventoryContext.Provider
      value={{
        products,
        alerts,
        orders,
        activities,
        suppliers,
        categoriesList,
        stockEvents,
        warehouses,
        dashboard: dashboardQuery.data || null,
        isLoading,
        isApiConnected,
        addProduct,
        updateProduct,
        deleteProducts,
        restockProduct,
        dismissAlert,
        createOrder,
        updateOrderStatus,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        addCategory,
        updateCategory,
        deleteCategory,
        addStockEvent,
        addWarehouse,
        updateWarehouse,
        deleteWarehouse,
        refetchProducts: () => qc.invalidateQueries({ queryKey: ["products"] }),
        refetchDashboard: () => qc.invalidateQueries({ queryKey: ["dashboard"] }),
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used within InventoryProvider");
  return ctx;
}
