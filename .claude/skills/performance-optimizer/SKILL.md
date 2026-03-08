---
name: performance-optimizer
description: Identifies and fixes performance bottlenecks in code, databases, and systems. Use when user asks about "performance", "slow query", "optimize this", "N+1 query", "latency", "profiling", "memory leak", "slow API", "database optimization", "caching strategy", "load time", "bundle size", or when code/queries need performance analysis and improvement.
metadata:
  author: Senior Dev Skills Suite
  version: 1.0.0
  category: engineering
  tags: [performance, optimization, database, caching, profiling, latency]
---

# Performance Optimizer Skill

Measure before you optimize. Premature optimization is the root of all evil — but ignoring obvious bottlenecks is professional negligence. Always benchmark the before state.

## Step 1: Identify the Bottleneck Type

Before optimizing, classify:
- **CPU-bound**: High computation (parsing, encoding, crypto, ML)
- **I/O-bound**: Waiting on DB, network, disk, external APIs
- **Memory-bound**: GC pressure, large allocations, memory leaks
- **Concurrency-bound**: Lock contention, connection pool exhaustion, single-threaded bottleneck

Different problems need different solutions. Don't cache a CPU problem.

---

## Database Performance

### N+1 Query Detection and Fix

```typescript
// ❌ N+1 — fires 1 query for orders + 1 per order for user
const orders = await Order.findAll()
for (const order of orders) {
  order.user = await User.findById(order.userId) // N queries!
}

// ✅ JOIN — 1 query total
const orders = await Order.findAll({
  include: [{ model: User, required: true }]
})

// ✅ Batched — 2 queries total (DataLoader pattern)
const orders = await Order.findAll()
const userIds = [...new Set(orders.map(o => o.userId))]
const users = await User.findAll({ where: { id: userIds } })
const userMap = new Map(users.map(u => [u.id, u]))
orders.forEach(o => { o.user = userMap.get(o.userId) })
```

### Index Strategy

```sql
-- Find slow queries (PostgreSQL)
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Check missing indexes
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 123 AND status = 'pending';
-- Look for: Seq Scan → needs index
-- Good sign: Index Scan

-- Composite index: order matters! Most selective first, then range/sort cols
CREATE INDEX CONCURRENTLY idx_orders_user_status 
  ON orders (user_id, status) 
  WHERE deleted_at IS NULL;  -- Partial index: excludes deleted rows

-- Covering index: avoids table lookup entirely
CREATE INDEX idx_orders_list ON orders (user_id, created_at DESC) 
  INCLUDE (id, status, total_amount);
```

### Query Optimization Patterns

```sql
-- ❌ Function on indexed column defeats index
SELECT * FROM orders WHERE DATE(created_at) = '2025-01-01';

-- ✅ Range query uses index
SELECT * FROM orders 
WHERE created_at >= '2025-01-01' AND created_at < '2025-01-02';

-- ❌ SELECT * — fetches unnecessary columns
SELECT * FROM users WHERE email = 'x@example.com';

-- ✅ Select only what you need
SELECT id, name, email FROM users WHERE email = 'x@example.com';

-- ❌ Correlated subquery — runs once per row
SELECT *, (SELECT COUNT(*) FROM orders WHERE user_id = u.id) AS order_count
FROM users u;

-- ✅ Window function or JOIN — single pass
SELECT u.*, COUNT(o.id) OVER (PARTITION BY u.id) AS order_count
FROM users u LEFT JOIN orders o ON o.user_id = u.id;
```

### Connection Pool Tuning
```
Pool size formula: connections = (cpu_cores × 2) + effective_spindle_count
Example: 4 cores, SSD → pool_size = 9–10

Never set pool_size > DB max_connections
Use pgBouncer in transaction mode for > 100 concurrent app instances
```

---

## Caching Strategy

### Cache-Aside Pattern (most common)
```typescript
async function getUser(id: string): Promise<User> {
  const cacheKey = `user:${id}`
  
  // 1. Check cache
  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached)
  
  // 2. Cache miss — fetch from DB
  const user = await db.users.findById(id)
  if (!user) throw new NotFoundError()
  
  // 3. Populate cache with TTL
  await redis.setex(cacheKey, 300, JSON.stringify(user)) // 5 min TTL
  
  return user
}

// Invalidate on mutation
async function updateUser(id: string, data: Partial<User>): Promise<User> {
  const user = await db.users.update(id, data)
  await redis.del(`user:${id}`)  // Invalidate
  return user
}
```

### What to Cache (and for How Long)

