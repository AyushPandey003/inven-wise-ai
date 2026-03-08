import { Router } from "express";
import { db } from "../db/index.js";
import {
  products,
  productVariants,
  pricingTiers,
  stockEvents,
  alerts,
  activities,
} from "../db/schema.js";
import { eq, ilike, or, sql, desc, and, count } from "drizzle-orm";

const router = Router();

// GET /api/products — list with search, filter, sort, pagination
router.get("/", async (req, res) => {
  try {
    const {
      search = "",
      category,
      status,
      sortBy = "name",
      sortDir = "asc",
      page = "0",
      limit = "10",
    } = req.query as Record<string, string>;

    const conditions = [];
    if (search) {
      conditions.push(
        or(
          ilike(products.name, `%${search}%`),
          ilike(products.sku, `%${search}%`)
        )
      );
    }
    if (category && category !== "all") {
      conditions.push(eq(products.categoryId, category));
    }
    if (status && status !== "all") {
      conditions.push(eq(products.status, status as any));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const validSortColumns: Record<string, any> = {
      name: products.name,
      sku: products.sku,
      quantity: products.quantity,
      unitCost: products.unitCost,
      sellingPrice: products.sellingPrice,
      lastUpdated: products.lastUpdated,
      status: products.status,
    };

    const sortColumn = validSortColumns[sortBy] || products.name;
    const orderBy =
      sortDir === "desc" ? sql`${sortColumn} desc` : sql`${sortColumn} asc`;

    const offset = parseInt(page) * parseInt(limit);

    const [items, totalResult] = await Promise.all([
      db.query.products.findMany({
        where,
        orderBy: () => [orderBy],
        limit: parseInt(limit),
        offset,
        with: {
          category: true,
          supplier: true,
          warehouse: true,
          variants: true,
          pricingTiers: true,
        },
      }),
      db.select({ count: count() }).from(products).where(where),
    ]);

    res.json({
      products: items,
      total: totalResult[0]?.count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// GET /api/products/:id — single product with relations
router.get("/:id", async (req, res) => {
  try {
    const product = await db.query.products.findFirst({
      where: eq(products.id, req.params.id),
      with: {
        category: true,
        supplier: true,
        warehouse: true,
        variants: true,
        pricingTiers: true,
        stockEvents: { orderBy: [desc(stockEvents.createdAt)], limit: 20 },
      },
    });
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// POST /api/products — create product
router.post("/", async (req, res) => {
  try {
    const data = req.body;
    const status =
      data.quantity === 0
        ? "out"
        : data.quantity <= data.reorderPoint
          ? "low"
          : "in-stock";

    const [product] = await db
      .insert(products)
      .values({
        ...data,
        status,
        unitCost: String(data.unitCost),
        sellingPrice: String(data.sellingPrice),
        weight: data.weight ? String(data.weight) : null,
      })
      .returning();

    // Log activity
    await db.insert(activities).values({
      type: "restock",
      message: `Added new product: ${product.name}`,
    });

    // Generate alerts
    await generateAlertsForProduct(product);

    res.status(201).json(product);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ error: "Failed to create product" });
  }
});

// PUT /api/products/:id — update product
router.put("/:id", async (req, res) => {
  try {
    const data = req.body;
    const status =
      data.quantity === 0
        ? "out"
        : data.quantity <= data.reorderPoint
          ? "low"
          : "in-stock";

    const [product] = await db
      .update(products)
      .set({
        ...data,
        status,
        unitCost: String(data.unitCost),
        sellingPrice: String(data.sellingPrice),
        weight: data.weight ? String(data.weight) : null,
        lastUpdated: new Date(),
      })
      .where(eq(products.id, req.params.id))
      .returning();

    if (!product) return res.status(404).json({ error: "Product not found" });

    // Regenerate alerts
    await db.delete(alerts).where(eq(alerts.productId, product.id));
    await generateAlertsForProduct(product);

    res.json(product);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Failed to update product" });
  }
});

// DELETE /api/products — bulk delete
router.delete("/", async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids?.length) return res.status(400).json({ error: "No IDs provided" });

    for (const id of ids) {
      await db.delete(products).where(eq(products.id, id));
    }

    res.json({ deleted: ids.length });
  } catch (error) {
    console.error("Error deleting products:", error);
    res.status(500).json({ error: "Failed to delete products" });
  }
});

// POST /api/products/:id/restock — restock a product
router.post("/:id/restock", async (req, res) => {
  try {
    const { quantity } = req.body;
    const product = await db.query.products.findFirst({
      where: eq(products.id, req.params.id),
    });
    if (!product) return res.status(404).json({ error: "Product not found" });

    const newQty = product.quantity + quantity;
    const status =
      newQty === 0
        ? "out"
        : newQty <= product.reorderPoint
          ? "low"
          : "in-stock";

    const [updated] = await db
      .update(products)
      .set({ quantity: newQty, status, lastUpdated: new Date() })
      .where(eq(products.id, req.params.id))
      .returning();

    // Log stock event
    await db.insert(stockEvents).values({
      productId: product.id,
      productName: product.name,
      type: "restock",
      quantityChange: quantity,
      previousQty: product.quantity,
      newQty,
      reason: "Manual restock",
      performedBy: "Current User",
    });

    // Log activity
    await db.insert(activities).values({
      type: "restock",
      message: `Restocked ${quantity}x ${product.name}`,
    });

    // Regenerate alerts
    await db.delete(alerts).where(eq(alerts.productId, product.id));
    await generateAlertsForProduct(updated);

    res.json(updated);
  } catch (error) {
    console.error("Error restocking product:", error);
    res.status(500).json({ error: "Failed to restock product" });
  }
});

// POST /api/products/:id/variants — add variant
router.post("/:id/variants", async (req, res) => {
  try {
    const [variant] = await db
      .insert(productVariants)
      .values({
        ...req.body,
        productId: req.params.id,
        unitCost: String(req.body.unitCost),
      })
      .returning();
    res.status(201).json(variant);
  } catch (error) {
    console.error("Error adding variant:", error);
    res.status(500).json({ error: "Failed to add variant" });
  }
});

// POST /api/products/:id/pricing-tiers — add pricing tier
router.post("/:id/pricing-tiers", async (req, res) => {
  try {
    const [tier] = await db
      .insert(pricingTiers)
      .values({
        ...req.body,
        productId: req.params.id,
        price: String(req.body.price),
      })
      .returning();
    res.status(201).json(tier);
  } catch (error) {
    console.error("Error adding pricing tier:", error);
    res.status(500).json({ error: "Failed to add pricing tier" });
  }
});

async function generateAlertsForProduct(product: any) {
  if (product.quantity === 0) {
    await db.insert(alerts).values({
      productId: product.id,
      type: "out-of-stock",
      message: `${product.name} is out of stock`,
    });
  } else if (product.quantity <= product.reorderPoint) {
    await db.insert(alerts).values({
      productId: product.id,
      type: "low-stock",
      message: `${product.name} is below reorder point (${product.quantity}/${product.reorderPoint})`,
    });
  } else if (product.quantity > product.reorderPoint * 5) {
    await db.insert(alerts).values({
      productId: product.id,
      type: "overstock",
      message: `${product.name} may be overstocked (${product.quantity} units)`,
    });
  }
}

export default router;
