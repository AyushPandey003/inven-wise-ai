---
name: api-design
description: Designs production-grade REST, GraphQL, or gRPC APIs with complete specs. Use when user asks to "design an API", "create endpoints", "API contract", "OpenAPI spec", "REST design", "GraphQL schema", "API versioning", or needs to structure a backend service interface. Outputs full specs with examples, error handling, and auth patterns.
metadata:
  author: Senior Dev Skills Suite
  version: 1.0.0
  category: engineering
  tags: [api, rest, graphql, grpc, openapi, backend]
---

# API Design Skill

Design production-ready APIs that are intuitive, consistent, versioned, and built to evolve without breaking clients.

## Step 1: Gather Requirements

Before designing, confirm:
1. **Protocol**: REST, GraphQL, gRPC, or hybrid?
2. **Consumers**: Internal service-to-service, mobile clients, third-party devs, or public?
3. **Auth model**: API key, OAuth 2.0, JWT, mTLS?
4. **Scale expectations**: requests/sec, payload sizes, latency SLA?
5. **Versioning strategy**: URL versioning (/v1), header versioning, or none?

## Step 2: REST API Design Rules

### Resource Naming
```
✅ /users/{id}/orders          — nouns, hierarchical
✅ /products?category=shoes    — filtering via query params
✅ /orders/{id}/cancel         — action as sub-resource
❌ /getUser                    — verbs in URL
❌ /user_orders                — snake_case URLs
❌ /Users/{ID}                 — inconsistent casing
```

### HTTP Methods
| Method | Use | Idempotent | Body |
|--------|-----|-----------|------|
| GET | Read | ✅ | ❌ |
| POST | Create / non-idempotent action | ❌ | ✅ |
| PUT | Full replace | ✅ | ✅ |
| PATCH | Partial update | ✅ | ✅ |
| DELETE | Remove | ✅ | optional |

### Status Codes — Use Correctly
```
200 OK            — success with body
201 Created       — POST that created a resource (include Location header)
204 No Content    — DELETE or PUT with no response body
400 Bad Request   — client validation error (include field-level errors)
401 Unauthorized  — missing/invalid auth
403 Forbidden     — authenticated but not authorized
404 Not Found     — resource doesn't exist
409 Conflict      — state conflict (duplicate, optimistic lock)
422 Unprocessable — valid syntax, invalid semantics
429 Too Many Req  — rate limited (include Retry-After header)
500 Internal      — server error (NEVER leak details to client)
503 Unavailable   — circuit breaker / maintenance
```

### Standard Error Response Shape
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      { "field": "email", "issue": "Invalid email format" }
    ],
    "request_id": "req_abc123",
    "docs_url": "https://docs.example.com/errors/VALIDATION_ERROR"
  }
}
```

### Pagination — Cursor-based (preferred for large datasets)
```json
{
  "data": [...],
  "pagination": {
    "cursor": "eyJpZCI6MTAwfQ==",
    "has_more": true,
    "total": 4821
  }
}
```

## Step 3: OpenAPI Spec Output

When generating specs, always include:
- `openapi: 3.1.0` header
- Full `info` block with version, contact, license
- `servers` array with environment URLs
- `security` schemes defined globally + overridden per-endpoint where needed
- `components/schemas` for all reusable models
- `components/responses` for standard error responses
- Request/response examples for every endpoint
- `tags` to group endpoints logically

## Step 4: GraphQL Schema Rules

```graphql
# Always define clear types — no raw JSON scalars for structured data
# Use connections pattern for lists
type Query {
  user(id: ID!): User
  users(first: Int, after: String, filter: UserFilter): UserConnection!
}

# Input types for mutations — never raw scalars for complex input
type Mutation {
  createUser(input: CreateUserInput!): CreateUserPayload!
  updateUser(id: ID!, input: UpdateUserInput!): UpdateUserPayload!
}

# Payload types for mutations — include errors in payload, not as exceptions
type CreateUserPayload {
  user: User
  errors: [UserError!]!
}
```

## Step 5: Auth Patterns

### JWT Best Practices
- Access tokens: 15 min expiry
- Refresh tokens: 7–30 days, rotated on use, stored in HttpOnly cookie
- Include: `sub`, `iat`, `exp`, `jti` (JWT ID for revocation)
- Sign with RS256 (asymmetric) for services that need to verify without secret

### API Key Pattern
```
Header: Authorization: Bearer sk_live_xxxx
OR
Header: X-API-Key: sk_live_xxxx  (for non-OAuth flows)
```
- Prefix keys with environment: `sk_live_`, `sk_test_`
- Store only hashed in DB (SHA-256)
- Always scope keys (read-only, write, admin)

## Step 6: Versioning Strategy

**URL versioning** (recommended for public APIs):
```
/v1/users  →  /v2/users
```
- Maintain v1 for 12+ months after v2 launch
- Document breaking vs non-breaking changes

**Non-breaking changes** (safe to add anytime):
- New optional fields in response
- New optional query params
- New endpoints

**Breaking changes** (require new version):
- Removing or renaming fields
- Changing field types
- Changing auth mechanism
- Removing endpoints

## Deliverables Checklist

For every API design, produce:
- [ ] Resource map / endpoint list
- [ ] OpenAPI 3.1 YAML spec (or GraphQL SDL)
- [ ] Auth flow diagram (describe in text if no diagram tool)
- [ ] Error catalog with codes and meanings
- [ ] Rate limiting strategy
- [ ] Changelog/migration guide if versioning existing API
- [ ] 3–5 curl examples for the most important endpoints
