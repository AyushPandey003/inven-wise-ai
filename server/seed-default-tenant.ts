/**
 * Creates a default tenant and user for the app owner (you).
 * Also migrates any existing data (rows with null tenant_id) to this default tenant.
 *
 * Run: pnpm tsx server/seed-default-tenant.ts
 */

import "dotenv/config";
import { db } from "./db/index.js";
import { tenants, users, products, categories, suppliers, warehouses, purchaseOrders, stockEvents, alerts, activities, aiAgents, iotSensors } from "./db/schema.js";
import { eq, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seedDefaultTenant() {
  console.log("🔧 Setting up default tenant...\n");

  // 1. Check if default tenant already exists
  const existingTenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, "default"),
  });

  let tenantId: string;

  if (existingTenant) {
    tenantId = existingTenant.id;
    console.log(`✅ Default tenant already exists: ${tenantId}`);
  } else {
    // Create default tenant
    const [tenant] = await db.insert(tenants).values({
      name: "InvenWise (Default)",
      slug: "default",
      email: "admin@invenwise.local",
      plan: "enterprise",
      status: "active",
      onboardingStatus: "completed",
      industry: "Technology",
      currency: "USD",
      timezone: "UTC",
    }).returning();

    tenantId = tenant.id;
    console.log(`✅ Created default tenant: ${tenantId}`);
  }

  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, "admin@invenwise.local"),
  });

  if (existingUser) {
    console.log(`✅ Default admin user already exists: ${existingUser.id}`);
  } else {
    const passwordHash = await bcrypt.hash("admin123", 12);
    const [user] = await db.insert(users).values({
      tenantId,
      email: "admin@invenwise.local",
      passwordHash,
      firstName: "Admin",
      lastName: "Owner",
      role: "owner",
      isActive: true,
    }).returning();

    console.log(`✅ Created default admin user: ${user.id} (admin@invenwise.local / admin123)`);
  }

  // 3. Migrate existing data (null tenant_id) to default tenant
  console.log("\n📦 Migrating existing data to default tenant...");

  const tables = [
    { table: products, name: "products" },
    { table: categories, name: "categories" },
    { table: suppliers, name: "suppliers" },
    { table: warehouses, name: "warehouses" },
    { table: purchaseOrders, name: "purchase_orders" },
    { table: stockEvents, name: "stock_events" },
    { table: alerts, name: "alerts" },
    { table: activities, name: "activities" },
    { table: aiAgents, name: "ai_agents" },
    { table: iotSensors, name: "iot_sensors" },
  ];

  for (const { table, name } of tables) {
    try {
      const result = await db
        .update(table)
        .set({ tenantId } as any)
        .where(isNull((table as any).tenantId))
        .returning();

      if (result.length > 0) {
        console.log(`  ✅ ${name}: migrated ${result.length} rows`);
      } else {
        console.log(`  ⏭️  ${name}: no rows to migrate`);
      }
    } catch (err) {
      console.log(`  ⚠️  ${name}: skipped (${(err as Error).message})`);
    }
  }

  console.log("\n🎉 Default tenant setup complete!");
  console.log(`\n📝 Login credentials for default account:`);
  console.log(`   Email:    admin@invenwise.local`);
  console.log(`   Password: admin123`);
  console.log(`   (Change this in production!)\n`);
}

seedDefaultTenant()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
