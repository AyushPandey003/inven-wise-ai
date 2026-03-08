---
name: security-audit
description: Performs security-focused code and architecture audits using OWASP and SANS frameworks. Use when user asks for "security review", "security audit", "vulnerability check", "OWASP", "pentest", "is this code secure", "auth security", "SQL injection", "XSS", "CSRF", or any security concern about code or system design. Also use when designing auth systems, token handling, or data protection.
metadata:
  author: Senior Dev Skills Suite
  version: 1.0.0
  category: security
  tags: [security, OWASP, vulnerabilities, auth, encryption, audit]
---

# Security Audit Skill

Security is not a checklist — it's a mindset. Every input is hostile until sanitized. Every external call can fail. Every secret can leak. Audit with that assumption.

## OWASP Top 10 Checklist

Run through ALL of these for any meaningful security audit:

### A01 — Broken Access Control
- [ ] Vertical privilege escalation: can user A access admin routes?
- [ ] Horizontal privilege escalation: can user A access user B's data?
- [ ] Is authorization checked server-side on EVERY request (not just UI-hidden)?
- [ ] Can object IDs be enumerated/guessed (IDOR)?
- [ ] Are JWT claims validated on every protected endpoint?
- [ ] Directory traversal in file paths?
- [ ] CORS configured correctly (not `*` for credentialed requests)?

### A02 — Cryptographic Failures
- [ ] Passwords hashed with bcrypt/argon2/scrypt (NOT MD5/SHA1/SHA256)?
- [ ] Sensitive data encrypted at rest (PII, payment data, health records)?
- [ ] TLS 1.2+ enforced? HTTP redirected to HTTPS?
- [ ] No secrets in environment variables logged?
- [ ] Crypto keys rotatable without downtime?
- [ ] Random tokens use cryptographically secure RNG (not Math.random())?

### A03 — Injection
- [ ] All SQL queries use parameterized statements / ORM (no string concatenation)?
- [ ] NoSQL queries escaped (MongoDB `$where` etc.)?
- [ ] Command injection: `exec()`, `shell_exec()` — user input never reaches shell?
- [ ] Template injection: user content never directly rendered in template engine?
- [ ] XML/LDAP injection in any parsing flows?

### A04 — Insecure Design
- [ ] Threat modeling done for sensitive flows?
- [ ] Rate limiting on auth endpoints?
- [ ] Account enumeration prevented (same response for bad email vs bad password)?
- [ ] Re-authentication required for sensitive operations (change password, delete account)?

### A05 — Security Misconfiguration
- [ ] Default credentials changed?
- [ ] Debug mode/stack traces disabled in production?
- [ ] Unnecessary ports/services closed?
- [ ] Security headers present (see headers section below)?
- [ ] Error messages don't leak system internals?
- [ ] Dependency versions pinned and up-to-date?

### A06 — Vulnerable Components
- [ ] `npm audit` / `pip-audit` / `trivy` run in CI?
- [ ] Dependencies updated regularly?
- [ ] No unmaintained packages with known CVEs?
- [ ] Base Docker image scanned?

### A07 — Authentication Failures
- [ ] Brute force protection on login (rate limit + account lockout)?
- [ ] Session tokens invalidated on logout?
- [ ] MFA available for privileged accounts?
- [ ] Password reset uses time-limited, single-use tokens?
- [ ] OAuth state parameter validated to prevent CSRF?

### A08 — Software and Data Integrity
- [ ] CI/CD pipeline secured (prevent supply chain attacks)?
- [ ] Package lock files committed (npm/yarn/pip)?
- [ ] Subresource Integrity (SRI) on external CDN scripts?

### A09 — Logging & Monitoring
- [ ] Auth events logged (login, logout, failed attempts, password reset)?
- [ ] Audit log for sensitive data access?
- [ ] No PII or secrets in logs?
- [ ] Alerting on anomalous patterns (brute force, unusual data access)?
- [ ] Logs tamper-evident (append-only storage)?

