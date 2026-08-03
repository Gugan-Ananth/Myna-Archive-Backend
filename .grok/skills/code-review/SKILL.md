---
name: code-review
description: >
  Review changes since a fixed point along Standards (repo coding standards +
  Nest conventions) and Spec (originating issue/PRD). Use when reviewing a
  branch, PR, WIP diff, or the user runs /code-review.
---

# Code Review (two axes)

Review the diff between `HEAD` and a fixed point the user supplies (commit, branch, tag, or merge-base).

- **Standards** — does the code conform to `CODING_STANDARDS.md`, `AGENTS.md`, and Nest skills?
- **Spec** — does the code faithfully implement the originating issue / PRD / spec?

Run both axes as **parallel sub-agents** (`general-purpose`) when available, then aggregate. Do not merge or re-rank findings across axes.

## Process

### 1. Pin the fixed point

If the user did not specify one, ask. Resolve with `git rev-parse`. Diff:

```bash
git diff <fixed-point>...HEAD
git log <fixed-point>..HEAD --oneline
```

Fail early on bad ref or empty diff.

### 2. Spec source

In order:

1. Issue refs in commits (`#123`) — `gh issue view` per `docs/agents/issue-tracker.md`
2. Path the user passed
3. Files under `docs/`, `specs/`, `.scratch/`
4. Ask the user; if none, Spec axis reports "no spec available"

### 3. Standards sources

Always include:

- `CODING_STANDARDS.md`
- `AGENTS.md`
- `CONTEXT.md` (vocabulary drift is a standards/domain issue)

Plus smell baseline (judgement calls; repo docs override):

- Mysterious Name, Duplicated Code, Feature Envy, Data Clumps, Primitive Obsession
- Repeated Switches, Shotgun Surgery, Divergent Change, Speculative Generality
- Message Chains, Middle Man, Refused Bequest

Nest-specific checks:

- Business logic in controllers
- Missing DTO validation on write endpoints
- Entities leaked as HTTP responses
- Module export/import mistakes / circular deps
- Tests missing for new public behavior
- e2e setup not mirroring `main.ts` pipes

Skip anything ESLint/Prettier/tsc already enforces.

### 4. Parallel sub-agents

**Standards** — under 400 words: hard violations (cite file + rule) vs judgement-call smells.

**Spec** — under 400 words: missing requirements, scope creep, wrong implementation (quote spec).

### 5. Aggregate

```markdown
## Standards
...

## Spec
...

## Summary
Standards: N findings (worst: …). Spec: M findings (worst: …).
```

## Why two axes

Passing standards but wrong behavior → Spec fail. Correct behavior but Nest anti-patterns → Standards fail. Keep them separate so neither masks the other.
