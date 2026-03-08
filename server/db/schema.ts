import {
  pgTable,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  uuid,
  serial,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Enums ──────────────────────────────────────────────

export const productStatusEnum = pgEnum("product_status", [
  "in-stock",
  "low",
  "out",
]);

export const alertTypeEnum = pgEnum("alert_type", [
  "low-stock",
  "out-of-stock",
  "overstock",
  "expiring",
]);

export const poStatusEnum = pgEnum("po_status", ["draft", "sent", "received"]);

export const stockEventTypeEnum = pgEnum("stock_event_type", [
  "restock",
  "sale",
  "adjustment",
  "return",
  "damaged",
  "transfer",
]);

export const activityTypeEnum = pgEnum("activity_type", [
  "restock",
  "sale",
  "alert",
  "order",
]);

// ── Categories ─────────────────────────────────────────

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").default(""),
  icon: text("icon").default("Package"),
  color: text("color").default("200 80% 50%"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

// ── Suppliers ──────────────────────────────────────────

export const suppliers = pgTable("suppliers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  contactName: text("contact_name").default(""),
  email: text("email").default(""),
  phone: text("phone").default(""),
  address: text("address").default(""),
  leadTimeDays: integer("lead_time_days").default(7),
  rating: integer("rating").default(3),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  products: many(products),
  purchaseOrders: many(purchaseOrders),
}));

// ── Products ───────────────────────────────────────────

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").default(""),
  categoryId: uuid("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  supplierId: uuid("supplier_id").references(() => suppliers.id, {
    onDelete: "set null",
  }),
  quantity: integer("quantity").default(0).notNull(),
  reorderPoint: integer("reorder_point").default(10).notNull(),
  unitCost: numeric("unit_cost", { precision: 12, scale: 2 })
    .default("0")
    .notNull(),
  sellingPrice: numeric("selling_price", { precision: 12, scale: 2 })
    .default("0")
    .notNull(),
  imageUrl: text("image_url"),
  barcode: text("barcode"),
  weight: numeric("weight", { precision: 10, scale: 2 }),
  dimensions: text("dimensions"),
  status: productStatusEnum("status").default("in-stock").notNull(),
  warehouseId: uuid("warehouse_id").references(() => warehouses.id, {
    onDelete: "set null",
  }),
  location: text("location"),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  supplier: one(suppliers, {
    fields: [products.supplierId],
    references: [suppliers.id],
  }),
  warehouse: one(warehouses, {
    fields: [products.warehouseId],
    references: [warehouses.id],
  }),
  variants: many(productVariants),
  pricingTiers: many(pricingTiers),
  stockEvents: many(stockEvents),
  alerts: many(alerts),
}));

// ── Product Variants ───────────────────────────────────

export const productVariants = pgTable("product_variants", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id")
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),
  label: text("label").notNull(),
  sku: text("sku").notNull(),
  quantity: integer("quantity").default(0).notNull(),
  unitCost: numeric("unit_cost", { precision: 12, scale: 2 })
    .default("0")
    .notNull(),
  attributes: jsonb("attributes").$type<Record<string, string>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const productVariantsRelations = relations(
  productVariants,
  ({ one }) => ({
    product: one(products, {
      fields: [productVariants.productId],
      references: [products.id],
    }),
  })
);

// ── Pricing Tiers ──────────────────────────────────────

export const pricingTiers = pgTable("pricing_tiers", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id")
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),
  minQty: integer("min_qty").notNull(),
  maxQty: integer("max_qty"),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pricingTiersRelations = relations(pricingTiers, ({ one }) => ({
  product: one(products, {
    fields: [pricingTiers.productId],
    references: [products.id],
  }),
}));

// ── Warehouses ─────────────────────────────────────────

