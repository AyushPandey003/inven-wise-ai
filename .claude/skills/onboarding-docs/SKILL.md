---
name: onboarding-docs
description: Creates comprehensive developer onboarding documentation, READMEs, and contribution guides. Use when user asks to "write a README", "developer onboarding", "contribution guide", "CONTRIBUTING.md", "getting started guide", "local setup docs", "new engineer documentation", "ADR documentation", or needs to document a codebase for new team members.
metadata:
  author: Senior Dev Skills Suite
  version: 1.0.0
  category: documentation
  tags: [documentation, readme, onboarding, contributing, developer-experience]
---

# Onboarding Docs Skill

Good documentation is a multiplier. A new engineer who can onboard in 1 day instead of 2 weeks is not a nice-to-have — it's a competitive advantage. Write docs as if you're not there to answer questions.

## README.md Template (Comprehensive)

```markdown
# [Project Name]

> One-sentence description of what this does and who it's for.

[![CI](https://github.com/org/repo/actions/workflows/ci.yml/badge.svg)](...)
[![Coverage](https://codecov.io/gh/org/repo/badge.svg)](...)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## What is this?

[2–3 sentences. What problem does it solve? Why does it exist?
Don't describe what it IS — describe what it DOES for the user.]

## Quick Start

> Get from zero to running in < 5 minutes

**Prerequisites**: Node.js 20+, Docker, PostgreSQL 16

```bash
# 1. Clone and install
git clone https://github.com/org/repo
cd repo
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — see Configuration section for required values

# 3. Start dependencies
docker-compose up -d

# 4. Set up database
npm run db:migrate
npm run db:seed       # Optional: loads demo data

# 5. Start the app
npm run dev
# → http://localhost:3000
```

## Project Structure

```
src/
├── api/          # HTTP route handlers
├── services/     # Business logic layer
├── repositories/ # Database access layer
├── models/       # TypeScript types and domain models
├── middleware/   # Auth, validation, logging
├── utils/        # Shared utilities
└── config/       # App configuration

tests/
├── unit/         # Service and utility tests
├── integration/  # API and database tests
└── e2e/          # End-to-end Playwright tests

docs/
├── architecture/ # ADRs and system design docs
├── runbooks/     # Operational runbooks
└── api/          # API documentation
```

## Configuration

All config via environment variables. Copy `.env.example` and fill in:

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/myapp` |
| `REDIS_URL` | ✅ | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | ✅ | Secret for signing JWTs (min 32 chars) | `openssl rand -base64 32` |
| `STRIPE_SECRET_KEY` | ✅ prod | Stripe API key | `sk_test_...` |
| `LOG_LEVEL` | ❌ | Logging verbosity | `info` (default) |
| `PORT` | ❌ | HTTP server port | `3000` (default) |

## Development

```bash
npm run dev          # Start dev server with hot reload
npm test             # Run unit tests
npm run test:watch   # Tests in watch mode
npm run test:e2e     # End-to-end tests
npm run lint         # Lint check
npm run lint:fix     # Auto-fix lint issues
npm run type-check   # TypeScript check without emit
npm run db:migrate   # Run pending migrations
npm run db:rollback  # Roll back last migration
npm run db:seed      # Seed development data
```

## Architecture

[Brief description of key architectural decisions. Link to detailed ADRs.]

Key patterns used:
- **Repository pattern**: All DB access through repositories in `src/repositories/`
- **Service layer**: Business logic isolated in `src/services/`; services don't know about HTTP
- **Dependency injection**: Services receive dependencies via constructor (testable)

See `docs/architecture/` for Architecture Decision Records (ADRs).

## Testing

```bash
npm test                    # All unit tests
npm run test:integration    # Integration tests (requires running DB)
npm run test:coverage       # Coverage report → coverage/index.html
```

Coverage targets: >80% for `src/services/`, `src/repositories/`.

## Deployment

```bash
# Build production image
docker build -t myapp:latest .

# Run production
docker run -p 3000:3000 --env-file .env.prod myapp:latest
```

