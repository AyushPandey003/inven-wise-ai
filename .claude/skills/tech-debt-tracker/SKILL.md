---
name: tech-debt-tracker
description: Identifies, categorizes, and creates actionable payoff plans for technical debt. Use when user asks about "tech debt", "refactoring plan", "legacy code", "code smell", "codebase health", "paying down debt", "modernization", "rewrite vs refactor", "strangler fig pattern", or when reviewing a codebase for quality and maintainability issues.
metadata:
  author: Senior Dev Skills Suite
  version: 1.0.0
  category: engineering
  tags: [tech-debt, refactoring, code-quality, legacy, modernization]
---

# Tech Debt Tracker Skill

Tech debt is a financial metaphor for a reason: it accrues interest. A small debt unchecked becomes a codebase nobody wants to touch. Treat it like real debt: document it, prioritize it, and pay it down deliberately.

## Debt Classification System

### Type 1: Deliberate-Prudent
"We know this is not the right design, but we need to ship now."
→ Acceptable if documented. Create a ticket immediately.

### Type 2: Deliberate-Reckless
"We don't have time for design."
→ Never acceptable. Stop this from being created.

### Type 3: Inadvertent-Prudent
"Now we know we should have used CQRS."
→ Expected as you learn. Refactor when it causes pain.

### Type 4: Inadvertent-Reckless
"What's layered architecture?"
→ Training / hiring gap. Address at team level.

---

## Debt Audit: Code Smell Catalog

### Complexity Smells
```
- Functions > 40 lines (should be 1 thing, fit on screen)
- Files > 300 lines (probably doing too many things)
- Cyclomatic complexity > 10 (too many branches to reason about)
- Nesting depth > 3 levels (guard clauses can fix most of this)
- God classes (know everything, do everything)
- Long parameter lists > 4 params (use an options object/struct)
```

### Duplication Smells
```
- Copy-pasted blocks > 10 lines in 2+ places
- Multiple implementations of the same concept
- Parallel class hierarchies that must change together
- Constants defined in multiple files
```

### Coupling Smells
```
- Class imports > 10 other modules
- Circular dependencies between modules
- Feature envy (method uses another class's data more than its own)
- Inappropriate intimacy (class accesses internal state of another)
- Service A calls Service B calls Service C (deep call chains)
```

### Hygiene Smells
```
- TODO/FIXME comments > 6 months old (they're permanent)
- Dead code (commented-out blocks, unreachable branches)
- Magic numbers (what does 86400 mean again?)
- Boolean parameters (createUser(email, true, false) — what are those flags?)
- Missing error handling (bare catch {})
```

---

## Debt Scoring Matrix

Score each debt item:

```
Impact Score (1–5):
  5 = Blocks daily development
  4 = Slows features by >50%
  3 = Regular source of bugs
  2 = Annoying but manageable
  1 = Minor inconvenience

Effort Score (1–5):
  1 = < 2 hours
  2 = 1–2 days
  3 = 1 week (1 sprint)
  4 = 2–4 weeks (1 quarter)
  5 = > 1 month (multi-quarter)

Priority = Impact / Effort
```

| Debt Item | Impact | Effort | Priority | Owner | Milestone |
|-----------|--------|--------|----------|-------|-----------|
| Payment service spaghetti | 5 | 4 | 1.25 | Backend team | Q2 2025 |
| Missing test coverage (auth) | 4 | 2 | 2.00 | Any | Sprint 14 |
| Hardcoded config strings | 2 | 1 | 2.00 | Junior dev | This sprint |
| Old ORM version | 3 | 3 | 1.00 | Backend | Q3 2025 |

**Pay down debt in order of Priority score (highest first).**

---

## Refactoring Strategies

### When to Refactor vs Rewrite

**Refactor when:**
- Code has good test coverage (safety net exists)
- Problems are localized to modules
- Team understands the domain well
- Business can't tolerate a rewrite freeze

**Rewrite when:**
- Fundamental architectural mismatch
- Technology is truly end-of-life (no path to upgrade)
- Code has no tests AND is not understood by anyone
- Cost of strangler fig > cost of rewrite

