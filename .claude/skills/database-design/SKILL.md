---
name: database-design
description: Designs production-grade database schemas, migrations, and data models. Use when user asks to "design a database", "create schema", "data model", "ER diagram", "database migration", "normalization", "which database should I use", "PostgreSQL vs MySQL", "SQL vs NoSQL", "database indexing strategy", or needs to model entities and their relationships for an application.
metadata:
  author: Senior Dev Skills Suite
  version: 1.0.0
  category: engineering
  tags: [database, schema, postgres, migrations, data-modeling, SQL, NoSQL]
---

# Database Design Skill

A good schema is hard to change later. Design for the queries you need to run, not just the objects you want to store. Every design decision compounds.

## Step 1: Requirements Gathering

Before designing, understand:
1. **Read/write ratio**: 90/10 read-heavy vs 10/90 write-heavy → different indexing strategies
2. **Consistency needs**: Strong (banking) vs eventual (social feed) vs no consistency (analytics)?
3. **Scale**: Rows today? In 2 years? Multi-region?
4. **Query patterns**: What are the 5 most common queries? Latency SLA?
5. **Retention**: How long is data kept? Archive policy?

---

## Step 2: Database Selection

### Use PostgreSQL when:
- Relational data with complex joins
- ACID transactions required
- JSON + structured data mixed
- Full-text search needed (built-in)
- Default choice for most web apps

### Use MySQL when:
- Existing MySQL ecosystem
- Simple OLTP workloads
- Team prefers MySQL (mostly equivalent to Postgres today)

### Use MongoDB when:
- Truly document-shaped data (content management, catalogs)
- Schema is highly variable per document
- No complex cross-document joins
- **Warning**: If you're adding `$lookup` everywhere, use Postgres instead

### Use Redis when:
- Caching, sessions, rate limiting
- Pub/sub messaging
- Leaderboards, real-time counters
- Temporary data with TTL

### Use ClickHouse / BigQuery when:
- Analytics / OLAP workloads
- Aggregations over billions of rows
- Time-series analysis at scale
- NOT for OLTP / transactional data

### Use Cassandra / DynamoDB when:
- Massive write throughput (millions RPS)
- Simple access patterns (key-value or range)
- Multi-region active-active required
- **Cost**: operational complexity is very high

---

## Step 3: Schema Design Rules

### Naming Conventions (PostgreSQL)
```sql
-- Tables: snake_case, plural nouns
CREATE TABLE users (...);
CREATE TABLE order_items (...);

-- Columns: snake_case
user_id, created_at, first_name, is_active

-- Primary keys: always 'id'
id UUID DEFAULT gen_random_uuid() PRIMARY KEY
-- OR for high-volume insert: BIGSERIAL

-- Foreign keys: {referenced_table_singular}_id
user_id REFERENCES users(id)
order_id REFERENCES orders(id)

-- Timestamps: always include both
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

-- Soft delete: prefer over hard delete for auditability
deleted_at TIMESTAMPTZ  -- NULL means active
```

### Standard Table Template
```sql
CREATE TABLE resources (
  id          UUID          NOT NULL DEFAULT gen_random_uuid(),
  
  -- Your columns here
  name        TEXT          NOT NULL,
  status      TEXT          NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'inactive', 'archived')),
  metadata    JSONB,
  
  -- Ownership / relationships
  user_id     UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id      UUID          NOT NULL REFERENCES organizations(id),
  
  -- Audit columns (ALWAYS include)
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,                          -- NULL = not deleted
  
  PRIMARY KEY (id)
);

-- Auto-update updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON resources
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Index for common queries
CREATE INDEX idx_resources_user_id ON resources (user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_resources_org_status ON resources (org_id, status) WHERE deleted_at IS NULL;
```

---

## Step 4: Normalization Guide

### When to Normalize (3NF)
- Data referenced by multiple entities (users, categories, tags)
- Data that changes (user email, product price history)
- When storage efficiency matters

### When to Denormalize
- Frequently read, rarely written (read-heavy reporting)
- Performance-critical queries after proven normalization is slow
- Event sourcing / audit logs (append-only records of state)

