import { Router } from "express";
import {
  createUploadthing,
  type FileRouter as UTFileRouter,
} from "uploadthing/express";
import { db } from "../db/index.js";
import { products } from "../db/schema.js";
import { eq } from "drizzle-orm";

const f = createUploadthing();

export const uploadRouter = {
  productImage: f({
    image: { maxFileSize: "4MB", maxFileCount: 1 },
  }).onUploadComplete(async ({ file }) => {
    console.log("Upload complete:", file.ufsUrl);
    return { url: file.ufsUrl };
  }),

  productImages: f({
    image: { maxFileSize: "4MB", maxFileCount: 5 },
  }).onUploadComplete(async ({ file }) => {
    console.log("Upload complete:", file.ufsUrl);
    return { url: file.ufsUrl };
  }),

  importCSV: f({
    "text/csv": { maxFileSize: "8MB", maxFileCount: 1 },
  }).onUploadComplete(async ({ file }) => {
    console.log("CSV upload complete:", file.ufsUrl);
    return { url: file.ufsUrl };
  }),
} satisfies UTFileRouter;

export type AppFileRouter = typeof uploadRouter;

// Additional route for updating product image
const router = Router();

router.put("/product-image/:productId", async (req, res) => {
  try {
    const { imageUrl } = req.body;
    const [product] = await db
      .update(products)
      .set({ imageUrl, lastUpdated: new Date() })
      .where(eq(products.id, req.params.productId))
      .returning();
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (error) {
    console.error("Error updating product image:", error);
    res.status(500).json({ error: "Failed to update product image" });
  }
});

export default router;
