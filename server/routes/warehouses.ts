import { Router } from "express";
import { db } from "../db/index.js";
import { warehouses, products } from "../db/schema.js";
import { eq, count, sum, sql } from "drizzle-orm";

const router = Router();

// GET /api/warehouses — list all with stats
router.get("/", async (_req, res) => {
  try {
    const items = await db.query.warehouses.findMany({
      orderBy: (w, { asc }) => [asc(w.name)],
    });

    // Fetch stats per warehouse
    const stats = await db
      .select({
        warehouseId: products.warehouseId,
        productCount: count(),
        totalQuantity: sum(products.quantity),
        totalValue: sql<string>`sum(${products.quantity} * ${products.unitCost}::numeric)`,
      })
      .from(products)
      .groupBy(products.warehouseId);

    const statsMap = new Map(stats.map((s) => [s.warehouseId, s]));
    const enriched = items.map((w) => {
      const s = statsMap.get(w.id);
      return {
        ...w,
        productCount: s ? Number(s.productCount) : 0,
        totalQuantity: s ? Number(s.totalQuantity) : 0,
        totalValue: s ? Number(s.totalValue) : 0,
        utilizationPct: w.capacity
          ? Math.round(
              ((s ? Number(s.totalQuantity) : 0) / w.capacity) * 100
            )
          : 0,
      };
    });

    res.json(enriched);
  } catch (error) {
    console.error("Error fetching warehouses:", error);
    res.status(500).json({ error: "Failed to fetch warehouses" });
  }
});

// GET /api/warehouses/:id
router.get("/:id", async (req, res) => {
  try {
    const warehouse = await db.query.warehouses.findFirst({
      where: eq(warehouses.id, req.params.id),
      with: {
        products: {
          with: { category: true },
        },
      },
    });
    if (!warehouse)
      return res.status(404).json({ error: "Warehouse not found" });
    res.json(warehouse);
  } catch (error) {
    console.error("Error fetching warehouse:", error);
    res.status(500).json({ error: "Failed to fetch warehouse" });
  }
});

// POST /api/warehouses
router.post("/", async (req, res) => {
  try {
    const [warehouse] = await db
      .insert(warehouses)
      .values(req.body)
      .returning();
    res.status(201).json(warehouse);
  } catch (error) {
    console.error("Error creating warehouse:", error);
    res.status(500).json({ error: "Failed to create warehouse" });
  }
});

// PUT /api/warehouses/:id
router.put("/:id", async (req, res) => {
  try {
    const [warehouse] = await db
      .update(warehouses)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(warehouses.id, req.params.id))
      .returning();
    if (!warehouse)
      return res.status(404).json({ error: "Warehouse not found" });
    res.json(warehouse);
  } catch (error) {
    console.error("Error updating warehouse:", error);
    res.status(500).json({ error: "Failed to update warehouse" });
  }
});

// DELETE /api/warehouses/:id
router.delete("/:id", async (req, res) => {
  try {
    await db.delete(warehouses).where(eq(warehouses.id, req.params.id));
    res.json({ deleted: true });
  } catch (error) {
    console.error("Error deleting warehouse:", error);
    res.status(500).json({ error: "Failed to delete warehouse" });
  }
});

export default router;
