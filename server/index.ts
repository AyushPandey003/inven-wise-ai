import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createRouteHandler } from "uploadthing/express";
import uploadExtraRouter, { uploadRouter } from "./routes/upload.js";

import authRouter from "./routes/auth.js";
import productsRouter from "./routes/products.js";
import categoriesRouter from "./routes/categories.js";
import suppliersRouter from "./routes/suppliers.js";
import ordersRouter from "./routes/orders.js";
import stockEventsRouter from "./routes/stock-events.js";
import warehousesRouter from "./routes/warehouses.js";
import alertsRouter from "./routes/alerts.js";
import dashboardRouter from "./routes/dashboard.js";
import provenanceRouter from "./routes/provenance.js";
import { requireAuth } from "./middleware/auth.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Allow localhost (dev) + the deployed Vercel URL (FRONTEND_URL env var)
const allowedOrigins = [
  "http://localhost:8080",
  "http://localhost:5173",
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Also allow any *.vercel.app subdomain for preview deployments
    if (/\.vercel\.app$/.test(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// ── Public routes (no auth needed) ──
app.use("/api/auth", authRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// UploadThing route handler
app.use(
  "/api/uploadthing",
  createRouteHandler({ router: uploadRouter })
);

// ── Protected routes (require auth + tenantId) ──
app.use("/api/products", requireAuth, productsRouter);
app.use("/api/categories", requireAuth, categoriesRouter);
app.use("/api/suppliers", requireAuth, suppliersRouter);
app.use("/api/orders", requireAuth, ordersRouter);
app.use("/api/stock-events", requireAuth, stockEventsRouter);
app.use("/api/warehouses", requireAuth, warehousesRouter);
app.use("/api/alerts", requireAuth, alertsRouter);
app.use("/api/dashboard", requireAuth, dashboardRouter);
app.use("/api/provenance", requireAuth, provenanceRouter);
app.use("/api/upload", requireAuth, uploadExtraRouter);

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