See `docs/runbooks/` for deployment procedures and rollback steps.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © [Your Organization]
```

---

## CONTRIBUTING.md Template

```markdown
# Contributing to [Project Name]

Thank you for contributing! Please read this before opening a PR.

## Development Setup

[Link to README quick start — don't duplicate it]

## Branching

- `main` — production-ready code, always deployable
- `feature/[ticket-id]-description` — new features
- `fix/[ticket-id]-description` — bug fixes

## Making Changes

1. Create a branch from `main`
2. Make your changes with tests
3. Run `npm test` and `npm run lint` — both must pass
4. Commit using [Conventional Commits](https://conventionalcommits.org):
   - `feat(scope): add user export functionality`
   - `fix(auth): prevent session fixation on login`
5. Open a PR against `main`

## PR Requirements

- [ ] Tests pass (`npm test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run type-check`)
- [ ] New features have tests
- [ ] Breaking changes noted in PR description
- [ ] PR description explains WHY (not just what — that's in the code)

## PR Review Process

- PRs require 1 approving review
- CI must be green
- Reviewer aims to respond within 1 business day
- Merge method: squash merge (one commit per feature)

## Code Style

- TypeScript strict mode enabled
- ESLint + Prettier configured (run `npm run lint:fix`)
- No `any` types without a comment explaining why
- Functions should be < 40 lines
- Files should be < 300 lines

## Commit Messages

Follow Conventional Commits. Examples:
```
feat(payments): add webhook retry with exponential backoff
fix(auth): invalidate refresh tokens on password change
docs(api): add rate limit documentation to README
chore(deps): upgrade typescript to 5.4
```

## Questions?

Open a discussion or reach out in #engineering on Slack.
```

---

## Day 1 Engineer Onboarding Checklist

Generate this as `docs/ONBOARDING.md`:

```markdown
# New Engineer Onboarding Guide

Welcome! This guide will get you from zero to productive in [X] days.

## Week 1 Goals
- [ ] Dev environment running locally
- [ ] Understand core domain concepts
- [ ] First PR merged (even if small)
- [ ] Met the team

## Day 1: Setup

### Access to Request
- [ ] GitHub organization membership
- [ ] AWS/GCP console access (request from [role])
- [ ] Datadog / monitoring access
- [ ] 1Password / secrets vault access
- [ ] Slack channels: #engineering, #incidents, #deployments, #general

### Local Environment
Follow [README Quick Start](../README.md#quick-start). If anything doesn't work, fix the docs.

### Explore the Codebase
1. Read `docs/architecture/` — start with ADR-001
2. Run the test suite: `npm test`
3. Hit the API locally — see `docs/api/`

## Day 2–3: Domain Knowledge

- [ ] Read the product brief / vision doc [link]
- [ ] Walk through a user journey manually in local env
- [ ] Read the last 3 postmortems in `docs/postmortems/`
- [ ] Pair with a team member on a feature or bug

## Day 4–5: First Contribution

Good first issues: [link to GitHub label]

Pick something small. The goal is to learn the process, not ship a big feature.
Your first PR will show you:
- How to branch, commit, and push
- How CI works
- How code review works on this team

## Key Contacts

| Area | Who to ask | How |
|------|-----------|-----|
| Backend / API | [team] | #engineering |
| Infrastructure | [team] | #devops |
| Product questions | [role] | #product |
| Urgent / on-call | [process] | PagerDuty |

## Useful Commands Cheat Sheet

```bash
npm run dev              # Start local dev server
npm test                 # Run tests
npm run db:migrate       # Apply DB migrations
git log --oneline -20    # See recent commits
kubectl get pods         # Check production pods (staging)
```

## After 30 Days

You should be able to:
- [ ] Ship a feature end-to-end independently
- [ ] Review a PR and give useful feedback
- [ ] Diagnose and resolve a SEV-3 incident
- [ ] Know who to ask for what

If anything in this guide was unclear or wrong, please update it. 
Documentation is everyone's responsibility.
```
