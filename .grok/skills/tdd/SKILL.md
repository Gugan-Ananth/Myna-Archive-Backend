---
name: tdd
description: >
  Test-driven development for NestJS (red-green loop). Use when building
  features or fixing bugs test-first, mentioning red-green-refactor, or the user
  runs /tdd.
---

# Test-Driven Development

TDD is the red → green loop. This skill is the reference that keeps tests worth keeping.

When exploring, read `CONTEXT.md` so test names match domain language. Use `/nest-testing` for Nest/Jest mechanics.

## What a good test is

Tests verify **behavior through public interfaces**, not implementation details. A good test reads like a specification — `creates an archive item with tags` — and survives refactors.

See [tests.md](tests.md) and [mocking.md](mocking.md).

## Seams — where tests go

A **seam** is the public boundary you test at. In this Nest app, typical seams:

| Seam | How |
|------|-----|
| Service public methods | Unit test with mocked repository port |
| HTTP resource | E2E Supertest with real ValidationPipe |
| Guard / pipe | Unit with mock ExecutionContext / args |

**Test only at pre-agreed seams.** Before writing tests, list seams and confirm with the user when non-obvious.

## Anti-patterns

- **Implementation-coupled** — mocks internal private collaborators; breaks on refactor with no behavior change.
- **Tautological** — expected value recomputed the same way as production code.
- **Horizontal slicing** — all tests first, then all code. Prefer **vertical slices**: one failing test → minimal code → repeat.

## Rules of the loop

1. **Red before green.** Failing test first; only enough code to pass.
2. **One slice at a time.** One seam, one behavior per cycle.
3. **Refactor outside the loop.** Structure cleanup belongs to review (`/code-review`), not the red-green cycle.
4. **Run the test.** Prove red, then prove green — do not assume.

## Nest loop example

```text
1. Write service spec: "returns 404-equivalent when item missing" → fail
2. Implement findById throw NotFoundException → pass
3. Write e2e: GET /archive-items/:id unknown → 404 → fail/pass
4. Next behavior...
```

## Commands

```bash
yarn test -- path/or/name
yarn test:watch -- path/or/name
yarn test:e2e
```
