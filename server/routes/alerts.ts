import { Router } from "express";
import { db } from "../db/index.js";
import { alerts } from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

// GET /api/alerts — list all
router.get("/", async (req, res) => {
  try {
    const tenantId = req.tenantId!;
    const items = await db.query.alerts.findMany({
      where: eq(alerts.tenantId, tenantId),
      orderBy: [desc(alerts.createdAt)],
    });
    res.json(items);
  } catch (error) {
    console.error("Error fetching alerts:", error);
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

// PUT /api/alerts/:id/dismiss — dismiss alert
router.put("/:id/dismiss", async (req, res) => {
  try {
    const tenantId = req.tenantId!;
    const [alert] = await db
      .update(alerts)
      .set({ dismissed: true })
      .where(and(eq(alerts.id, req.params.id), eq(alerts.tenantId, tenantId)))
      .returning();
    if (!alert) return res.status(404).json({ error: "Alert not found" });
    res.json(alert);
  } catch (error) {
    console.error("Error dismissing alert:", error);
    res.status(500).json({ error: "Failed to dismiss alert" });
  }
});

// DELETE /api/alerts/dismissed — clear dismissed alerts
router.delete("/dismissed", async (req, res) => {
  try {
    const tenantId = req.tenantId!;
    await db.delete(alerts).where(and(eq(alerts.dismissed, true), eq(alerts.tenantId, tenantId)));
    res.json({ cleared: true });
  } catch (error) {
    console.error("Error clearing alerts:", error);
    res.status(500).json({ error: "Failed to clear alerts" });
  }
});

export default router;