### Many-to-Many Relationships
```sql
-- ✅ Proper junction table with its own metadata
CREATE TABLE user_roles (
  user_id     UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id     UUID    NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID    REFERENCES users(id),
  
  PRIMARY KEY (user_id, role_id)
);

-- ❌ Don't store arrays of IDs as a column
-- user.role_ids = [1, 2, 3]  ← can't join, can't enforce FK
```

---

## Step 5: Migration Best Practices

### Migration File Structure
```
migrations/
├── 001_create_users.sql
├── 002_create_organizations.sql
├── 003_add_stripe_customer_id_to_users.sql
└── 004_create_subscriptions.sql
```

### Safe Migration Patterns (Zero Downtime)

**Adding a column:**
```sql
-- ✅ Safe: nullable column with default
ALTER TABLE users ADD COLUMN phone TEXT;

-- ✅ Safe: column with server-side default (no table rewrite)
ALTER TABLE users ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- ⚠️ Dangerous on large tables: NOT NULL without default causes lock
ALTER TABLE users ADD COLUMN required_field TEXT NOT NULL;
-- Fix: add nullable → backfill → add NOT NULL constraint
```

**Renaming a column (zero-downtime):**
```sql
-- Step 1 (deploy A): add new column, dual-write in app
ALTER TABLE users ADD COLUMN full_name TEXT;

-- Step 2 (backfill): copy data
UPDATE users SET full_name = first_name || ' ' || last_name;

-- Step 3 (deploy B): read from new column
-- Step 4 (deploy C): drop old columns
ALTER TABLE users DROP COLUMN first_name, DROP COLUMN last_name;
```

**Adding an index (non-blocking):**
```sql
-- ✅ CONCURRENTLY: doesn't lock table
CREATE INDEX CONCURRENTLY idx_users_email ON users (lower(email));

-- ❌ Without CONCURRENTLY: locks entire table during build
CREATE INDEX idx_users_email ON users (email);
```

---

## Step 6: Index Design

### Index Decision Tree
```
Is this column used in WHERE clauses?    → Consider index
Is it used in JOIN ON?                   → Index (high priority)
Is it used in ORDER BY?                  → Consider composite index with filter
Is cardinality high (many unique vals)?  → Good index candidate
Is cardinality low (boolean, status)?    → Partial index or skip
Is it write-heavy (> 1000 inserts/sec)?  → Fewer indexes (each adds write cost)
```

### Index Types
```sql
-- B-tree (default): equality, ranges, ORDER BY
CREATE INDEX ON users (email);

-- Partial: for subset of rows (most common queries on active records)
CREATE INDEX ON orders (user_id) WHERE status != 'deleted';

-- Composite: covers multi-column queries (order of columns matters!)
-- Column order: equality filters first, then range/sort columns
CREATE INDEX ON events (tenant_id, created_at DESC);

-- GIN: for JSONB, arrays, full-text search
CREATE INDEX ON products USING GIN (tags);
CREATE INDEX ON users USING GIN (to_tsvector('english', bio));

-- Expression: for computed values
CREATE UNIQUE INDEX ON users (lower(email));  -- Case-insensitive unique email
```

---

## Step 7: Data Integrity

```sql
-- Foreign key behavior
ON DELETE CASCADE    -- Delete child when parent deleted (orders → items)
ON DELETE RESTRICT   -- Prevent parent delete if children exist (users with orders)
ON DELETE SET NULL   -- Null the FK when parent deleted (optional associations)

-- Check constraints (enforced by DB, not just app)
CONSTRAINT positive_amount CHECK (amount > 0)
CONSTRAINT valid_email CHECK (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'deleted'))

-- Unique constraints
UNIQUE (user_id, organization_id)           -- Composite unique
CREATE UNIQUE INDEX ON users (lower(email)) -- Expression unique
```

---

## Schema Documentation Template

For each table, document:
```sql
COMMENT ON TABLE users IS 
  'Platform users. Includes both customers and internal staff (role determines access).';

COMMENT ON COLUMN users.external_id IS 
  'Stripe customer ID. NULL until user adds a payment method.';

COMMENT ON COLUMN users.deleted_at IS 
  'Soft delete timestamp. NULL means active. Deleted users cannot log in but 
   records are retained for billing and audit purposes.';
```
