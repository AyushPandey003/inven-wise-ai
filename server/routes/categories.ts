import { Router } from "express";
import { db } from "../db/index.js";
import { categories, products } from "../db/schema.js";
import { eq, count, sum, sql } from "drizzle-orm";

const router = Router();

// GET /api/categories — list all with stats
router.get("/", async (_req, res) => {
  try {
    const cats = await db.query.categories.findMany({
      orderBy: (c, { asc }) => [asc(c.name)],
    });

    // Fetch stats per category
    const stats = await db
      .select({
        categoryId: products.categoryId,
        productCount: count(),
        totalQuantity: sum(products.quantity),
        totalValue: sql<string>`sum(${products.quantity} * ${products.unitCost}::numeric)`,
      })
      .from(products)
      .groupBy(products.categoryId);

    const statsMap = new Map(stats.map((s) => [s.categoryId, s]));
    const enriched = cats.map((c) => {
      const s = statsMap.get(c.id);
      return {
        ...c,
        productCount: s ? Number(s.productCount) : 0,
        totalQuantity: s ? Number(s.totalQuantity) : 0,
        totalValue: s ? Number(s.totalValue) : 0,
      };
    });

    res.json(enriched);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// POST /api/categories
router.post("/", async (req, res) => {
  try {
    const [category] = await db
      .insert(categories)
      .values(req.body)
      .returning();
    res.status(201).json(category);
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({ error: "Failed to create category" });
  }
});

// PUT /api/categories/:id
router.put("/:id", async (req, res) => {
  try {
    const [category] = await db
      .update(categories)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(categories.id, req.params.id))
      .returning();
    if (!category)
      return res.status(404).json({ error: "Category not found" });
    res.json(category);
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ error: "Failed to update category" });
  }
});

// DELETE /api/categories/:id
router.delete("/:id", async (req, res) => {
  try {
    await db.delete(categories).where(eq(categories.id, req.params.id));
    res.json({ deleted: true });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

export default router;