export const warehouses = pgTable("warehouses", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  address: text("address").default(""),
  city: text("city").default(""),
  state: text("state").default(""),
  country: text("country").default("US"),
  capacity: integer("capacity").default(1000),
  currentStock: integer("current_stock").default(0),
  managerName: text("manager_name").default(""),
  phone: text("phone").default(""),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const warehousesRelations = relations(warehouses, ({ many }) => ({
  products: many(products),
}));

// ── Purchase Orders ────────────────────────────────────

export const purchaseOrders = pgTable("purchase_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  supplierId: uuid("supplier_id").references(() => suppliers.id, {
    onDelete: "set null",
  }),
  supplierName: text("supplier_name").notNull(),
  status: poStatusEnum("status").default("draft").notNull(),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 })
    .default("0")
    .notNull(),
  notes: text("notes").default(""),
  expectedDate: timestamp("expected_date"),
  receivedDate: timestamp("received_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const purchaseOrdersRelations = relations(
  purchaseOrders,
  ({ one, many }) => ({
    supplier: one(suppliers, {
      fields: [purchaseOrders.supplierId],
      references: [suppliers.id],
    }),
    items: many(orderItems),
  })
);

// ── Order Items ────────────────────────────────────────

export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .references(() => purchaseOrders.id, { onDelete: "cascade" })
    .notNull(),
  productId: uuid("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitCost: numeric("unit_cost", { precision: 12, scale: 2 }).notNull(),
});

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(purchaseOrders, {
    fields: [orderItems.orderId],
    references: [purchaseOrders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

// ── Stock Events ───────────────────────────────────────

export const stockEvents = pgTable("stock_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  productName: text("product_name").notNull(),
  type: stockEventTypeEnum("type").notNull(),
  quantityChange: integer("quantity_change").notNull(),
  previousQty: integer("previous_qty").notNull(),
  newQty: integer("new_qty").notNull(),
  reason: text("reason").default(""),
  performedBy: text("performed_by").default("System"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const stockEventsRelations = relations(stockEvents, ({ one }) => ({
  product: one(products, {
    fields: [stockEvents.productId],
    references: [products.id],
  }),
}));

// ── Alerts ─────────────────────────────────────────────

export const alerts = pgTable("alerts", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").references(() => products.id, {
    onDelete: "cascade",
  }),
  type: alertTypeEnum("type").notNull(),
  message: text("message").notNull(),
  dismissed: boolean("dismissed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const alertsRelations = relations(alerts, ({ one }) => ({
  product: one(products, {
    fields: [alerts.productId],
    references: [products.id],
  }),
}));

// ── Activities ─────────────────────────────────────────

export const activities = pgTable("activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: activityTypeEnum("type").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── AI Agents ─────────────────────────────────────────

export const aiAgents = pgTable("ai_agents", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  triggerType: text("trigger_type", {
    enum: [
      "low-stock",
      "overstock",
      "price-drop",
      "supplier-delay",
      "expiry-approaching",
      "demand-spike",
    ],
  }).notNull(),
  conditions: jsonb("conditions").$type<Record<string, unknown>>(),
  actions: jsonb("actions").$type<Record<string, unknown>>(),
  isActive: boolean("is_active").default(true),
  lastTriggered: timestamp("last_triggered"),
  executionCount: integer("execution_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const aiAgentsRelations = relations(aiAgents, ({ many }) => ({
  executions: many(agentExecutions),
}));

// ── Agent Executions ──────────────────────────────────

export const agentExecutions = pgTable("agent_executions", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentId: uuid("agent_id")
    .references(() => aiAgents.id, { onDelete: "cascade" })
    .notNull(),
  triggerData: jsonb("trigger_data").$type<Record<string, unknown>>(),
  actionTaken: text("action_taken").notNull(),
  result: text("result"),
  status: text("status", {
    enum: ["success", "failed", "pending", "rolled-back"],
  }),
  productsAffected: jsonb("products_affected").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const agentExecutionsRelations = relations(
  agentExecutions,
  ({ one }) => ({
    agent: one(aiAgents, {
      fields: [agentExecutions.agentId],
      references: [aiAgents.id],
    }),
  })
);

// ── Carbon Footprints ─────────────────────────────────

export const carbonFootprints = pgTable("carbon_footprints", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id")
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),
  transportEmissions: numeric("transport_emissions", { precision: 10, scale: 2 }).default("0"),
  manufacturingEmissions: numeric("manufacturing_emissions", { precision: 10, scale: 2 }).default("0"),
  packagingEmissions: numeric("packaging_emissions", { precision: 10, scale: 2 }).default("0"),
  storageEmissions: numeric("storage_emissions", { precision: 10, scale: 2 }).default("0"),
  totalEmissions: numeric("total_emissions", { precision: 10, scale: 2 }).default("0"),
  sustainabilityScore: integer("sustainability_score"),
  lastCalculated: timestamp("last_calculated").defaultNow(),
  notes: text("notes"),
});

export const carbonFootprintsRelations = relations(
  carbonFootprints,
  ({ one }) => ({
    product: one(products, {
      fields: [carbonFootprints.productId],
      references: [products.id],
    }),
  })
);

// ── IoT Sensors ───────────────────────────────────────

export const iotSensors = pgTable("iot_sensors", {
  id: uuid("id").defaultRandom().primaryKey(),
  warehouseId: uuid("warehouse_id").references(() => warehouses.id, {
    onDelete: "set null",
  }),
  sensorName: text("sensor_name").notNull(),
  sensorType: text("sensor_type", {
    enum: ["temperature", "humidity", "vibration", "light"],
  }).notNull(),
  location: text("location"),
  currentValue: numeric("current_value", { precision: 10, scale: 2 }),
  unit: text("unit"),
  minThreshold: numeric("min_threshold", { precision: 10, scale: 2 }),
  maxThreshold: numeric("max_threshold", { precision: 10, scale: 2 }),
  status: text("status", {
    enum: ["normal", "warning", "critical"],
  }).default("normal"),
  isActive: boolean("is_active").default(true),
  lastReading: timestamp("last_reading").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const iotSensorsRelations = relations(iotSensors, ({ one, many }) => ({
  warehouse: one(warehouses, {
    fields: [iotSensors.warehouseId],
    references: [warehouses.id],
  }),
  readings: many(iotReadings),
}));

// ── IoT Readings ──────────────────────────────────────

export const iotReadings = pgTable("iot_readings", {
  id: uuid("id").defaultRandom().primaryKey(),
  sensorId: uuid("sensor_id")
    .references(() => iotSensors.id, { onDelete: "cascade" })
    .notNull(),
  value: numeric("value", { precision: 10, scale: 2 }).notNull(),
  status: text("status", {
    enum: ["normal", "warning", "critical"],
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const iotReadingsRelations = relations(iotReadings, ({ one }) => ({
  sensor: one(iotSensors, {
    fields: [iotReadings.sensorId],
    references: [iotSensors.id],
  }),
}));

// ── Provenance Records ────────────────────────────────

export const provenanceRecords = pgTable("provenance_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  eventType: text("event_type", {
    enum: [
      "manufactured",
      "shipped",
      "received",
      "inspected",
      "stored",
      "sold",
      "returned",
    ],
  }).notNull(),
  description: text("description").notNull(),
  actor: text("actor").notNull(),
  location: text("location"),
  previousHash: text("previous_hash"),
  hash: text("hash").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  verified: boolean("verified").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const provenanceRecordsRelations = relations(
  provenanceRecords,
  ({ one }) => ({
    product: one(products, {
      fields: [provenanceRecords.productId],
      references: [products.id],
    }),
  })
);

// ── Demand Signals ────────────────────────────────────

export const demandSignals = pgTable("demand_signals", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id")
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),
  signalType: text("signal_type", {
    enum: ["purchase", "view", "cart-add", "wishlist", "return", "review"],
  }).notNull(),
  channel: text("channel", {
    enum: ["web", "mobile", "in-store", "wholesale", "marketplace"],
  }),
  customerSegment: text("customer_segment", {
    enum: ["new", "repeat", "wholesale", "enterprise"],
  }),
  quantity: integer("quantity").default(1),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const demandSignalsRelations = relations(demandSignals, ({ one }) => ({
  product: one(products, {
    fields: [demandSignals.productId],
    references: [products.id],
  }),
}));

// ── Perishable Batches ────────────────────────────────

export const perishableBatches = pgTable("perishable_batches", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id")
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),
  batchNumber: text("batch_number").notNull(),
  quantity: integer("quantity").notNull(),
  manufacturingDate: timestamp("manufacturing_date"),
  expiryDate: timestamp("expiry_date").notNull(),
  daysUntilExpiry: integer("days_until_expiry"),
  status: text("status", {
    enum: ["fresh", "approaching-expiry", "expired", "disposed"],
  }).default("fresh"),
  storageTemp: numeric("storage_temp", { precision: 5, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const perishableBatchesRelations = relations(
  perishableBatches,
  ({ one }) => ({
    product: one(products, {
      fields: [perishableBatches.productId],
      references: [products.id],
    }),
  })
);
