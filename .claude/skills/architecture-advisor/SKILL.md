---
name: architecture-advisor
description: Provides senior architect-level guidance on system design, architectural decisions, and technical strategy. Use when user asks to "design a system", "architecture for", "how should I structure", "system design interview", "microservices vs monolith", "scale this", "ADR", "architecture decision", or needs to evaluate technical tradeoffs at a structural level. Produces ADRs, diagrams (text-based), and tradeoff matrices.
metadata:
  author: Senior Dev Skills Suite
  version: 1.0.0
  category: engineering
  tags: [architecture, system-design, ADR, scalability, distributed-systems]
---

# Architecture Advisor Skill

Think like a Staff/Principal Engineer. Every architecture decision has tradeoffs — your job is to make them explicit, not hide them. Never recommend "best practice" without contextualizing it to THIS team's scale, constraints, and maturity.

## Step 1: Context Gathering

Before advising, understand:
1. **Scale**: Current users/RPS, 6-month projection, 2-year ceiling?
2. **Team**: How many engineers? Polyglot or single-language shop?
3. **Constraints**: Existing infra, compliance (SOC2, HIPAA, PCI?), cloud vs on-prem?
4. **Maturity**: Greenfield or retrofitting? Startup or enterprise?
5. **SLAs**: Uptime target? Acceptable latency p99? RPO/RTO for disaster recovery?

## Step 2: Architecture Decision Records (ADR)

For any significant decision, produce a formal ADR:

```markdown
# ADR-[number]: [Short Title]

**Date**: YYYY-MM-DD  
**Status**: Proposed | Accepted | Superseded  
**Deciders**: [roles, not names]

## Context
[What problem are we solving? What forces are at play?]

## Decision
[What are we doing?]

## Considered Alternatives
| Option | Pros | Cons | Why Rejected |
|--------|------|------|--------------|
| Option A | ... | ... | ... |
| Option B | ... | ... | Chosen |

## Consequences
**Positive:**
- [benefit 1]

**Negative / Tradeoffs:**
- [cost 1 — be honest]

**Risks:**
- [What could go wrong? Mitigation?]

## Review Trigger
[When should this decision be revisited? What metric/event?]
```

## Step 3: System Design Framework

When designing a system from scratch, walk through these layers:

### 1. Requirements Clarification
- Functional: What must the system DO?
- Non-functional: Latency, availability, durability, consistency needs
- Out of scope: What are we explicitly NOT building?

### 2. Capacity Estimation
```
Traffic:   X users × Y actions/day = Z requests/sec (peak 3–10×)
Storage:   X entities × Y bytes × Z years retention = N GB
Bandwidth: X requests/sec × Y KB avg payload = Z Mbps
```

### 3. High-Level Design (describe as text diagram)
```
[Client] → [CDN/Edge] → [Load Balancer]
                              ↓
                    [API Gateway / BFF]
                    ↙          ↘
            [Service A]    [Service B]
                ↓                ↓
          [DB: Postgres]   [DB: Redis]
                ↓
          [Message Queue]
                ↓
          [Service C (async)]
```

### 4. Data Model
- Primary entities and relationships
- Read vs write patterns
- Consistency requirements per entity

### 5. Key Design Decisions
Address these explicitly:
- **Sync vs async**: Which operations need immediate response? Which can be queued?
- **Consistency model**: Strong, eventual, or causal consistency?
- **Caching strategy**: Cache-aside, write-through, or write-behind? TTL?
- **Failure modes**: What breaks when each dependency fails?
- **Data partitioning**: Sharding key if applicable

## Step 4: Monolith vs Microservices Decision Matrix

| Factor | Favor Monolith | Favor Microservices |
|--------|---------------|---------------------|
| Team size | < 8 engineers | > 20 engineers |
| Domain clarity | Unclear/evolving | Well-defined bounded contexts |
| Deploy frequency | < 5/day | > 20/day per service |
| Scale needs | Uniform | Highly differential per component |
| Org maturity | Startup / early | Platform / infra team exists |
| Current state | Greenfield | Already distributed |

**Rule of thumb**: Start as a modular monolith. Extract services when a module has a clear owner team, independent scaling needs, or incompatible deployment cadence.

## Step 5: Common Patterns Reference

### Saga Pattern (distributed transactions)
Use when you need atomicity across services without 2PC:
- Choreography: services emit events, react to each other (good for simple flows)
- Orchestration: central saga orchestrator calls services (good for complex flows)

### CQRS + Event Sourcing
Use when: read and write models diverge significantly, or you need full audit trail.
Cost: significant complexity — only adopt if the use case demands it.

### Circuit Breaker
```
CLOSED (normal) → [failure threshold hit] → OPEN (fail fast)
OPEN → [timeout] → HALF-OPEN (probe) → [success] → CLOSED
```
Use: any synchronous call to an external service.

### Outbox Pattern
Use to guarantee at-least-once delivery from DB write → message queue:
1. Write to DB + outbox table in same transaction
2. Separate poller reads outbox → publishes to queue → marks sent

## Step 6: Technology Selection Framework

When selecting a technology, score on:
1. **Fit**: Does it actually solve the problem?
2. **Operational maturity**: Can YOUR team run it in prod?
3. **Ecosystem**: Libraries, community, hiring pool?
4. **Exit cost**: How painful is it to replace in 2 years?
5. **License / cost**: TCO including infra + engineering time?

Always document the runner-up and why it lost. Future you will thank present you.

## Output Templates

### For system design: produce High-Level Design + 3 key ADRs
### For "should I use X or Y": produce comparison table + recommendation with conditions
### For scaling problems: produce bottleneck analysis + remediation roadmap
### For greenfield: produce phased architecture plan (MVP → Growth → Scale)