| Data Type | Strategy | TTL |
|-----------|----------|-----|
| User profile | Cache-aside | 5 min |
| Config/feature flags | Cache-aside | 1 min |
| Session data | Cache-aside | TTL = session length |
| Search results | Cache-aside | 30 sec |
| Rendered HTML pages | CDN edge cache | 1–60 min |
| Static assets | CDN + immutable | 1 year (with hash in URL) |
| Real-time data | DO NOT cache | — |

### Cache Stampede Prevention
```typescript
// Problem: many requests miss cache simultaneously, hammer DB

// Solution: probabilistic early expiration (PER)
async function getWithPER(key: string, ttl: number, fetch: () => Promise<any>) {
  const result = await redis.get(key)
  if (result) {
    const { value, expiresAt } = JSON.parse(result)
    const remainingTtl = expiresAt - Date.now() / 1000
    
    // Probabilistically refresh before expiry
    if (remainingTtl > 0 && Math.random() > remainingTtl / (ttl * 0.1)) {
      return value  // Use cached value
    }
  }
  
  // Fetch fresh data
  const fresh = await fetch()
  await redis.setex(key, ttl, JSON.stringify({
    value: fresh,
    expiresAt: Date.now() / 1000 + ttl
  }))
  return fresh
}
```

---

## API & Network Performance

### Response Time Budget (target for web APIs)
```
p50 < 100ms   — fast, users don't notice
p95 < 500ms   — acceptable
p99 < 1000ms  — investigate
p99.9 > 2s    — alert, users are leaving
```

### Compression
```typescript
// Always enable gzip/brotli for JSON APIs
app.use(compression({ threshold: 1024 }))  // Only compress > 1KB

// Brotli is 15-25% smaller than gzip for JSON
// Use at CDN/proxy level for best CPU efficiency
```

### Pagination (never return unbounded lists)
```typescript
// ❌ Returns everything — OOM risk
const users = await db.users.findAll()

// ✅ Cursor-based (stable under inserts)
const users = await db.users.findAll({
  where: { id: { [Op.gt]: cursor } },
  limit: 50,
  order: [['id', 'ASC']]
})
```

---

## Frontend Performance

### Bundle Size
```bash
# Analyze bundle
npx webpack-bundle-analyzer dist/stats.json

# Red flags:
# - moment.js (use date-fns or dayjs: 97% smaller)
# - lodash (use individual imports or native methods)
# - importing entire icon libraries

# Fix: tree-shaking + code splitting
import { format } from 'date-fns'                    # Not: import * as dateFns
import { Search } from 'lucide-react'                 # Not: import * as Icons
const HeavyChart = lazy(() => import('./HeavyChart'))  # Lazy load below fold
```

### Core Web Vitals Targets
```
LCP (Largest Contentful Paint):  < 2.5s  (preload hero images)
FID / INP (Interaction delay):   < 100ms (avoid long tasks on main thread)
CLS (Cumulative Layout Shift):   < 0.1   (explicit image dimensions)
TTFB (Time to First Byte):       < 600ms (CDN, edge caching)
```

---

## Memory Leak Detection (Node.js)

```bash
# Heap snapshot comparison
node --inspect app.js
# Chrome DevTools → Memory → Heap snapshot
# Take 2 snapshots 5 min apart after load
# Filter "Objects allocated between snapshots"
# Growing: Event listeners, closures holding refs, cache without TTL

# Quick check: monitor heap over time
setInterval(() => {
  const used = process.memoryUsage().heapUsed / 1024 / 1024
  console.log(`Heap: ${used.toFixed(2)} MB`)
}, 30000)
```

### Common Node.js Memory Leaks
```typescript
// ❌ Event listener never removed
emitter.on('data', handler)
// ✅
emitter.on('data', handler)
// ...later
emitter.off('data', handler)

// ❌ Cache grows forever
const cache = new Map()
cache.set(key, value)
// ✅ Use LRU cache with size limit
import LRU from 'lru-cache'
const cache = new LRU({ max: 500, ttl: 1000 * 60 * 5 })
```

---

## Performance Optimization Output Format

When reporting on performance issues:
```markdown
## Performance Analysis: [component/query/endpoint]

### Baseline Metrics
- Current p50/p95/p99 latency
- Current throughput (RPS)
- Resource usage (CPU/memory at load)

### Bottleneck Identified
[Specific issue with evidence — query plan, flame chart, benchmark]

### Recommended Fix
[Code/query/config change with explanation]

### Expected Impact
- Estimated latency improvement: Xms → Yms
- Estimated throughput improvement: X RPS → Y RPS
- Effort: [hours]

### Verification
[How to measure after the fix: specific benchmark command or metric]
```
