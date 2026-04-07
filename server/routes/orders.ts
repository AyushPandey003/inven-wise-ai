import { Router } from "express";
import { db } from "../db/index.js";
import {
  purchaseOrders,
  orderItems,
  activities,
  products,
  stockEvents,
  alerts,
} from "../db/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";

const router = Router();

// GET /api/orders — list all with items
router.get("/", async (req, res) => {
  try {
    const tenantId = req.tenantId!;
    const orders = await db.query.purchaseOrders.findMany({
      where: eq(purchaseOrders.tenantId, tenantId),
      orderBy: [desc(purchaseOrders.createdAt)],
      with: {
        items: true,
        supplier: true,
      },
    });
    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// GET /api/orders/:id
router.get("/:id", async (req, res) => {
  try {
    const tenantId = req.tenantId!;
    const order = await db.query.purchaseOrders.findFirst({
      where: and(eq(purchaseOrders.id, req.params.id), eq(purchaseOrders.tenantId, tenantId)),
      with: { items: true, supplier: true },
    });
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

// POST /api/orders — create order with items
router.post("/", async (req, res) => {
  try {
    const tenantId = req.tenantId!;
    const { items, supplierName, supplierId, notes, expectedDate } = req.body;
    const totalAmount = items.reduce(
      (s: number, i: any) => s + i.quantity * i.unitCost,
      0
    );

    const [order] = await db
      .insert(purchaseOrders)
      .values({
        tenantId,
        supplierId,
        supplierName,
        totalAmount: String(totalAmount),
        notes,
        expectedDate: expectedDate ? new Date(expectedDate) : null,
      })
      .returning();

    // Insert order items
    if (items?.length) {
      await db.insert(orderItems).values(
        items.map((item: any) => ({
          orderId: order.id,
          productId: item.productId,
          productName: item.productName || "Unknown",
          quantity: item.quantity,
          unitCost: String(item.unitCost),
        }))
      );
    }

    // Log activity
    await db.insert(activities).values({
      tenantId,
      type: "order",
      message: `Purchase order created for ${supplierName}`,
    });

    const full = await db.query.purchaseOrders.findFirst({
      where: eq(purchaseOrders.id, order.id),
      with: { items: true, supplier: true },
    });

    res.status(201).json(full);
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// PUT /api/orders/:id/status — update order status
router.put("/:id/status", async (req, res) => {
  try {
    const tenantId = req.tenantId!;
    const { status } = req.body;

    const [order] = await db
      .update(purchaseOrders)
      .set({
        status,
        updatedAt: new Date(),
        ...(status === "received" ? { receivedDate: new Date() } : {}),
      })
      .where(and(eq(purchaseOrders.id, req.params.id), eq(purchaseOrders.tenantId, tenantId)))
      .returning();

    if (!order) return res.status(404).json({ error: "Order not found" });

    // If received, update product quantities
    if (status === "received") {
      const items = await db.query.orderItems.findMany({
        where: eq(orderItems.orderId, order.id),
      });

      for (const item of items) {
        if (!item.productId) continue;
        const product = await db.query.products.findFirst({
          where: and(eq(products.id, item.productId), eq(products.tenantId, tenantId)),
        });
        if (!product) continue;

        const newQty = product.quantity + item.quantity;
        const newStatus =
          newQty === 0
            ? "out"
            : newQty <= product.reorderPoint
              ? "low"
              : ("in-stock" as const);

        await db
          .update(products)
          .set({ quantity: newQty, status: newStatus, lastUpdated: new Date() })
          .where(eq(products.id, item.productId));

        await db.insert(stockEvents).values({
          tenantId,
          productId: item.productId,
          productName: item.productName,
          type: "restock",
          quantityChange: item.quantity,
          previousQty: product.quantity,
          newQty,
          reason: `PO ${order.id.slice(0, 8)} received`,
          performedBy: "System",
        });

        // Regenerate alerts for this product
        await db.delete(alerts).where(eq(alerts.productId, item.productId));
        const updatedProduct = await db.query.products.findFirst({
          where: eq(products.id, item.productId),
        });
        if (updatedProduct) {
          if (updatedProduct.quantity === 0) {
            await db.insert(alerts).values({
              tenantId,
              productId: updatedProduct.id,
              type: "out-of-stock",
              message: `${updatedProduct.name} is out of stock`,
            });
          } else if (updatedProduct.quantity <= updatedProduct.reorderPoint) {
            await db.insert(alerts).values({
              tenantId,
              productId: updatedProduct.id,
              type: "low-stock",
              message: `${updatedProduct.name} is below reorder point`,
            });
          }
        }
      }

      await db.insert(activities).values({
        tenantId,
        type: "order",
        message: `PO ${order.id.slice(0, 8)} received — stock updated`,
      });
    } else {
      await db.insert(activities).values({
        tenantId,
        type: "order",
        message: `PO ${order.id.slice(0, 8)} status → ${status}`,
      });
    }

    res.json(order);
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

// DELETE /api/orders/:id
router.delete("/:id", async (req, res) => {
  try {
    const tenantId = req.tenantId!;
    await db
      .delete(purchaseOrders)
      .where(and(eq(purchaseOrders.id, req.params.id), eq(purchaseOrders.tenantId, tenantId)));
    res.json({ deleted: true });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({ error: "Failed to delete order" });
  }
});

export default router;
