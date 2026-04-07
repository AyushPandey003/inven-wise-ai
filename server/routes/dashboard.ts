import { Router } from "express";
import { db } from "../db/index.js";
import {
  products,
  categories,
  alerts,
  activities,
  purchaseOrders,
  stockEvents,
} from "../db/schema.js";
import { eq, count, sum, sql, desc, and, gte } from "drizzle-orm";

const router = Router();

// GET /api/dashboard — aggregated stats for dashboard
router.get("/", async (req, res) => {
  try {
    const tenantId = req.tenantId!;

    // Basic KPIs
    const [productStats] = await db
      .select({
        totalProducts: count(),
        totalQuantity: sum(products.quantity),
        totalValue: sql<string>`sum(${products.quantity} * ${products.unitCost}::numeric)`,
        totalRetailValue: sql<string>`sum(${products.quantity} * ${products.sellingPrice}::numeric)`,
      })
      .from(products)
      .where(eq(products.tenantId, tenantId));

    const [lowStockCount] = await db
      .select({ count: count() })
      .from(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.status, "low")));

    const [outOfStockCount] = await db
      .select({ count: count() })
      .from(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.status, "out")));

    const [pendingOrders] = await db
      .select({ count: count() })
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.tenantId, tenantId), eq(purchaseOrders.status, "sent")));

    const [activeAlerts] = await db
      .select({ count: count() })
      .from(alerts)
      .where(and(eq(alerts.tenantId, tenantId), eq(alerts.dismissed, false)));

    // Category breakdown
    const categoryBreakdown = await db
      .select({
        categoryId: products.categoryId,
        categoryName: categories.name,
        color: categories.color,
        productCount: count(),
        totalValue: sql<string>`sum(${products.quantity} * ${products.unitCost}::numeric)`,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.tenantId, tenantId))
      .groupBy(products.categoryId, categories.name, categories.color);

    // Top products by value
    const topProducts = await db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        value: sql<string>`(${products.quantity} * ${products.unitCost}::numeric)`,
        quantity: products.quantity,
      })
      .from(products)
      .where(eq(products.tenantId, tenantId))
      .orderBy(sql`(${products.quantity} * ${products.unitCost}::numeric) desc`)
      .limit(8);

    // Recent activities
    const recentActivities = await db.query.activities.findMany({
      where: eq(activities.tenantId, tenantId),
      orderBy: [desc(activities.createdAt)],
      limit: 10,
    });

    // Stock events over last 14 days for timeline
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000);
    const stockTimeline = await db
      .select({
        date: sql<string>`date_trunc('day', ${stockEvents.createdAt})::date`,
        totalIn: sql<string>`sum(case when ${stockEvents.quantityChange} > 0 then ${stockEvents.quantityChange} else 0 end)`,
        totalOut: sql<string>`sum(case when ${stockEvents.quantityChange} < 0 then abs(${stockEvents.quantityChange}) else 0 end)`,
      })
      .from(stockEvents)
      .where(and(eq(stockEvents.tenantId, tenantId), gte(stockEvents.createdAt, fourteenDaysAgo)))
      .groupBy(sql`date_trunc('day', ${stockEvents.createdAt})::date`)
      .orderBy(sql`date_trunc('day', ${stockEvents.createdAt})::date`);

    res.json({
      kpis: {
        totalProducts: productStats.totalProducts || 0,
        totalQuantity: Number(productStats.totalQuantity) || 0,
        totalValue: Number(productStats.totalValue) || 0,
        totalRetailValue: Number(productStats.totalRetailValue) || 0,
        lowStockCount: lowStockCount.count || 0,
        outOfStockCount: outOfStockCount.count || 0,
        pendingOrders: pendingOrders.count || 0,
        activeAlerts: activeAlerts.count || 0,
      },
      categoryBreakdown: categoryBreakdown.map((c) => ({
        ...c,
        totalValue: Number(c.totalValue) || 0,
      })),
      topProducts: topProducts.map((p) => ({
        ...p,
        value: Number(p.value) || 0,
      })),
      recentActivities,
      stockTimeline: stockTimeline.map((s) => ({
        date: s.date,
        totalIn: Number(s.totalIn) || 0,
        totalOut: Number(s.totalOut) || 0,
      })),
    });
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

export default router;