### A10 — Server-Side Request Forgery (SSRF)
- [ ] User-supplied URLs validated against allowlist before fetch?
- [ ] Internal services unreachable from SSRF (metadata endpoints blocked)?
- [ ] DNS rebinding mitigated?

---

## Security Headers

Required headers for all web applications:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self'; ...
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## Auth Security Patterns

### Secure Password Flow
```
Registration: argon2id(password, salt, {memoryCost: 65536, timeCost: 3})
Storage: hash only, never plaintext
Comparison: constant-time compare (prevent timing attacks)
Reset: crypto.randomBytes(32).toString('hex'), expires in 1 hour, single-use
```

### JWT Security
```
Algorithm: RS256 (asymmetric) — NOT HS256 for multi-service
Claims required: sub, iat, exp, jti
Expiry: access=15min, refresh=7days
Refresh rotation: new refresh token on every use
Revocation: maintain jti blocklist in Redis for logout
Storage: HttpOnly cookie (not localStorage — XSS resistant)
```

### API Key Security
```
Generation: crypto.randomBytes(32).toString('base64url')
Prefix: sk_live_ or sk_test_ (environment clarity)
Storage: store SHA-256 hash only
Display: show full key ONCE on creation only
Scoping: read/write/admin scopes
Rotation: support multiple active keys to enable zero-downtime rotation
```

---

## Input Validation Rules

```typescript
// NEVER trust: headers, query params, path params, body, cookies
// ALWAYS validate: type, format, length, range, allowed values

// Good pattern: validate at the boundary (controller layer)
const schema = z.object({
  email: z.string().email().max(255),
  age: z.number().int().min(0).max(150),
  role: z.enum(['user', 'admin']),
  redirectUrl: z.string().url().refine(
    url => ['https://myapp.com'].some(allowed => url.startsWith(allowed)),
    'Redirect URL not allowed'  // prevent open redirect
  )
})
```

---

## Common Vulnerability Code Patterns

### SQL Injection (vulnerable → fixed)
```typescript
// ❌ VULNERABLE
const user = await db.query(`SELECT * FROM users WHERE email = '${email}'`)

// ✅ SAFE
const user = await db.query('SELECT * FROM users WHERE email = $1', [email])
```

### Path Traversal (vulnerable → fixed)
```typescript
// ❌ VULNERABLE
const file = fs.readFileSync(`./uploads/${req.params.filename}`)

// ✅ SAFE
const filename = path.basename(req.params.filename)  // strips ../
const filePath = path.join('./uploads', filename)
if (!filePath.startsWith(path.resolve('./uploads'))) throw new Error('Invalid path')
const file = fs.readFileSync(filePath)
```

### Open Redirect (vulnerable → fixed)
```typescript
// ❌ VULNERABLE
res.redirect(req.query.returnUrl)

// ✅ SAFE
const ALLOWED = ['https://myapp.com', 'https://dashboard.myapp.com']
const returnUrl = req.query.returnUrl
if (!ALLOWED.some(allowed => returnUrl?.startsWith(allowed))) {
  return res.redirect('/dashboard')
}
res.redirect(returnUrl)
```

---

## Audit Output Format

```markdown
## Security Audit: [Component/PR Name]

### Risk Summary
| Severity | Count |
|----------|-------|
| 🔴 Critical | N |
| 🟠 High | N |
| 🟡 Medium | N |
| 🟢 Low | N |

### Findings

#### [CRIT-1] SQL Injection in UserRepository.search()
**Severity**: Critical  
**OWASP**: A03 Injection  
**Location**: `src/repositories/user.ts:47`  
**Description**: User input concatenated directly into SQL query.  
**Proof of Concept**: `search?q='; DROP TABLE users;--`  
**Fix**: Use parameterized query: `db.query('...WHERE name = $1', [q])`  
**Effort**: 30 minutes  

[repeat for each finding]

### Recommended Actions (Priority Order)
1. [Fix critical findings before next deploy]
2. [High findings within 1 sprint]
3. [Medium findings within 1 month]
```
