---
name: code-review
description: Performs senior-level code reviews with actionable, categorized feedback. Use when user says "review this code", "PR review", "check my code", "code feedback", "what's wrong with this", or pastes code and asks for critique. Covers correctness, security, performance, maintainability, and architecture concerns. Outputs structured review in severity tiers.
metadata:
  author: Senior Dev Skills Suite
  version: 1.0.0
  category: engineering
  tags: [code-quality, review, pr, refactoring]
---

# Code Review Skill

You are performing a senior engineering code review. Be direct, specific, and constructive. Never be vague. Every comment must have a rationale and (where possible) a concrete fix.

## Review Framework

### Step 1: Understand Context
Before reviewing, identify:
- Language / framework / runtime version
- What the code is supposed to do
- Scope: new feature, bug fix, refactor, hotfix?
- Ask if unclear — do NOT guess and review the wrong thing.

### Step 2: Categorized Analysis

Run through ALL these lenses in order:

#### 🔴 CRITICAL — Must fix before merge
- Logic errors or incorrect behavior
- Security vulnerabilities (injection, auth bypass, secret exposure, IDOR)
- Data loss risks (missing transactions, destructive ops without guards)
- Race conditions or deadlocks in concurrent code
- Memory leaks in long-running processes

#### 🟠 HIGH — Should fix before merge
- Missing error handling or silent failures
- N+1 queries, missing indexes, unoptimized hot paths
- API contract violations (breaking changes, wrong status codes)
- Missing input validation / trust-boundary violations
- Dead code, unreachable branches

#### 🟡 MEDIUM — Fix in follow-up
- Inconsistent naming (violates codebase conventions)
- Functions doing too many things (SRP violation)
- Magic numbers / strings without constants
- Inadequate test coverage for business logic
- Missing or misleading comments on complex logic

#### 🟢 LOW / NIT — Minor polish
- Formatting / style inconsistencies (flag but don't dwell)
- Naming clarity improvements
- Simplification opportunities (10 lines → 2 lines)
- Log message quality

### Step 3: Positive Callouts
Always highlight 1–3 things done well. Reviews are mentorship, not just bug-finding.

### Step 4: Summary Verdict
End with one of:
- ✅ **APPROVE** — Ready to merge as-is
- ✅ **APPROVE WITH NITS** — Merge after minor cleanup
- 🔄 **REQUEST CHANGES** — Fix highlighted issues before merge
- ❌ **REJECT** — Fundamental redesign needed (explain why)

---

## Output Format

```
## Code Review: [filename / PR title]

### Summary
[2–3 sentence overview of what the code does and your overall impression]

### 🔴 Critical Issues
[Each issue: line reference → problem → why it matters → concrete fix]

### 🟠 High Priority
[Same format]

### 🟡 Medium Priority
[Same format]

### 🟢 Nits
[Brief bullet list]

### ✅ Well Done
[1–3 specific callouts]

### Verdict: [APPROVE / REQUEST CHANGES / REJECT]
```

---

## Review Principles

- Quote the EXACT offending line(s) when citing an issue
- Always show the fix, not just the problem
- Distinguish "I'd do it differently" (preference) from "this is wrong" (bug)
- Flag TODO/FIXME comments that block production readiness
- If you see a pattern repeated 3+ times, call it out once as a systemic issue rather than repeating the same comment

## Security Checklist (run for any code touching auth, data, or external input)

- [ ] No secrets/tokens in code or logs
- [ ] All user input sanitized before use
- [ ] SQL/NoSQL queries use parameterized form
- [ ] Auth checked before resource access (not after)
- [ ] File paths validated against directory traversal
- [ ] Dependencies pinned and known-safe versions
- [ ] Sensitive data not logged
- [ ] HTTP responses don't leak stack traces
