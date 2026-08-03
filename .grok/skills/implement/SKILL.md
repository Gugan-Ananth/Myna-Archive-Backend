---
name: implement
description: >
  Implement a piece of work from a spec or ticket for this NestJS archive backend.
  Use when building a feature, finishing a ticket, or the user runs /implement.
---

# Implement

Implement the work described by the user, a GitHub issue, or a local spec.

## Process

1. **Load context**
   - Read `CONTEXT.md` and relevant `docs/adr/*`.
   - Fetch the ticket if an issue number is given (`docs/agents/issue-tracker.md`).
   - Skim `CODING_STANDARDS.md` for anything the change will touch.

2. **Plan the vertical slice**
   - List files to add/change (module, endpoint, DTO, service, tests).
   - Agree seams for testing with the user if non-obvious; then use `/tdd`.

3. **Build with Nest skills as needed**
   - New area → `/nest-module`
   - Routes → `/nest-endpoint`
   - Bodies/queries → `/nest-dto-validation`
   - Storage → `/nest-entity`
   - Security → `/nest-auth`
   - Tests → `/nest-testing`

4. **Red → green**
   - Prefer `/tdd` at pre-agreed seams.
   - Run focused tests often: `yarn test -- <name>`
   - Run `yarn build` when types or modules change.

5. **Finish**
   - Full unit suite: `yarn test`
   - E2E if HTTP surface changed: `yarn test:e2e`
   - `/code-review` against the branch base (default `main` if it exists, else the starting commit)
   - Commit on the current branch only if the user wants a commit (follow their VCS prefs; never push unless asked)

## Rules

- Smallest change that satisfies the ticket — no speculative features.
- Controllers thin; services own rules; DTOs validate input.
- Domain vocabulary only.
- Do not expand scope into frontend repo work unless explicitly asked.
