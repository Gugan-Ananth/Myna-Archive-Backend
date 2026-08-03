# Myna Archive Backend

NestJS API for the **Myna Archive** personal image archive — store, list, search, and manage archive items (images with tags, ratings, and metadata). Companion to `Myna-Archive-FrontEnd`.

## Stack

| Layer | Choice |
|-------|--------|
| Framework | NestJS 11 + TypeScript |
| Runtime | Node.js |
| Package manager | **yarn** |
| HTTP | Express (`@nestjs/platform-express`) |
| Tests | Jest + Supertest |
| Lint / format | ESLint + Prettier |

Prefer official NestJS patterns (`@nestjs/*` modules, DI, modules/controllers/providers). Do not invent parallel frameworks or ad-hoc Express routers outside Nest.

## Commands

| Task | Command |
|------|---------|
| Install | `yarn install` |
| Dev (watch) | `yarn start:dev` |
| Build | `yarn build` |
| Start prod | `yarn start:prod` |
| Unit tests | `yarn test` |
| E2E tests | `yarn test:e2e` |
| Coverage | `yarn test:cov` |
| Lint | `yarn lint` |
| Format | `yarn format` |

Always run from the repo root. Prefer `yarn` over `npm`.

## Project layout (target)

```
src/
  main.ts                 # bootstrap, global pipes/filters/interceptors
  app.module.ts
  common/                 # shared filters, pipes, guards, decorators, utils
  config/                 # ConfigModule / env validation
  <feature>/              # one folder per bounded feature
    <feature>.module.ts
    <feature>.controller.ts
    <feature>.service.ts
    dto/
    entities/             # or persistence/ when DB is added
    <feature>.controller.spec.ts
    <feature>.service.spec.ts
test/                     # e2e specs
docs/
  adr/                    # architecture decision records
  agents/                 # skill configuration (issue tracker, domain, triage)
```

Feature modules own their controllers, services, DTOs, and tests. Shared cross-cutting code lives in `src/common/`.

## Agent workflow

Project skills live under `.grok/skills/`. Config for skills lives in `docs/agents/`. Domain language lives in `CONTEXT.md`. Coding standards live in `CODING_STANDARDS.md`.

Typical flow for new work:

1. **`/grill-with-docs`** — sharpen the plan; grow domain language (`CONTEXT.md`, ADRs)
2. **`/to-spec`** — publish a PRD/spec as a tracker issue
3. **`/to-tickets`** — break the spec into tracer-bullet slices
4. **`/implement`** — build a ticket (uses `/tdd` + `/code-review`)

Nest-specific skills (use when scaffolding or changing API surface):

| Skill | When |
|-------|------|
| `/nest-module` | New feature module |
| `/nest-endpoint` | New or changed HTTP endpoints |
| `/nest-dto-validation` | Request/response DTOs + ValidationPipe |
| `/nest-entity` | Persistence model / repository boundary |
| `/nest-testing` | Unit + e2e test scaffolding |
| `/nest-auth` | Auth guards, strategies, protected routes |
| `/diagnose-bugs` | Reproduce, isolate, fix failures |

Unsure which skill? Ask; prefer `/grill-with-docs` before large greenfield work.

## Coding conventions (summary)

Full rules: `CODING_STANDARDS.md`. Non-negotiables:

- TypeScript strict; prefer `const`; no `any` without a one-line justification
- Controllers thin: validate input, call service, map HTTP status — no business logic
- Services hold business rules; inject dependencies via constructor DI
- DTOs for all request bodies/query params; class-validator + class-transformer
- Feature modules encapsulate providers; export only what other modules need
- Domain terms from `CONTEXT.md` only — do not invent synonyms
- Prefer vertical slices: endpoint + DTO + service method + tests in one pass
- Run `yarn test` (and `yarn build` when types change) before declaring work done

## Guardrails

- Do **not** force-push, `reset --hard`, or `clean -fd` unless the user explicitly asks
- Do **not** commit secrets, `.env` with real credentials, or production keys
- Do **not** add dependencies without a clear need; prefer Nest first-party packages
- Confirm before destructive DB migrations or production-facing config changes
- Match companion frontend contracts (`ArchiveItem` shape) when evolving public APIs

## Domain

See `CONTEXT.md`. Core concept: **Archive Item** — an image with name, description, freeform tags, rating (0.0–10.0), thumbnail URL, and full image URL.
