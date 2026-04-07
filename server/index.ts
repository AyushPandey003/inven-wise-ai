import "dotenv/config";
import express from "express";
import cors from "cors";
import { createRouteHandler } from "uploadthing/express";
import uploadExtraRouter, { uploadRouter } from "./routes/upload.js";

import productsRouter from "./routes/products.js";
import categoriesRouter from "./routes/categories.js";
import suppliersRouter from "./routes/suppliers.js";
import ordersRouter from "./routes/orders.js";
import stockEventsRouter from "./routes/stock-events.js";
import warehousesRouter from "./routes/warehouses.js";
import alertsRouter from "./routes/alerts.js";
import dashboardRouter from "./routes/dashboard.js";
import provenanceRouter from "./routes/provenance.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: ["http://localhost:8080", "http://localhost:5173"] }));
app.use(express.json({ limit: "10mb" }));

// UploadThing route handler
app.use(
  "/api/uploadthing",
  createRouteHandler({ router: uploadRouter })
);

// API routes
app.use("/api/products", productsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/suppliers", suppliersRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/stock-events", stockEventsRouter);
app.use("/api/warehouses", warehousesRouter);
app.use("/api/alerts", alertsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/provenance", provenanceRouter);
app.use("/api/upload", uploadExtraRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
