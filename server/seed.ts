import "dotenv/config";
import { db } from "./db/index.js";
import {
  categories,
  suppliers,
  products,
  stockEvents,
  activities,
  alerts,
  warehouses,
  purchaseOrders,
  orderItems,
} from "./db/schema.js";

async function seed() {
  console.log("Seeding database...");

  // Clear existing data
  await db.delete(orderItems);
  await db.delete(purchaseOrders);
  await db.delete(stockEvents);
  await db.delete(alerts);
  await db.delete(activities);
  await db.delete(products);
  await db.delete(warehouses);
  await db.delete(suppliers);
  await db.delete(categories);

  // ── Categories ─────────────────────────────────────
  const [catElec, catApparel, catFood, catOffice, catHardware] = await db
    .insert(categories)
    .values([
      { name: "Electronics", description: "Consumer electronics, accessories, and peripherals", icon: "Monitor", color: "200 80% 50%" },
      { name: "Apparel", description: "Workwear, safety clothing, and uniforms", icon: "Shirt", color: "280 60% 55%" },
      { name: "Food & Beverage", description: "Consumables, beverages, and snacks", icon: "Coffee", color: "142 71% 45%" },
      { name: "Office Supplies", description: "Paper, writing instruments, and desk accessories", icon: "FileText", color: "38 92% 50%" },
      { name: "Hardware", description: "Tools, fasteners, and construction materials", icon: "Wrench", color: "0 72% 51%" },
    ])
    .returning();

  console.log("  ✓ Categories");

  // ── Suppliers ──────────────────────────────────────
  const [supTech, supConnect, supWork, supSafe, supGreen, supAqua, supOffice, supMetal, supPower, supBuild] = await db
    .insert(suppliers)
    .values([
      { name: "TechFlow Inc.", contactName: "Marcus Chen", email: "marcus@techflow.com", phone: "+1 (555) 234-5678", address: "1200 Tech Blvd, San Jose, CA", leadTimeDays: 7, rating: 5, notes: "Preferred electronics supplier. Offers volume discounts." },
      { name: "ConnectPro Ltd.", contactName: "Sarah Kim", email: "sarah@connectpro.io", phone: "+1 (555) 345-6789", address: "890 Innovation Dr, Austin, TX", leadTimeDays: 5, rating: 4, notes: "Fast turnaround on USB accessories." },
      { name: "WorkWear Co.", contactName: "Jake Morrison", email: "jake@workwear.com", phone: "+1 (555) 456-7890", address: "456 Industrial Park, Detroit, MI", leadTimeDays: 10, rating: 4, notes: "Reliable for safety apparel. Minimum order $500." },
      { name: "SafeHands Mfg.", contactName: "Linda Patel", email: "linda@safehands.com", phone: "+1 (555) 567-8901", address: "789 Safety Lane, Chicago, IL", leadTimeDays: 14, rating: 3, notes: "Good quality but longer lead times." },
      { name: "GreenBean Supply", contactName: "Tom Rivera", email: "tom@greenbean.co", phone: "+1 (555) 678-9012", address: "321 Organic Way, Portland, OR", leadTimeDays: 3, rating: 5, notes: "Organic certified. Excellent quality." },
      { name: "AquaPure Dist.", contactName: "Nina Costa", email: "nina@aquapure.com", phone: "+1 (555) 789-0123", address: "555 Spring St, Denver, CO", leadTimeDays: 2, rating: 4, notes: "Local distributor with fast delivery." },
      { name: "OfficePro Supply", contactName: "David Wu", email: "david@officepro.com", phone: "+1 (555) 890-1234", address: "100 Commerce Blvd, Atlanta, GA", leadTimeDays: 5, rating: 4, notes: "Bulk pricing available. NET-30 terms." },
      { name: "MetalFast Corp.", contactName: "Bob Hendricks", email: "bob@metalfast.com", phone: "+1 (555) 901-2345", address: "2000 Steel Rd, Pittsburgh, PA", leadTimeDays: 12, rating: 3, notes: "Specializes in industrial fasteners." },
      { name: "PowerTool Dist.", contactName: "Amy Zhang", email: "amy@powertool.com", phone: "+1 (555) 012-3456", address: "4500 Tool Ave, Milwaukee, WI", leadTimeDays: 8, rating: 5, notes: "Authorized dealer. Warranty support included." },
      { name: "BuildRight Ltd.", contactName: "Carlos Ortega", email: "carlos@buildright.com", phone: "+1 (555) 123-4567", address: "678 Builder St, Phoenix, AZ", leadTimeDays: 6, rating: 4, notes: "Great for plumbing and pipe supplies." },
    ])
    .returning();

  console.log("  ✓ Suppliers");

  // ── Warehouses ─────────────────────────────────────
  const [whMain, whWest, whEast] = await db
    .insert(warehouses)
    .values([
      { name: "Main Warehouse", address: "1000 Logistics Pkwy", city: "Dallas", state: "TX", country: "US", capacity: 5000, managerName: "Robert Jones", phone: "+1 (555) 100-2000", latitude: "32.7767", longitude: "-96.7970" },
      { name: "West Coast Hub", address: "2500 Pacific Ave", city: "Los Angeles", state: "CA", country: "US", capacity: 3000, managerName: "Lisa Park", phone: "+1 (555) 200-3000", latitude: "34.0522", longitude: "-118.2437" },
      { name: "East Coast Depot", address: "800 Harbor Dr", city: "Newark", state: "NJ", country: "US", capacity: 4000, managerName: "Mike Chen", phone: "+1 (555) 300-4000", latitude: "40.7357", longitude: "-74.1724" },
    ])
    .returning();

  console.log("  ✓ Warehouses");

  // ── Products ───────────────────────────────────────
  function getStatus(qty: number, reorder: number) {
    if (qty === 0) return "out" as const;
    if (qty <= reorder) return "low" as const;
    return "in-stock" as const;
  }

  const rawProducts = [
    { sku: "ELEC-001", name: "Wireless Bluetooth Headphones", categoryId: catElec.id, supplierId: supTech.id, quantity: 3, reorderPoint: 10, unitCost: "45.99", sellingPrice: "79.99", warehouseId: whMain.id, barcode: "8901234567890" },
    { sku: "ELEC-002", name: '27" 4K Monitor', categoryId: catElec.id, supplierId: supTech.id, quantity: 18, reorderPoint: 5, unitCost: "329.99", sellingPrice: "549.99", warehouseId: whWest.id, barcode: "8901234567891" },
    { sku: "ELEC-003", name: "USB-C Hub 7-in-1", categoryId: catElec.id, supplierId: supConnect.id, quantity: 0, reorderPoint: 15, unitCost: "34.50", sellingPrice: "59.99", warehouseId: whMain.id, barcode: "8901234567892" },
    { sku: "ELEC-004", name: "Mechanical Keyboard RGB", categoryId: catElec.id, supplierId: supTech.id, quantity: 42, reorderPoint: 8, unitCost: "89.99", sellingPrice: "149.99", warehouseId: whEast.id, barcode: "8901234567893" },
    { sku: "APRL-001", name: "Safety Work Boots Size 10", categoryId: catApparel.id, supplierId: supWork.id, quantity: 7, reorderPoint: 12, unitCost: "78.00", sellingPrice: "129.99", warehouseId: whMain.id, barcode: "8901234567894" },
    { sku: "APRL-002", name: "High-Vis Vest Orange", categoryId: catApparel.id, supplierId: supWork.id, quantity: 150, reorderPoint: 20, unitCost: "12.50", sellingPrice: "24.99", warehouseId: whMain.id, barcode: "8901234567895" },
    { sku: "APRL-003", name: "Insulated Work Gloves", categoryId: catApparel.id, supplierId: supSafe.id, quantity: 5, reorderPoint: 25, unitCost: "15.99", sellingPrice: "29.99", warehouseId: whEast.id, barcode: "8901234567896" },
    { sku: "FOOD-001", name: "Organic Coffee Beans 1kg", categoryId: catFood.id, supplierId: supGreen.id, quantity: 0, reorderPoint: 30, unitCost: "18.75", sellingPrice: "34.99", warehouseId: whWest.id, barcode: "8901234567897" },
    { sku: "FOOD-002", name: "Filtered Water 24-pack", categoryId: catFood.id, supplierId: supAqua.id, quantity: 85, reorderPoint: 20, unitCost: "8.99", sellingPrice: "15.99", warehouseId: whMain.id, barcode: "8901234567898" },
    { sku: "FOOD-003", name: "Energy Bar Variety Box", categoryId: catFood.id, supplierId: supGreen.id, quantity: 12, reorderPoint: 15, unitCost: "24.00", sellingPrice: "39.99", warehouseId: whMain.id, barcode: "8901234567899" },
    { sku: "OFFC-001", name: "A4 Copy Paper 5-Ream", categoryId: catOffice.id, supplierId: supOffice.id, quantity: 200, reorderPoint: 25, unitCost: "22.50", sellingPrice: "34.99", warehouseId: whEast.id, barcode: "8901234567900" },
    { sku: "OFFC-002", name: "Ballpoint Pens 50-pack", categoryId: catOffice.id, supplierId: supOffice.id, quantity: 8, reorderPoint: 10, unitCost: "14.99", sellingPrice: "24.99", warehouseId: whMain.id, barcode: "8901234567901" },
    { sku: "OFFC-003", name: "Whiteboard Markers Set", categoryId: catOffice.id, supplierId: supOffice.id, quantity: 0, reorderPoint: 8, unitCost: "11.50", sellingPrice: "19.99", warehouseId: whMain.id, barcode: "8901234567902" },
    { sku: "OFFC-004", name: "Desk Organizer Premium", categoryId: catOffice.id, supplierId: supOffice.id, quantity: 35, reorderPoint: 5, unitCost: "29.99", sellingPrice: "49.99", warehouseId: whWest.id, barcode: "8901234567903" },
    { sku: "HDWR-001", name: '1/2" Hex Bolt Pack (100)', categoryId: catHardware.id, supplierId: supMetal.id, quantity: 4, reorderPoint: 20, unitCost: "32.00", sellingPrice: "54.99", warehouseId: whMain.id, barcode: "8901234567904" },
    { sku: "HDWR-002", name: "Cordless Drill 20V", categoryId: catHardware.id, supplierId: supPower.id, quantity: 22, reorderPoint: 5, unitCost: "149.99", sellingPrice: "249.99", warehouseId: whEast.id, barcode: "8901234567905" },
    { sku: "HDWR-003", name: "PVC Pipe 2m (10-pack)", categoryId: catHardware.id, supplierId: supBuild.id, quantity: 2, reorderPoint: 8, unitCost: "45.00", sellingPrice: "74.99", warehouseId: whWest.id, barcode: "8901234567906" },
    { sku: "HDWR-004", name: "Safety Goggles Anti-fog", categoryId: catHardware.id, supplierId: supSafe.id, quantity: 60, reorderPoint: 10, unitCost: "9.99", sellingPrice: "18.99", warehouseId: whMain.id, barcode: "8901234567907" },
  ];

  const insertedProducts = await db
    .insert(products)
    .values(
      rawProducts.map((p) => ({
        ...p,
        status: getStatus(p.quantity, p.reorderPoint),
      }))
    )
    .returning();

  console.log("  ✓ Products");

  // ── Stock Events ───────────────────────────────────
  const prods = Object.fromEntries(insertedProducts.map((p) => [p.sku, p]));

  await db.insert(stockEvents).values([
    { productId: prods["ELEC-001"].id, productName: "Wireless Bluetooth Headphones", type: "sale" as const, quantityChange: -5, previousQty: 8, newQty: 3, reason: "Online order #4521", performedBy: "System" },
    { productId: prods["APRL-002"].id, productName: "High-Vis Vest Orange", type: "restock" as const, quantityChange: 50, previousQty: 100, newQty: 150, reason: "PO #1038 received", performedBy: "Jake Morrison" },
    { productId: prods["ELEC-003"].id, productName: "USB-C Hub 7-in-1", type: "sale" as const, quantityChange: -3, previousQty: 3, newQty: 0, reason: "Bulk order #4518", performedBy: "System" },
    { productId: prods["FOOD-001"].id, productName: "Organic Coffee Beans 1kg", type: "sale" as const, quantityChange: -10, previousQty: 10, newQty: 0, reason: "Break room restock", performedBy: "Tom Rivera" },
    { productId: prods["OFFC-001"].id, productName: "A4 Copy Paper 5-Ream", type: "restock" as const, quantityChange: 100, previousQty: 100, newQty: 200, reason: "PO #1035 received", performedBy: "David Wu" },
    { productId: prods["HDWR-001"].id, productName: '1/2" Hex Bolt Pack (100)', type: "damaged" as const, quantityChange: -6, previousQty: 10, newQty: 4, reason: "Water damage in warehouse B", performedBy: "Carlos Ortega" },
    { productId: prods["ELEC-004"].id, productName: "Mechanical Keyboard RGB", type: "return" as const, quantityChange: 2, previousQty: 40, newQty: 42, reason: "Customer return - unopened", performedBy: "System" },
    { productId: prods["HDWR-002"].id, productName: "Cordless Drill 20V", type: "sale" as const, quantityChange: -3, previousQty: 25, newQty: 22, reason: "Contractor order #4510", performedBy: "System" },
    { productId: prods["ELEC-002"].id, productName: '27" 4K Monitor', type: "adjustment" as const, quantityChange: -2, previousQty: 20, newQty: 18, reason: "Inventory count correction", performedBy: "Marcus Chen" },
    { productId: prods["APRL-003"].id, productName: "Insulated Work Gloves", type: "transfer" as const, quantityChange: -5, previousQty: 10, newQty: 5, reason: "Transferred to Warehouse C", performedBy: "Linda Patel" },
  ]);

  console.log("  ✓ Stock Events");

  // ── Activities ─────────────────────────────────────
  await db.insert(activities).values([
    { type: "restock" as const, message: "Restocked 50x High-Vis Vest Orange" },
    { type: "sale" as const, message: "Sold 5x Cordless Drill 20V" },
    { type: "alert" as const, message: "USB-C Hub 7-in-1 is out of stock" },
    { type: "order" as const, message: "PO #1042 sent to GreenBean Supply" },
    { type: "restock" as const, message: "Restocked 100x A4 Copy Paper" },
    { type: "alert" as const, message: "Wireless Bluetooth Headphones below reorder point" },
    { type: "sale" as const, message: 'Sold 2x 27" 4K Monitor' },
  ]);

  console.log("  ✓ Activities");

  // ── Alerts (generated from product data) ───────────
  const alertValues: Array<{
    productId: string;
    type: "out-of-stock" | "low-stock" | "overstock";
    message: string;
  }> = insertedProducts
    .map((p) => {
      if (p.quantity === 0) return { productId: p.id, type: "out-of-stock" as const, message: `${p.name} is out of stock` };
      if (p.quantity <= p.reorderPoint) return { productId: p.id, type: "low-stock" as const, message: `${p.name} is below reorder point (${p.quantity}/${p.reorderPoint})` };
      if (p.quantity > p.reorderPoint * 5) return { productId: p.id, type: "overstock" as const, message: `${p.name} may be overstocked (${p.quantity} units)` };
      return null;
    })
    .filter(Boolean) as Array<{
    productId: string;
    type: "out-of-stock" | "low-stock" | "overstock";
    message: string;
  }>;

  if (alertValues.length > 0) {
    await db.insert(alerts).values(alertValues);
  }

  console.log("  ✓ Alerts");

  // ── Purchase Orders ────────────────────────────────
  const [po1] = await db
    .insert(purchaseOrders)
    .values([
      { supplierId: supTech.id, supplierName: "TechFlow Inc.", status: "sent" as const, totalAmount: String(20 * 45.99 + 30 * 34.50), notes: "Urgent restock" },
      { supplierId: supGreen.id, supplierName: "GreenBean Supply", status: "draft" as const, totalAmount: String(50 * 18.75), notes: "" },
    ])
    .returning();

  await db.insert(orderItems).values([
    { orderId: po1.id, productId: prods["ELEC-001"].id, productName: "Wireless Bluetooth Headphones", quantity: 20, unitCost: "45.99" },
    { orderId: po1.id, productId: prods["ELEC-003"].id, productName: "USB-C Hub 7-in-1", quantity: 30, unitCost: "34.50" },
  ]);

  console.log("  ✓ Purchase Orders");

  console.log("\nSeed complete!");
  process.exit(0);
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
