---
name: incident-response
description: Guides through production incident management, postmortem writing, and runbook creation. Use when user says "production is down", "outage", "incident", "postmortem", "RCA", "root cause analysis", "runbook", "on-call", "alert firing", "service degraded", or needs to handle or document a production issue. Also use when writing incident retrospectives or creating on-call playbooks.
metadata:
  author: Senior Dev Skills Suite
  version: 1.0.0
  category: operations
  tags: [incidents, postmortem, runbook, on-call, SRE, reliability, outage]
---

# Incident Response Skill

Stay calm. Communicate clearly. Fix the user impact first, understand the root cause second. Never blame people — blame systems and processes.

## Incident Severity Levels

| Level | Name | User Impact | Response Time | Example |
|-------|------|-------------|---------------|---------|
| SEV-1 | Critical | All users affected, core product down | Immediate (< 5 min) | Login broken, payments failing, data loss |
| SEV-2 | High | Major feature broken, >20% users affected | < 15 min | Checkout slow, notifications delayed >30min |
| SEV-3 | Medium | Minor feature degraded, workaround exists | < 1 hour | Dashboard slow, export failing for some users |
| SEV-4 | Low | Cosmetic, single user, low impact | Next business day | UI bug, one user's data issue |

---

## Active Incident Playbook

### T+0: Acknowledge
```
1. Page yourself as Incident Commander (IC)
2. Join incident bridge (Slack channel: #incident-YYYYMMDD-[summary])
3. Post initial message:
   "Incident open. [Your name] is IC. Investigating [symptom]. Will update in 10 min."
4. Assign roles:
   - Incident Commander: coordinates, owns communication
   - Tech Lead: drives investigation and fix
   - Comms: updates status page and stakeholders
```

### T+5: Assess and Communicate
```
Template for initial stakeholder update:

🔴 INCIDENT — [YYYY-MM-DD HH:MM UTC]
Severity: SEV-[N]
Status: INVESTIGATING

Impact: [What users are experiencing. Be specific.]
Example: "Users cannot complete checkout. Payment page returns 500 error."

Affected: [% of users or specific segments]
Started at: [HH:MM UTC, or "unknown"]

Next update: [HH:MM UTC] (every 10–15 min for SEV-1, 30 min for SEV-2)
```

### T+10: Triage
```
1. Check the 5 most recent deployments — "did we just ship something?"
2. Check external dependencies: status.stripe.com, AWS status, etc.
3. Check infrastructure metrics: CPU, memory, error rates, DB connections
4. Isolate: is it one service? One region? One database?

Questions to answer:
- WHAT is broken? (specific component)
- WHEN did it start? (correlate with deploys, traffic spikes, cron jobs)
- WHO is affected? (% users, specific segments, all?)
- WHY (hypothesis)? (confirm with data before acting)
```

### T+20: Mitigate (not fix — reduce impact first)
```
Mitigation options (in order of speed/safety):
1. ROLLBACK last deployment (fastest, often solves it)
2. FEATURE FLAG off the broken feature
3. SCALE UP if it's a capacity issue
4. FAILOVER to backup region/DB replica
5. CIRCUIT BREAK the failing dependency
6. STATIC FALLBACK page if all else fails

Rule: Don't deploy a "fix" under pressure without review.
      A bad fix can make SEV-1 into a longer SEV-1.
```

### T+ongoing: Communicate
```
Update every 10–15 min for SEV-1:

🟡 INCIDENT UPDATE — [HH:MM UTC]
Status: INVESTIGATING / MITIGATING / MONITORING

Progress: [What you've found / what you've done]
Current impact: [Still X users affected / Impact reduced to Y]

Next update: [HH:MM]
```

### Resolution
```
Template:

✅ INCIDENT RESOLVED — [HH:MM UTC]
Duration: [start] → [end] = [X hours Y min]
Severity: SEV-[N]

What happened: [1 sentence plain English]
Root cause: [Brief technical explanation]
Fix applied: [What was done]

Impact summary:
- Users affected: [N or %]
- Duration of impact: [X min]
- Errors served: [N]

Postmortem: [Link, or "to be published within 5 business days"]
```

