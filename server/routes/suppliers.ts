import { Router } from "express";
import { db } from "../db/index.js";
import { suppliers, products } from "../db/schema.js";
import { eq, ilike, or, count } from "drizzle-orm";

const router = Router();

// GET /api/suppliers — list with search
router.get("/", async (req, res) => {
  try {
    const { search = "" } = req.query as Record<string, string>;
    const conditions = search
      ? or(
          ilike(suppliers.name, `%${search}%`),
          ilike(suppliers.contactName, `%${search}%`)
        )
      : undefined;

    const items = await db.query.suppliers.findMany({
      where: conditions,
      orderBy: (s, { asc }) => [asc(s.name)],
    });

    // Get product counts per supplier
    const counts = await db
      .select({
        supplierId: products.supplierId,
        count: count(),
      })
      .from(products)
      .groupBy(products.supplierId);

    const countMap = new Map(counts.map((c) => [c.supplierId, Number(c.count)]));
    const enriched = items.map((s) => ({
      ...s,
      productCount: countMap.get(s.id) || 0,
    }));

    res.json(enriched);
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    res.status(500).json({ error: "Failed to fetch suppliers" });
  }
});

// GET /api/suppliers/:id
router.get("/:id", async (req, res) => {
  try {
    const supplier = await db.query.suppliers.findFirst({
      where: eq(suppliers.id, req.params.id),
      with: { products: true },
    });
    if (!supplier)
      return res.status(404).json({ error: "Supplier not found" });
    res.json(supplier);
  } catch (error) {
    console.error("Error fetching supplier:", error);
    res.status(500).json({ error: "Failed to fetch supplier" });
  }
});

// POST /api/suppliers
router.post("/", async (req, res) => {
  try {
    const [supplier] = await db
      .insert(suppliers)
      .values(req.body)
      .returning();
    res.status(201).json(supplier);
  } catch (error) {
    console.error("Error creating supplier:", error);
    res.status(500).json({ error: "Failed to create supplier" });
  }
});

// PUT /api/suppliers/:id
router.put("/:id", async (req, res) => {
  try {
    const [supplier] = await db
      .update(suppliers)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(suppliers.id, req.params.id))
      .returning();
    if (!supplier)
      return res.status(404).json({ error: "Supplier not found" });
    res.json(supplier);
  } catch (error) {
    console.error("Error updating supplier:", error);
    res.status(500).json({ error: "Failed to update supplier" });
  }
});

// DELETE /api/suppliers/:id
router.delete("/:id", async (req, res) => {
  try {
    await db.delete(suppliers).where(eq(suppliers.id, req.params.id));
    res.json({ deleted: true });
  } catch (error) {
    console.error("Error deleting supplier:", error);
    res.status(500).json({ error: "Failed to delete supplier" });
  }
});

export default router;
