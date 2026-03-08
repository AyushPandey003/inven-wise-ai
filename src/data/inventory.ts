export type ProductStatus = "in-stock" | "low" | "out";
export type AlertType = "low-stock" | "out-of-stock" | "overstock" | "expiring";
export type POStatus = "draft" | "sent" | "received";

export interface ProductVariant {
  id: string;
  label: string; // e.g. "Red / Large"
  sku: string;
  quantity: number;
  unitCost: number;
  attributes: Record<string, string>; // e.g. { color: "Red", size: "Large" }
}

export interface PricingTier {
  minQty: number;
  price: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  reorderPoint: number;
  unitCost: number;
  sellingPrice: number;
  supplier: string;
  lastUpdated: string;
  status: ProductStatus;
  variants?: ProductVariant[];
  pricingTiers?: PricingTier[];
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  leadTimeDays: number;
  rating: number; // 1-5
  productsSupplied: string[]; // product ids
  notes: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
  color: string; // hsl accent
  createdAt: string;
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
  { sku: "ELEC-001", name: "Wireless Bluetooth Headphones", category: "Electronics", quantity: 3, reorderPoint: 10, unitCost: 45.99, sellingPrice: 79.99, supplier: "TechFlow Inc." },
  { sku: "ELEC-002", name: '27" 4K Monitor', category: "Electronics", quantity: 18, reorderPoint: 5, unitCost: 329.99, sellingPrice: 549.99, supplier: "TechFlow Inc." },
  { sku: "ELEC-003", name: "USB-C Hub 7-in-1", category: "Electronics", quantity: 0, reorderPoint: 15, unitCost: 34.50, sellingPrice: 59.99, supplier: "ConnectPro Ltd." },
  { sku: "ELEC-004", name: "Mechanical Keyboard RGB", category: "Electronics", quantity: 42, reorderPoint: 8, unitCost: 89.99, sellingPrice: 149.99, supplier: "TechFlow Inc." },
  { sku: "APRL-001", name: "Safety Work Boots Size 10", category: "Apparel", quantity: 7, reorderPoint: 12, unitCost: 78.00, sellingPrice: 129.99, supplier: "WorkWear Co." },
  { sku: "APRL-002", name: "High-Vis Vest Orange", category: "Apparel", quantity: 150, reorderPoint: 20, unitCost: 12.50, sellingPrice: 24.99, supplier: "WorkWear Co." },
  { sku: "APRL-003", name: "Insulated Work Gloves", category: "Apparel", quantity: 5, reorderPoint: 25, unitCost: 15.99, sellingPrice: 29.99, supplier: "SafeHands Mfg." },
  { sku: "FOOD-001", name: "Organic Coffee Beans 1kg", category: "Food & Beverage", quantity: 0, reorderPoint: 30, unitCost: 18.75, sellingPrice: 34.99, supplier: "GreenBean Supply" },
  { sku: "FOOD-002", name: "Filtered Water 24-pack", category: "Food & Beverage", quantity: 85, reorderPoint: 20, unitCost: 8.99, sellingPrice: 15.99, supplier: "AquaPure Dist." },
  { sku: "FOOD-003", name: "Energy Bar Variety Box", category: "Food & Beverage", quantity: 12, reorderPoint: 15, unitCost: 24.00, sellingPrice: 39.99, supplier: "GreenBean Supply" },
  { sku: "OFFC-001", name: "A4 Copy Paper 5-Ream", category: "Office Supplies", quantity: 200, reorderPoint: 25, unitCost: 22.50, sellingPrice: 34.99, supplier: "OfficePro Supply" },
  { sku: "OFFC-002", name: "Ballpoint Pens 50-pack", category: "Office Supplies", quantity: 8, reorderPoint: 10, unitCost: 14.99, sellingPrice: 24.99, supplier: "OfficePro Supply" },
  { sku: "OFFC-003", name: "Whiteboard Markers Set", category: "Office Supplies", quantity: 0, reorderPoint: 8, unitCost: 11.50, sellingPrice: 19.99, supplier: "OfficePro Supply" },
  { sku: "OFFC-004", name: "Desk Organizer Premium", category: "Office Supplies", quantity: 35, reorderPoint: 5, unitCost: 29.99, sellingPrice: 49.99, supplier: "OfficePro Supply" },
  { sku: "HDWR-001", name: '1/2" Hex Bolt Pack (100)', category: "Hardware", quantity: 4, reorderPoint: 20, unitCost: 32.00, sellingPrice: 54.99, supplier: "MetalFast Corp." },
  { sku: "HDWR-002", name: "Cordless Drill 20V", category: "Hardware", quantity: 22, reorderPoint: 5, unitCost: 149.99, sellingPrice: 249.99, supplier: "PowerTool Dist." },
  { sku: "HDWR-003", name: "PVC Pipe 2m (10-pack)", category: "Hardware", quantity: 2, reorderPoint: 8, unitCost: 45.00, sellingPrice: 74.99, supplier: "BuildRight Ltd." },
  { sku: "HDWR-004", name: "Safety Goggles Anti-fog", category: "Hardware", quantity: 60, reorderPoint: 10, unitCost: 9.99, sellingPrice: 18.99, supplier: "SafeHands Mfg." },
];

