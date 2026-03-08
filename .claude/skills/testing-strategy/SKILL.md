---
name: testing-strategy
description: Designs comprehensive testing strategies and writes high-quality tests. Use when user asks to "write tests", "test this code", "unit test", "integration test", "e2e test", "testing strategy", "test coverage", "mock this", "TDD", "what should I test", or needs guidance on test architecture and patterns. Covers all test layers and provides working test code.
metadata:
  author: Senior Dev Skills Suite
  version: 1.0.0
  category: engineering
  tags: [testing, unit-tests, integration, e2e, TDD, test-coverage, jest, pytest, vitest]
---

# Testing Strategy Skill

Tests are the second consumer of your code (after production). Write them to be readable, deterministic, and fast. A test that takes 30 seconds or flickers is worse than no test.

## Test Pyramid

```
        /\
       /E2E\          ← Few, slow, expensive. Cover critical user journeys only.
      /──────\
     / Integ  \       ← Test service boundaries: DB, HTTP, message queues.
    /──────────\
   /  Unit Tests \    ← Many, fast, isolated. Cover logic and edge cases.
  /______________\
```

**Ratio target**: ~70% unit / ~20% integration / ~10% E2E

---

## Step 1: What to Test (and What NOT to)

### Test This
- Business logic with multiple branches
- Edge cases: empty input, max values, type boundaries
- Error paths and failure modes
- Public API contracts (inputs → outputs)
- Security-sensitive functions (auth, validation, sanitization)
- Anything that's broken in production before

### Don't Test This
- Framework/library code (they have their own tests)
- Trivial getters/setters with no logic
- Implementation details that will change (test behavior, not internals)
- Third-party integrations directly (mock them; test the mock behavior)

---

## Step 2: Unit Test Patterns

### Structure: Arrange-Act-Assert (AAA)
```typescript
describe('CartService.calculateTotal()', () => {
  it('applies percentage discount correctly', () => {
    // Arrange
    const items = [{ price: 100, qty: 2 }, { price: 50, qty: 1 }]
    const discount = { type: 'percentage', value: 10 }

    // Act
    const total = calculateTotal(items, discount)

    // Assert
    expect(total).toBe(225) // (200 + 50) * 0.9
  })

  it('returns 0 for empty cart', () => {
    expect(calculateTotal([], null)).toBe(0)
  })

  it('throws for negative item price', () => {
    const items = [{ price: -10, qty: 1 }]
    expect(() => calculateTotal(items, null)).toThrow('Invalid item price')
  })
})
```

### Naming Convention
```
it('[unit] [action] [expected result]')
it('calculateTotal applies percentage discount correctly')
it('createUser throws when email already exists')
it('parseDate returns null for invalid format strings')
```

### Boundary Value Testing
Always test: min, max, min-1, max+1, null, undefined, empty string, zero.

---

## Step 3: Integration Test Patterns

### Database Integration (use real DB in test container)
```typescript
describe('UserRepository', () => {
  let db: Database

  beforeAll(async () => {
    db = await createTestDatabase() // docker/testcontainers
  })

  afterEach(async () => {
    await db.query('TRUNCATE users CASCADE')
  })

  afterAll(async () => {
    await db.close()
  })

  it('persists user and retrieves by email', async () => {
    const repo = new UserRepository(db)
    await repo.create({ email: 'test@example.com', name: 'Test User' })
    const found = await repo.findByEmail('test@example.com')
    expect(found?.name).toBe('Test User')
  })
})
```

### HTTP Integration (test your API layer)
```typescript
describe('POST /v1/users', () => {
  it('creates user and returns 201 with Location header', async () => {
    const res = await request(app)
      .post('/v1/users')
      .send({ email: 'new@example.com', name: 'New User' })
      .set('Authorization', `Bearer ${testToken}`)

    expect(res.status).toBe(201)
    expect(res.headers['location']).toMatch(/\/v1\/users\/[a-z0-9-]+/)
    expect(res.body.data.email).toBe('new@example.com')
  })

  it('returns 409 when email already exists', async () => {
    await createUser({ email: 'existing@example.com' })
    const res = await request(app)
      .post('/v1/users')
      .send({ email: 'existing@example.com', name: 'Dupe' })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('USER_ALREADY_EXISTS')
  })
})
```

---

## Step 4: Mocking Strategy

### Mock external I/O; don't mock your own code
```typescript
// ✅ Mock external HTTP call
jest.mock('./emailClient', () => ({
  send: jest.fn().mockResolvedValue({ messageId: 'msg_123' })
}))

// ✅ Mock time (deterministic)
jest.useFakeTimers().setSystemTime(new Date('2025-01-01'))

// ❌ Don't mock internal business logic just to avoid testing it
```

### Spy vs Mock vs Stub
- **Stub**: Returns a fixed value. Use for dependencies you don't care about.
- **Mock**: Verifies calls were made (count, args). Use for side effects.
- **Spy**: Wraps real implementation, lets you observe calls. Use for partial mocking.

---

## Step 5: Test Data Management

```typescript
// Builder pattern for test data
const userBuilder = {
  base: { id: 'usr_1', email: 'test@example.com', role: 'user', active: true },
  admin: () => ({ ...userBuilder.base, role: 'admin' }),
  inactive: () => ({ ...userBuilder.base, active: false }),
  withEmail: (email: string) => ({ ...userBuilder.base, email }),
}

// Use factories, not copy-pasted literals
const user = userBuilder.admin()
const inactiveUser = userBuilder.inactive()
```

---

## Step 6: Testing Async Code

```typescript
// Always return or await promises
it('resolves with user data', async () => {
  const user = await getUser('usr_123')
  expect(user.email).toBe('test@example.com')
})

// Test rejection
it('rejects when user not found', async () => {
  await expect(getUser('nonexistent')).rejects.toThrow('User not found')
})

// Test events/streams
it('emits "created" event after user creation', async () => {
  const emitted = jest.fn()
  userService.on('created', emitted)
  await userService.create({ email: 'e@e.com' })
  expect(emitted).toHaveBeenCalledWith(expect.objectContaining({ email: 'e@e.com' }))
})
```

---

## Step 7: Coverage Guidance

**Don't chase 100% coverage — chase meaningful coverage.**

| Coverage % | Interpretation |
|-----------|---------------|
| < 40% | Undercovered — risky to change |
| 40–70% | Acceptable for early-stage |
| 70–85% | Good — cover the important paths |
| 85–95% | Excellent — you're testing the right things |
| > 95% | Watch for coverage theater (testing trivial code) |

Focus coverage enforcement on: `src/services/`, `src/domain/`, `src/utils/`  
Exclude: `src/migrations/`, `src/types/`, `src/config/`

---

## Test File Organization

```
src/
├── services/
│   ├── user.service.ts
│   └── user.service.test.ts    ← co-located unit tests
├── repositories/
│   ├── user.repository.ts
│   └── user.repository.test.ts
tests/
├── integration/
│   ├── api/
│   │   └── users.test.ts       ← HTTP integration tests
│   └── db/
│       └── user-repo.test.ts   ← DB integration tests
└── e2e/
    └── user-journey.spec.ts    ← Playwright/Cypress
```

---

## CI Test Configuration

```yaml
# Recommended test stages in CI
unit:
  run: npm test -- --testPathPattern="\.test\." --coverage
  max-time: 5 minutes

integration:
  run: npm test -- --testPathPattern="tests/integration"
  services: [postgres, redis]
  max-time: 10 minutes

e2e:
  run: npx playwright test
  environment: staging
  max-time: 15 minutes
  on: [merge to main]   # Don't run on every PR
```
