import { Router } from "express";
import { db } from "../db/index.js";
import { stockEvents, products, alerts, activities } from "../db/schema.js";
import { eq, ilike, or, desc, count, sql, and, sum } from "drizzle-orm";

const router = Router();

// GET /api/stock-events — list with filters
router.get("/", async (req, res) => {
  try {
    const {
      search = "",
      type,
      page = "0",
      limit = "15",
    } = req.query as Record<string, string>;

    const conditions = [];
    if (search) {
      conditions.push(
        or(
          ilike(stockEvents.productName, `%${search}%`),
          ilike(stockEvents.reason, `%${search}%`),
          ilike(stockEvents.performedBy, `%${search}%`)
        )
      );
    }
    if (type && type !== "all") {
      conditions.push(eq(stockEvents.type, type as any));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = parseInt(page) * parseInt(limit);

    const [items, totalResult, summaryResult] = await Promise.all([
      db.query.stockEvents.findMany({
        where,
        orderBy: [desc(stockEvents.createdAt)],
        limit: parseInt(limit),
        offset,
      }),
      db.select({ count: count() }).from(stockEvents).where(where),
      db
        .select({
          type: stockEvents.type,
          totalChange: sum(stockEvents.quantityChange),
          eventCount: count(),
        })
        .from(stockEvents)
        .groupBy(stockEvents.type),
    ]);

    res.json({
      events: items,
      total: totalResult[0]?.count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      summary: summaryResult,
    });
  } catch (error) {
    console.error("Error fetching stock events:", error);
    res.status(500).json({ error: "Failed to fetch stock events" });
  }
});

// POST /api/stock-events — create stock event (manual adjustment)
router.post("/", async (req, res) => {
  try {
    const { productId, type, quantityChange, reason, performedBy } = req.body;

    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });
    if (!product) return res.status(404).json({ error: "Product not found" });

    const newQty = product.quantity + quantityChange;
    if (newQty < 0)
      return res.status(400).json({ error: "Cannot reduce below 0" });

    const status =
      newQty === 0
        ? "out"
        : newQty <= product.reorderPoint
          ? "low"
          : ("in-stock" as const);

    // Update product
    await db
      .update(products)
      .set({ quantity: newQty, status, lastUpdated: new Date() })
      .where(eq(products.id, productId));

    // Create event
    const [event] = await db
      .insert(stockEvents)
      .values({
        productId,
        productName: product.name,
        type,
        quantityChange,
        previousQty: product.quantity,
        newQty,
        reason,
        performedBy: performedBy || "Current User",
      })
      .returning();

    // Regenerate alerts
    await db.delete(alerts).where(eq(alerts.productId, productId));
    if (newQty === 0) {
      await db.insert(alerts).values({
        productId,
        type: "out-of-stock",
        message: `${product.name} is out of stock`,
      });
    } else if (newQty <= product.reorderPoint) {
      await db.insert(alerts).values({
        productId,
        type: "low-stock",
        message: `${product.name} is below reorder point (${newQty}/${product.reorderPoint})`,
      });
    }

    // Log activity
    await db.insert(activities).values({
      type: type === "sale" ? "sale" : "restock",
      message: `${type}: ${Math.abs(quantityChange)}x ${product.name}`,
    });

    res.status(201).json(event);
  } catch (error) {
    console.error("Error creating stock event:", error);
    res.status(500).json({ error: "Failed to create stock event" });
  }
});

export default router;
