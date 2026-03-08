import { Router } from "express";
import { db } from "../db/index.js";
import { alerts } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";

const router = Router();

// GET /api/alerts — list all
router.get("/", async (_req, res) => {
  try {
    const items = await db.query.alerts.findMany({
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
    const [alert] = await db
      .update(alerts)
      .set({ dismissed: true })
      .where(eq(alerts.id, req.params.id))
      .returning();
    if (!alert) return res.status(404).json({ error: "Alert not found" });
    res.json(alert);
  } catch (error) {
    console.error("Error dismissing alert:", error);
    res.status(500).json({ error: "Failed to dismiss alert" });
  }
});

// DELETE /api/alerts/dismissed — clear dismissed alerts
router.delete("/dismissed", async (_req, res) => {
  try {
    await db.delete(alerts).where(eq(alerts.dismissed, true));
    res.json({ cleared: true });
  } catch (error) {
    console.error("Error clearing alerts:", error);
    res.status(500).json({ error: "Failed to clear alerts" });
  }
});

export default router;