export const initialProducts: Product[] = raw.map((p, i) => ({
  id: `prod-${i + 1}`,
  ...p,
  status: getStatus(p.quantity, p.reorderPoint),
  lastUpdated: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
}));

export const initialSuppliers: Supplier[] = [
  { id: "sup-1", name: "TechFlow Inc.", contactName: "Marcus Chen", email: "marcus@techflow.com", phone: "+1 (555) 234-5678", address: "1200 Tech Blvd, San Jose, CA", leadTimeDays: 7, rating: 5, productsSupplied: ["prod-1", "prod-2", "prod-4"], notes: "Preferred electronics supplier. Offers volume discounts.", createdAt: new Date(Date.now() - 365 * 86400000).toISOString() },
  { id: "sup-2", name: "ConnectPro Ltd.", contactName: "Sarah Kim", email: "sarah@connectpro.io", phone: "+1 (555) 345-6789", address: "890 Innovation Dr, Austin, TX", leadTimeDays: 5, rating: 4, productsSupplied: ["prod-3"], notes: "Fast turnaround on USB accessories.", createdAt: new Date(Date.now() - 200 * 86400000).toISOString() },
  { id: "sup-3", name: "WorkWear Co.", contactName: "Jake Morrison", email: "jake@workwear.com", phone: "+1 (555) 456-7890", address: "456 Industrial Park, Detroit, MI", leadTimeDays: 10, rating: 4, productsSupplied: ["prod-5", "prod-6"], notes: "Reliable for safety apparel. Minimum order $500.", createdAt: new Date(Date.now() - 300 * 86400000).toISOString() },
  { id: "sup-4", name: "SafeHands Mfg.", contactName: "Linda Patel", email: "linda@safehands.com", phone: "+1 (555) 567-8901", address: "789 Safety Lane, Chicago, IL", leadTimeDays: 14, rating: 3, productsSupplied: ["prod-7", "prod-18"], notes: "Good quality but longer lead times.", createdAt: new Date(Date.now() - 180 * 86400000).toISOString() },
  { id: "sup-5", name: "GreenBean Supply", contactName: "Tom Rivera", email: "tom@greenbean.co", phone: "+1 (555) 678-9012", address: "321 Organic Way, Portland, OR", leadTimeDays: 3, rating: 5, productsSupplied: ["prod-8", "prod-10"], notes: "Organic certified. Excellent quality.", createdAt: new Date(Date.now() - 400 * 86400000).toISOString() },
  { id: "sup-6", name: "AquaPure Dist.", contactName: "Nina Costa", email: "nina@aquapure.com", phone: "+1 (555) 789-0123", address: "555 Spring St, Denver, CO", leadTimeDays: 2, rating: 4, productsSupplied: ["prod-9"], notes: "Local distributor with fast delivery.", createdAt: new Date(Date.now() - 150 * 86400000).toISOString() },
  { id: "sup-7", name: "OfficePro Supply", contactName: "David Wu", email: "david@officepro.com", phone: "+1 (555) 890-1234", address: "100 Commerce Blvd, Atlanta, GA", leadTimeDays: 5, rating: 4, productsSupplied: ["prod-11", "prod-12", "prod-13", "prod-14"], notes: "Bulk pricing available. NET-30 terms.", createdAt: new Date(Date.now() - 250 * 86400000).toISOString() },
  { id: "sup-8", name: "MetalFast Corp.", contactName: "Bob Hendricks", email: "bob@metalfast.com", phone: "+1 (555) 901-2345", address: "2000 Steel Rd, Pittsburgh, PA", leadTimeDays: 12, rating: 3, productsSupplied: ["prod-15"], notes: "Specializes in industrial fasteners.", createdAt: new Date(Date.now() - 100 * 86400000).toISOString() },
  { id: "sup-9", name: "PowerTool Dist.", contactName: "Amy Zhang", email: "amy@powertool.com", phone: "+1 (555) 012-3456", address: "4500 Tool Ave, Milwaukee, WI", leadTimeDays: 8, rating: 5, productsSupplied: ["prod-16"], notes: "Authorized dealer. Warranty support included.", createdAt: new Date(Date.now() - 90 * 86400000).toISOString() },
  { id: "sup-10", name: "BuildRight Ltd.", contactName: "Carlos Ortega", email: "carlos@buildright.com", phone: "+1 (555) 123-4567", address: "678 Builder St, Phoenix, AZ", leadTimeDays: 6, rating: 4, productsSupplied: ["prod-17"], notes: "Great for plumbing and pipe supplies.", createdAt: new Date(Date.now() - 60 * 86400000).toISOString() },
];

