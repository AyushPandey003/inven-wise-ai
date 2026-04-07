import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db/index.js";
import { tenants, users } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { generateToken, requireAuth, type AuthPayload } from "../middleware/auth.js";

const router = Router();

// ── POST /api/auth/register — Create new tenant + owner user (onboarding step 1) ──
router.post("/register", async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // Check if email already exists across any tenant
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (existingUser) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    // Create a temporary tenant (will be completed during onboarding)
    const slug = `tenant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14-day trial

    const [tenant] = await db
      .insert(tenants)
      .values({
        name: `${firstName}'s Organization`,
        slug,
        email: email.toLowerCase(),
        status: "trial",
        onboardingStatus: "company-info",
        trialEndsAt,
      })
      .returning();

    // Hash password and create owner user
    const passwordHash = await bcrypt.hash(password, 12);

    const [user] = await db
      .insert(users)
      .values({
        tenantId: tenant.id,
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        role: "owner",
        isActive: true,
      })
      .returning();

    const tokenPayload: AuthPayload = {
      userId: user.id,
      tenantId: tenant.id,
      email: user.email,
      role: user.role,
    };

    const token = generateToken(tokenPayload);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        onboardingStatus: tenant.onboardingStatus,
        plan: tenant.plan,
        status: tenant.status,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

// ── POST /api/auth/login ──
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
      with: { tenant: true },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "Account is deactivated" });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Update last login
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    const tokenPayload: AuthPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
    };

    const token = generateToken(tokenPayload);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
        onboardingStatus: user.tenant.onboardingStatus,
        plan: user.tenant.plan,
        status: user.tenant.status,
        logo: user.tenant.logo,
        currency: user.tenant.currency,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// ── GET /api/auth/me — Get current user + tenant info ──
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user!.userId),
      with: { tenant: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
        onboardingStatus: user.tenant.onboardingStatus,
        plan: user.tenant.plan,
        status: user.tenant.status,
        logo: user.tenant.logo,
        industry: user.tenant.industry,
        currency: user.tenant.currency,
        timezone: user.tenant.timezone,
        settings: user.tenant.settings,
      },
    });
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({ error: "Failed to fetch user info" });
  }
});

// ── PUT /api/auth/onboarding/company — Onboarding step: Company Info ──
router.put("/onboarding/company", requireAuth, async (req, res) => {
  try {
    const { companyName, industry, companySize, country, phone } = req.body;
    const tenantId = req.tenantId!;

    if (!companyName) {
      return res.status(400).json({ error: "Company name is required" });
    }

    // Generate a proper slug from company name
    const slug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      + "-" + Math.random().toString(36).slice(2, 6);

    const [updated] = await db
      .update(tenants)
      .set({
        name: companyName,
        slug,
        industry: industry || "",
        companySize: companySize || "",
        country: country || "",
        phone: phone || "",
        onboardingStatus: "business-config",
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId))
      .returning();

    res.json({
      tenant: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        onboardingStatus: updated.onboardingStatus,
      },
    });
  } catch (error) {
    console.error("Onboarding company error:", error);
    res.status(500).json({ error: "Failed to update company info" });
  }
});

// ── PUT /api/auth/onboarding/business-config — Onboarding step: Business Config ──
router.put("/onboarding/business-config", requireAuth, async (req, res) => {
  try {
    const { currency, timezone, settings } = req.body;
    const tenantId = req.tenantId!;

    const [updated] = await db
      .update(tenants)
      .set({
        currency: currency || "USD",
        timezone: timezone || "UTC",
        settings: settings || {},
        onboardingStatus: "completed",
        status: "trial",
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId))
      .returning();

    res.json({
      tenant: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        onboardingStatus: updated.onboardingStatus,
        currency: updated.currency,
        timezone: updated.timezone,
      },
    });
  } catch (error) {
    console.error("Onboarding business config error:", error);
    res.status(500).json({ error: "Failed to update business config" });
  }
});

// ── POST /api/auth/onboarding/skip — Skip remaining onboarding ──
router.post("/onboarding/skip", requireAuth, async (req, res) => {
  try {
    const tenantId = req.tenantId!;

    const [updated] = await db
      .update(tenants)
      .set({
        onboardingStatus: "completed",
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId))
      .returning();

    res.json({
      tenant: {
        id: updated.id,
        name: updated.name,
        onboardingStatus: updated.onboardingStatus,
      },
    });
  } catch (error) {
    console.error("Skip onboarding error:", error);
    res.status(500).json({ error: "Failed to skip onboarding" });
  }
});

// ── POST /api/auth/invite — Invite a team member (owner/admin only) ──
router.post("/invite", requireAuth, async (req, res) => {
  try {
    if (!["owner", "admin"].includes(req.user!.role)) {
      return res.status(403).json({ error: "Only owners and admins can invite users" });
    }

    const { email, firstName, lastName, role, password } = req.body;
    const tenantId = req.tenantId!;

    if (!email || !firstName || !lastName || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if email already exists in this tenant
    const existing = await db.query.users.findFirst({
      where: and(
        eq(users.email, email.toLowerCase()),
        eq(users.tenantId, tenantId)
      ),
    });

    if (existing) {
      return res.status(409).json({ error: "User already exists in this organization" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [user] = await db
      .insert(users)
      .values({
        tenantId,
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        role: role || "viewer",
        isActive: true,
      })
      .returning();

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Invite error:", error);
    res.status(500).json({ error: "Failed to invite user" });
  }
});

export default router;