---

## Postmortem Template

Write within 5 business days. Blameless. Factual. Actionable.

```markdown
# Postmortem: [Short descriptive title]

**Date**: YYYY-MM-DD  
**Duration**: HH:MM UTC → HH:MM UTC (X hours Y minutes)  
**Severity**: SEV-N  
**Authors**: [roles, not names unless they opt in]  
**Status**: Draft / In Review / Published  

---

## Impact

| Metric | Value |
|--------|-------|
| Users affected | N (X%) |
| Errors served | N |
| Revenue impact | $N (if quantifiable) |
| SLA breach | Yes/No |

---

## Timeline

| Time (UTC) | Event |
|------------|-------|
| HH:MM | Anomalous error rate spike detected by monitoring |
| HH:MM | First user report via support |
| HH:MM | On-call engineer paged |
| HH:MM | Incident declared SEV-1 |
| HH:MM | [Investigation steps] |
| HH:MM | Root cause identified |
| HH:MM | Mitigation applied (rollback of PR #NNN) |
| HH:MM | Error rate returned to baseline |
| HH:MM | Incident resolved |

---

## Root Cause Analysis

### What Happened
[Technical description. What failed? Why did it fail?]

### Why It Wasn't Caught Earlier
[Testing gaps, monitoring gaps, review gaps]

### The 5 Whys
```
Why 1: Payments failed
  → Why 2: Redis connection pool exhausted
    → Why 3: Connection timeout value too low for our new cloud region
      → Why 4: Timeout was hardcoded, not configurable per environment
        → Why 5: No process for environment-specific config review in deploys
```

---

## What Went Well
- [Monitoring detected the issue before users reported at scale]
- [Rollback process worked within 3 minutes]
- [Clear communication to stakeholders throughout]

## What Went Poorly
- [Alert threshold was too high — 15 min of impact before page fired]
- [No runbook for Redis connection pool issues]
- [Wrong team was paged initially]

---

## Action Items

| Action | Owner | Due | Priority |
|--------|-------|-----|----------|
| Lower error rate alert threshold to 1% | SRE Team | YYYY-MM-DD | P1 |
| Add Redis connection pool runbook | Backend Team | YYYY-MM-DD | P1 |
| Add timeout to config (not hardcoded) | Backend Team | YYYY-MM-DD | P2 |
| Review all hardcoded config values | Tech Lead | YYYY-MM-DD | P2 |
| Update on-call routing for cache issues | SRE Team | YYYY-MM-DD | P3 |

---

## Supporting Data
- [Link to monitoring dashboard during incident]
- [Link to deploy that caused issue]
- [Link to Slack incident channel]
```

---

## Runbook Template

Create `docs/runbooks/[service]-[issue].md`:

```markdown
# Runbook: [Service] — [Issue Name]

**Service**: [service-name]  
**Alert**: [Alert name that triggers this runbook]  
**Severity**: SEV-N  
**Last tested**: YYYY-MM-DD  

---

## Symptoms
- [What the alert looks like]
- [What users experience]
- [Key metrics that are abnormal]

## Diagnosis Steps

### Step 1: Confirm the issue
```bash
# Check error rate
kubectl logs -l app=service-name --tail=100 | grep ERROR

# Check service health
curl https://service-name/health/ready
```

### Step 2: Check dependencies
```bash
# Check DB connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Expected: < 80 connections. If > 100, connection pool issue.
```

## Remediation

### Option A: [Most Common Fix]
```bash
# Restart deployment (fixes memory leaks, deadlocks)
kubectl rollout restart deployment/service-name

# Monitor recovery
kubectl rollout status deployment/service-name
```

### Option B: Rollback
```bash
# Identify last good version
kubectl rollout history deployment/service-name

# Roll back
kubectl rollout undo deployment/service-name

# Verify
kubectl get pods -l app=service-name
```

## Escalation
If unresolved after 30 minutes: escalate to [Team/Role]  
If data loss suspected: escalate to [CTO/Engineering Lead] immediately

## References
- [Link to service dashboard]
- [Link to related postmortems]
```
