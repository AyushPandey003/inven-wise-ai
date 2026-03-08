import React, { createContext, useContext, useReducer, useCallback } from "react";
import {
  Product, Alert, PurchaseOrder, ActivityItem, ProductStatus, AlertType, POStatus,
  initialProducts, initialActivities, categories,
} from "@/data/inventory";
import { toast } from "sonner";

interface State {
  products: Product[];
  alerts: Alert[];
  orders: PurchaseOrder[];
  activities: ActivityItem[];
}

type Action =
  | { type: "ADD_PRODUCT"; product: Product }
  | { type: "UPDATE_PRODUCT"; product: Product }
  | { type: "DELETE_PRODUCTS"; ids: string[] }
  | { type: "RESTOCK"; id: string; quantity: number }
  | { type: "DISMISS_ALERT"; id: string }
  | { type: "ADD_ORDER"; order: PurchaseOrder }
  | { type: "UPDATE_ORDER_STATUS"; id: string; status: POStatus }
  | { type: "ADD_ACTIVITY"; activity: ActivityItem };

function getStatus(qty: number, reorder: number): ProductStatus {
  if (qty === 0) return "out";
  if (qty <= reorder) return "low";
  return "in-stock";
}

function generateAlerts(products: Product[]): Alert[] {
  const alerts: Alert[] = [];
  products.forEach((p) => {
    if (p.quantity === 0) {
      alerts.push({ id: `alert-oos-${p.id}`, productId: p.id, type: "out-of-stock", message: `${p.name} is out of stock`, dismissed: false, createdAt: new Date().toISOString() });
    } else if (p.quantity <= p.reorderPoint) {
      alerts.push({ id: `alert-low-${p.id}`, productId: p.id, type: "low-stock", message: `${p.name} is below reorder point (${p.quantity}/${p.reorderPoint})`, dismissed: false, createdAt: new Date().toISOString() });
    } else if (p.quantity > p.reorderPoint * 5) {
      alerts.push({ id: `alert-over-${p.id}`, productId: p.id, type: "overstock", message: `${p.name} may be overstocked (${p.quantity} units)`, dismissed: false, createdAt: new Date().toISOString() });
    }
  });
  return alerts;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD_PRODUCT": {
      const products = [...state.products, action.product];
      return { ...state, products, alerts: generateAlerts(products) };
    }
    case "UPDATE_PRODUCT": {
      const products = state.products.map((p) =>
        p.id === action.product.id ? { ...action.product, status: getStatus(action.product.quantity, action.product.reorderPoint), lastUpdated: new Date().toISOString() } : p
      );
      return { ...state, products, alerts: generateAlerts(products) };
    }
    case "DELETE_PRODUCTS": {
      const products = state.products.filter((p) => !action.ids.includes(p.id));
      return { ...state, products, alerts: generateAlerts(products) };
    }
    case "RESTOCK": {
      const products = state.products.map((p) =>
        p.id === action.id ? { ...p, quantity: p.quantity + action.quantity, status: getStatus(p.quantity + action.quantity, p.reorderPoint), lastUpdated: new Date().toISOString() } : p
      );
      return { ...state, products, alerts: generateAlerts(products) };
    }
    case "DISMISS_ALERT":
      return { ...state, alerts: state.alerts.map((a) => (a.id === action.id ? { ...a, dismissed: true } : a)) };
    case "ADD_ORDER":
      return { ...state, orders: [...state.orders, action.order] };
    case "UPDATE_ORDER_STATUS":
      return { ...state, orders: state.orders.map((o) => (o.id === action.id ? { ...o, status: action.status } : o)) };
    case "ADD_ACTIVITY":
      return { ...state, activities: [action.activity, ...state.activities].slice(0, 50) };
    default:
      return state;
  }
}

const initialState: State = {
  products: initialProducts,
  alerts: generateAlerts(initialProducts),
  orders: [
    {
      id: "po-1001",
      items: [
        { productId: "prod-1", quantity: 20, unitCost: 45.99 },
        { productId: "prod-3", quantity: 30, unitCost: 34.50 },
      ],
      status: "sent",
      supplier: "TechFlow Inc.",
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      total: 20 * 45.99 + 30 * 34.50,
    },
    {
      id: "po-1002",
      items: [{ productId: "prod-8", quantity: 50, unitCost: 18.75 }],
      status: "draft",
      supplier: "GreenBean Supply",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      total: 50 * 18.75,
    },
  ],
  activities: initialActivities,
};

interface ContextValue extends State {
  dispatch: React.Dispatch<Action>;
  addProduct: (p: Omit<Product, "id" | "status" | "lastUpdated">) => void;
  updateProduct: (p: Product) => void;
  deleteProducts: (ids: string[]) => void;
  restockProduct: (id: string, qty: number) => void;
  dismissAlert: (id: string) => void;
  createOrder: (o: Omit<PurchaseOrder, "id" | "createdAt">) => void;
  updateOrderStatus: (id: string, status: POStatus) => void;
}

const InventoryContext = createContext<ContextValue | null>(null);

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const addProduct = useCallback((p: Omit<Product, "id" | "status" | "lastUpdated">) => {
    const product: Product = { ...p, id: `prod-${Date.now()}`, status: getStatus(p.quantity, p.reorderPoint), lastUpdated: new Date().toISOString() };
    dispatch({ type: "ADD_PRODUCT", product });
    dispatch({ type: "ADD_ACTIVITY", activity: { id: `a-${Date.now()}`, type: "restock", message: `Added new product: ${p.name}`, timestamp: new Date().toISOString() } });
    toast.success(`Product "${p.name}" added`);
  }, []);

  const updateProduct = useCallback((p: Product) => {
    dispatch({ type: "UPDATE_PRODUCT", product: p });
    toast.success(`Product "${p.name}" updated`);
  }, []);

  const deleteProducts = useCallback((ids: string[]) => {
    dispatch({ type: "DELETE_PRODUCTS", ids });
    toast.success(`${ids.length} product(s) deleted`);
  }, []);

  const restockProduct = useCallback((id: string, qty: number) => {
    dispatch({ type: "RESTOCK", id, quantity: qty });
    const p = initialProducts.find((pr) => pr.id === id);
    dispatch({ type: "ADD_ACTIVITY", activity: { id: `a-${Date.now()}`, type: "restock", message: `Restocked ${qty}x ${p?.name || id}`, timestamp: new Date().toISOString() } });
    toast.success("Product restocked");
  }, []);

  const dismissAlert = useCallback((id: string) => {
    dispatch({ type: "DISMISS_ALERT", id });
  }, []);

  const createOrder = useCallback((o: Omit<PurchaseOrder, "id" | "createdAt">) => {
    const order: PurchaseOrder = { ...o, id: `po-${Date.now()}`, createdAt: new Date().toISOString() };
    dispatch({ type: "ADD_ORDER", order });
    dispatch({ type: "ADD_ACTIVITY", activity: { id: `a-${Date.now()}`, type: "order", message: `Purchase order ${order.id} created`, timestamp: new Date().toISOString() } });
    toast.success("Purchase order created");
  }, []);

  const updateOrderStatus = useCallback((id: string, status: POStatus) => {
    dispatch({ type: "UPDATE_ORDER_STATUS", id, status });
    toast.success(`Order ${id} status updated to ${status}`);
  }, []);

  return (
    <InventoryContext.Provider value={{ ...state, dispatch, addProduct, updateProduct, deleteProducts, restockProduct, dismissAlert, createOrder, updateOrderStatus }}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used within InventoryProvider");
  return ctx;
}
