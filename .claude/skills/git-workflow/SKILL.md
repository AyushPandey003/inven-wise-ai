---
name: git-workflow
description: Provides expert Git workflow guidance, commit message crafting, branch strategy, and repo hygiene. Use when user asks about "git commit message", "branch strategy", "git flow", "trunk based development", "merge vs rebase", "squash commits", "git history", "changelog", "release tagging", or needs help with any Git process or convention. Also use when asked to write conventional commits or generate a CHANGELOG.
metadata:
  author: Senior Dev Skills Suite
  version: 1.0.0
  category: engineering
  tags: [git, version-control, branching, commits, changelog, releases]
---

# Git Workflow Skill

Clean Git history is documentation. Branch strategy is team coordination. Treat both with the same care as your code.

## Commit Message Standard: Conventional Commits

Format:
```
<type>(<scope>): <short summary>

[optional body — wrap at 72 chars]

[optional footer: BREAKING CHANGE, Closes #issue]
```

### Types
| Type | When to Use |
|------|-------------|
| `feat` | New feature visible to user or API consumer |
| `fix` | Bug fix |
| `perf` | Performance improvement |
| `refactor` | Code change with no behavior change |
| `test` | Adding/fixing tests |
| `docs` | Documentation only |
| `chore` | Build scripts, deps, config (not production code) |
| `ci` | CI/CD pipeline changes |
| `revert` | Revert a previous commit |
| `style` | Formatting, whitespace (no logic change) |

### Scope Examples (use your service/module names)
`feat(auth):`, `fix(payments):`, `refactor(user-service):`, `docs(api):`

### Good vs Bad Commits

```bash
# ✅ GOOD — specific, imperative, with context
feat(auth): add refresh token rotation with 7-day expiry
fix(orders): prevent double-charge on payment retry
perf(feed): replace sequential queries with batch fetch (8x speedup)
refactor(cart): extract discount calculation to CartPricer class

# ❌ BAD — vague, past tense, useless
fix bug
WIP
updates
more changes
fixed the thing John mentioned
```

### Breaking Changes
```bash
feat(api)!: remove deprecated /v1/users endpoint

BREAKING CHANGE: /v1/users has been removed. Migrate to /v2/users.
See migration guide: docs/migrations/v1-to-v2.md

Closes #342
```

---

## Branch Naming Convention

```bash
feature/[ticket-id]-short-description    # New features
fix/[ticket-id]-short-description        # Bug fixes
hotfix/[ticket-id]-short-description     # Production hotfixes
chore/update-dependencies                # Maintenance
release/v2.3.0                           # Release branches
experiment/new-cache-strategy            # Spike/experiments
```

---

## Branching Strategies

### Trunk-Based Development (recommended for teams shipping daily)
```
main (always deployable)
  ├── feature/abc (< 2 days old, then merged)
  ├── fix/xyz     (< 1 day old)
  └── [release tags on main]
```
- PRs must be small (< 400 lines diff)
- Feature flags for incomplete features
- CI must pass before merge
- Delete branch after merge

### Git Flow (for scheduled release cycles)
```
main          ← production code, tagged
develop       ← integration branch
  ├── feature/*
  ├── release/v2.3.0  ← stabilization, only fixes
  └── hotfix/*        ← patches to main, merged back to develop
```
Use when: mobile apps, versioned libraries, enterprise with compliance windows.

---

## Rebase vs Merge

| | Rebase | Merge |
|-|--------|-------|
| History | Linear, clean | Preserves branch topology |
| Shared branches | NEVER rebase | Always merge |
| Local branches | Prefer rebase | Either |
| PR integration | Squash or rebase | Merge commit |

**Golden rule**: Never rebase commits that have been pushed to a shared/remote branch.

### Recommended PR merge strategy
```bash
# For feature branches: squash merge (one commit per feature)
git merge --squash feature/my-feature

# For release branches: merge commit (preserves release history)
git merge --no-ff release/v2.3.0

# For local cleanup before PR: interactive rebase
git rebase -i origin/main
```

---

## CHANGELOG Generation

When asked to generate a CHANGELOG, follow Keep a Changelog format:

```markdown
# Changelog

All notable changes to this project will be documented here.
Format follows [Keep a Changelog](https://keepachangelog.com).

## [Unreleased]

## [2.3.0] - 2025-03-01
### Added
- Refresh token rotation with configurable expiry
- Batch export API for analytics data

### Changed
- Orders API now returns ISO 8601 timestamps (was Unix epoch)

### Fixed
- Double-charge on payment retry (#342)
- Feed pagination cursor off-by-one error (#367)

### Removed
- Deprecated /v1/users endpoint (migrated to /v2/users)

## [2.2.1] - 2025-02-14
### Security
- Patched IDOR vulnerability in document sharing API (CVE-2025-XXXX)
```

---

## Release Tagging

```bash
# Semantic versioning: MAJOR.MINOR.PATCH
# MAJOR: breaking changes
# MINOR: new backward-compatible features
# PATCH: backward-compatible bug fixes

git tag -a v2.3.0 -m "Release v2.3.0: Refresh tokens + batch export"
git push origin v2.3.0

# Release candidates
git tag -a v2.3.0-rc.1 -m "Release candidate 1 for v2.3.0"
```

---

## Repo Hygiene Commands (Recipes)

```bash
# Clean up stale remote tracking branches
git fetch --prune

# Find large files in history (pre-cleanup)
git rev-list --objects --all | sort -k 2 > allfileshas.txt
git gc && git verify-pack -v .git/objects/pack/*.idx | sort -k 3 -n | tail -20

# Undo last commit, keep changes staged
git reset --soft HEAD~1

# Interactive rebase to clean up last 5 commits before PR
git rebase -i HEAD~5

# Cherry-pick a commit from another branch
git cherry-pick <commit-hash>

# Stash with a meaningful name
git stash push -m "WIP: payment retry logic"
```

---

## .gitignore Best Practices

Always include:
```gitignore
# Environment & secrets
.env
.env.local
.env.*.local
*.pem
*.key
secrets/

# Dependencies
node_modules/
vendor/
.venv/

# Build output
dist/
build/
*.egg-info/
__pycache__/

# IDE (commit .editorconfig instead)
.idea/
.vscode/
*.swp

# OS
.DS_Store
Thumbs.db
```
