export type ProductStatus = "in-stock" | "low" | "out";
export type AlertType = "low-stock" | "out-of-stock" | "overstock" | "expiring";
export type POStatus = "draft" | "sent" | "received";

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  reorderPoint: number;
  unitCost: number;
  supplier: string;
  lastUpdated: string;
  status: ProductStatus;
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
  items: { productId: string; quantity: number; unitCost: number }[];
  status: POStatus;
  supplier: string;
  createdAt: string;
  total: number;
}

export interface ActivityItem {
  id: string;
  type: "restock" | "sale" | "alert" | "order";
  message: string;
  timestamp: string;
}

function getStatus(qty: number, reorder: number): ProductStatus {
  if (qty === 0) return "out";
  if (qty <= reorder) return "low";
  return "in-stock";
}

const raw = [
  { sku: "ELEC-001", name: "Wireless Bluetooth Headphones", category: "Electronics", quantity: 3, reorderPoint: 10, unitCost: 45.99, supplier: "TechFlow Inc." },
  { sku: "ELEC-002", name: '27" 4K Monitor', category: "Electronics", quantity: 18, reorderPoint: 5, unitCost: 329.99, supplier: "TechFlow Inc." },
  { sku: "ELEC-003", name: "USB-C Hub 7-in-1", category: "Electronics", quantity: 0, reorderPoint: 15, unitCost: 34.50, supplier: "ConnectPro Ltd." },
  { sku: "ELEC-004", name: "Mechanical Keyboard RGB", category: "Electronics", quantity: 42, reorderPoint: 8, unitCost: 89.99, supplier: "TechFlow Inc." },
  { sku: "APRL-001", name: "Safety Work Boots Size 10", category: "Apparel", quantity: 7, reorderPoint: 12, unitCost: 78.00, supplier: "WorkWear Co." },
  { sku: "APRL-002", name: "High-Vis Vest Orange", category: "Apparel", quantity: 150, reorderPoint: 20, unitCost: 12.50, supplier: "WorkWear Co." },
  { sku: "APRL-003", name: "Insulated Work Gloves", category: "Apparel", quantity: 5, reorderPoint: 25, unitCost: 15.99, supplier: "SafeHands Mfg." },
  { sku: "FOOD-001", name: "Organic Coffee Beans 1kg", category: "Food & Beverage", quantity: 0, reorderPoint: 30, unitCost: 18.75, supplier: "GreenBean Supply" },
  { sku: "FOOD-002", name: "Filtered Water 24-pack", category: "Food & Beverage", quantity: 85, reorderPoint: 20, unitCost: 8.99, supplier: "AquaPure Dist." },
  { sku: "FOOD-003", name: "Energy Bar Variety Box", category: "Food & Beverage", quantity: 12, reorderPoint: 15, unitCost: 24.00, supplier: "GreenBean Supply" },
  { sku: "OFFC-001", name: "A4 Copy Paper 5-Ream", category: "Office Supplies", quantity: 200, reorderPoint: 25, unitCost: 22.50, supplier: "OfficePro Supply" },
  { sku: "OFFC-002", name: "Ballpoint Pens 50-pack", category: "Office Supplies", quantity: 8, reorderPoint: 10, unitCost: 14.99, supplier: "OfficePro Supply" },
  { sku: "OFFC-003", name: "Whiteboard Markers Set", category: "Office Supplies", quantity: 0, reorderPoint: 8, unitCost: 11.50, supplier: "OfficePro Supply" },
  { sku: "OFFC-004", name: "Desk Organizer Premium", category: "Office Supplies", quantity: 35, reorderPoint: 5, unitCost: 29.99, supplier: "OfficePro Supply" },
  { sku: "HDWR-001", name: '1/2" Hex Bolt Pack (100)', category: "Hardware", quantity: 4, reorderPoint: 20, unitCost: 32.00, supplier: "MetalFast Corp." },
  { sku: "HDWR-002", name: "Cordless Drill 20V", category: "Hardware", quantity: 22, reorderPoint: 5, unitCost: 149.99, supplier: "PowerTool Dist." },
  { sku: "HDWR-003", name: "PVC Pipe 2m (10-pack)", category: "Hardware", quantity: 2, reorderPoint: 8, unitCost: 45.00, supplier: "BuildRight Ltd." },
  { sku: "HDWR-004", name: "Safety Goggles Anti-fog", category: "Hardware", quantity: 60, reorderPoint: 10, unitCost: 9.99, supplier: "SafeHands Mfg." },
];

export const initialProducts: Product[] = raw.map((p, i) => ({
  id: `prod-${i + 1}`,
  ...p,
  status: getStatus(p.quantity, p.reorderPoint),
  lastUpdated: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
}));

export const initialActivities: ActivityItem[] = [
  { id: "a1", type: "restock", message: "Restocked 50x High-Vis Vest Orange", timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: "a2", type: "sale", message: "Sold 5x Cordless Drill 20V", timestamp: new Date(Date.now() - 7200000).toISOString() },
  { id: "a3", type: "alert", message: "USB-C Hub 7-in-1 is out of stock", timestamp: new Date(Date.now() - 10800000).toISOString() },
  { id: "a4", type: "order", message: "PO #1042 sent to GreenBean Supply", timestamp: new Date(Date.now() - 14400000).toISOString() },
  { id: "a5", type: "restock", message: "Restocked 100x A4 Copy Paper", timestamp: new Date(Date.now() - 18000000).toISOString() },
  { id: "a6", type: "alert", message: "Wireless Bluetooth Headphones below reorder point", timestamp: new Date(Date.now() - 21600000).toISOString() },
  { id: "a7", type: "sale", message: 'Sold 2x 27" 4K Monitor', timestamp: new Date(Date.now() - 25200000).toISOString() },
];

export const categories = ["Electronics", "Apparel", "Food & Beverage", "Office Supplies", "Hardware"];