export const initialCategories: Category[] = [
  { id: "cat-1", name: "Electronics", description: "Consumer electronics, accessories, and peripherals", icon: "Monitor", color: "200 80% 50%", createdAt: new Date(Date.now() - 365 * 86400000).toISOString() },
  { id: "cat-2", name: "Apparel", description: "Workwear, safety clothing, and uniforms", icon: "Shirt", color: "280 60% 55%", createdAt: new Date(Date.now() - 365 * 86400000).toISOString() },
  { id: "cat-3", name: "Food & Beverage", description: "Consumables, beverages, and snacks", icon: "Coffee", color: "142 71% 45%", createdAt: new Date(Date.now() - 365 * 86400000).toISOString() },
  { id: "cat-4", name: "Office Supplies", description: "Paper, writing instruments, and desk accessories", icon: "FileText", color: "38 92% 50%", createdAt: new Date(Date.now() - 365 * 86400000).toISOString() },
  { id: "cat-5", name: "Hardware", description: "Tools, fasteners, and construction materials", icon: "Wrench", color: "0 72% 51%", createdAt: new Date(Date.now() - 365 * 86400000).toISOString() },
];

export const initialStockEvents: StockEvent[] = [
  { id: "se-1", productId: "prod-1", productName: "Wireless Bluetooth Headphones", type: "sale", quantityChange: -5, previousQty: 8, newQty: 3, reason: "Online order #4521", performedBy: "System", timestamp: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: "se-2", productId: "prod-6", productName: "High-Vis Vest Orange", type: "restock", quantityChange: 50, previousQty: 100, newQty: 150, reason: "PO #1038 received", performedBy: "Jake Morrison", timestamp: new Date(Date.now() - 4 * 3600000).toISOString() },
  { id: "se-3", productId: "prod-3", productName: "USB-C Hub 7-in-1", type: "sale", quantityChange: -3, previousQty: 3, newQty: 0, reason: "Bulk order #4518", performedBy: "System", timestamp: new Date(Date.now() - 8 * 3600000).toISOString() },
  { id: "se-4", productId: "prod-8", productName: "Organic Coffee Beans 1kg", type: "sale", quantityChange: -10, previousQty: 10, newQty: 0, reason: "Break room restock", performedBy: "Tom Rivera", timestamp: new Date(Date.now() - 12 * 3600000).toISOString() },
  { id: "se-5", productId: "prod-11", productName: "A4 Copy Paper 5-Ream", type: "restock", quantityChange: 100, previousQty: 100, newQty: 200, reason: "PO #1035 received", performedBy: "David Wu", timestamp: new Date(Date.now() - 24 * 3600000).toISOString() },
  { id: "se-6", productId: "prod-15", productName: '1/2" Hex Bolt Pack (100)', type: "damaged", quantityChange: -6, previousQty: 10, newQty: 4, reason: "Water damage in warehouse B", performedBy: "Carlos Ortega", timestamp: new Date(Date.now() - 36 * 3600000).toISOString() },
  { id: "se-7", productId: "prod-4", productName: "Mechanical Keyboard RGB", type: "return", quantityChange: 2, previousQty: 40, newQty: 42, reason: "Customer return - unopened", performedBy: "System", timestamp: new Date(Date.now() - 48 * 3600000).toISOString() },
  { id: "se-8", productId: "prod-16", productName: "Cordless Drill 20V", type: "sale", quantityChange: -3, previousQty: 25, newQty: 22, reason: "Contractor order #4510", performedBy: "System", timestamp: new Date(Date.now() - 60 * 3600000).toISOString() },
  { id: "se-9", productId: "prod-2", productName: '27" 4K Monitor', type: "adjustment", quantityChange: -2, previousQty: 20, newQty: 18, reason: "Inventory count correction", performedBy: "Marcus Chen", timestamp: new Date(Date.now() - 72 * 3600000).toISOString() },
  { id: "se-10", productId: "prod-7", productName: "Insulated Work Gloves", type: "transfer", quantityChange: -5, previousQty: 10, newQty: 5, reason: "Transferred to Warehouse C", performedBy: "Linda Patel", timestamp: new Date(Date.now() - 96 * 3600000).toISOString() },
];

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