**Strangler Fig Pattern (safe incremental rewrite):**
```
1. Build new system alongside old
2. Route some traffic to new (proxy/feature flag)
3. Expand new system's scope incrementally
4. Shrink old system until it's gone
5. NEVER: big bang rewrite where old system is thrown away on day 1
```

---

## Refactoring Recipes

### Extract Function (most common)
```typescript
// ❌ Before: one function doing many things
function processOrder(order: Order) {
  // validate
  if (!order.items.length) throw new Error('Empty order')
  if (order.total < 0) throw new Error('Invalid total')
  
  // calculate discounts
  let discount = 0
  if (order.coupon) {
    discount = order.total * 0.1
  }
  
  // charge
  stripe.charge(order.total - discount)
  
  // notify
  email.send(order.user, 'Your order is confirmed')
}

// ✅ After: each function has one job
function validateOrder(order: Order): void {
  if (!order.items.length) throw new ValidationError('Empty order')
  if (order.total < 0) throw new ValidationError('Invalid total')
}

function calculateDiscount(order: Order): number {
  return order.coupon ? order.total * 0.1 : 0
}

function processOrder(order: Order): void {
  validateOrder(order)
  const discount = calculateDiscount(order)
  stripe.charge(order.total - discount)
  email.send(order.user, 'Your order is confirmed')
}
```

### Replace Magic Number with Named Constant
```typescript
// ❌ Before
if (user.trialDays > 14) { ... }
const sessionExpiry = 86400

// ✅ After
const TRIAL_PERIOD_DAYS = 14
const SESSION_TTL_SECONDS = 24 * 60 * 60  // 1 day

if (user.trialDays > TRIAL_PERIOD_DAYS) { ... }
```

### Guard Clause (reduce nesting)
```typescript
// ❌ Before: arrow-head anti-pattern
function processPayment(payment) {
  if (payment) {
    if (payment.isValid()) {
      if (payment.amount > 0) {
        if (!payment.isExpired()) {
          charge(payment)
        }
      }
    }
  }
}

// ✅ After: guard clauses, happy path at bottom
function processPayment(payment) {
  if (!payment) throw new Error('Payment required')
  if (!payment.isValid()) throw new ValidationError('Invalid payment')
  if (payment.amount <= 0) throw new ValidationError('Amount must be positive')
  if (payment.isExpired()) throw new Error('Payment method expired')
  
  charge(payment)
}
```

---

## Tech Debt Register Template

Create `docs/TECH_DEBT.md` in the repo:

```markdown
# Technical Debt Register

Last updated: YYYY-MM-DD
Next review: YYYY-MM-DD (quarterly)

## Active Debt

### [TD-001] Payment Service — Missing Error Recovery
- **Type**: Inadvertent-Prudent
- **Location**: `src/services/payment.service.ts`
- **Description**: Payment failures don't retry — any network blip causes order loss.
- **Impact**: P1 on-call incidents, revenue loss
- **Impact Score**: 5 | **Effort Score**: 3 | **Priority**: 1.67
- **Fix Plan**: Add idempotent retry with exponential backoff + DLQ
- **Owner**: @backend-team
- **Target**: Sprint 15
- **Created**: 2024-11-01 | **By**: @alice

### [TD-002] Auth Module — No Refresh Token Rotation
...

## Resolved Debt

### [TD-000] Removed deprecated v1 API endpoints
- Resolved in: PR #421
- Date: 2024-10-15
- Effort actual: 3 days

## Debt Policy
- All new debt must be logged here before code is merged
- Debt register reviewed quarterly with Engineering Lead
- No debt item may stay in register > 12 months without a resolution decision
```

---

## Output for Debt Audit

```markdown
## Tech Debt Audit: [Codebase / Module Name]

### Executive Summary
- Total items found: N
- Critical (Priority > 2.0): N
- Estimated total paydown effort: X weeks
- Recommended Q[X] focus areas: [list]

### Debt Register (sorted by priority)
[Table using scoring matrix above]

### Quick Wins (< 2 hours each)
[List items with Effort=1, ready for junior devs]

### This Sprint Recommendations
[Top 3 items to address immediately]

### Roadmap
- Q[N]: [theme]
- Q[N+1]: [theme]
```
