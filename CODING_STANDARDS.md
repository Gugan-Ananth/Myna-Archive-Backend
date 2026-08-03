# Coding Standards — Myna Archive Backend

Standards for NestJS TypeScript in this repo. `/code-review` and Nest skills treat these as the documented baseline. Tooling (ESLint, Prettier, TypeScript, Jest) always wins for anything it already enforces — do not re-litigate style the linter owns.

## Language & types

- TypeScript only under `src/` and `test/`.
- Prefer `const`. Use `let` only when reassignment is required.
- Avoid `any`. If unavoidable, add a one-line comment why.
- Prefer explicit return types on public service methods and controller handlers.
- Prefer `unknown` over `any` at trust boundaries (e.g. raw JSON parse), then narrow.

## NestJS structure

- **One feature module per domain capability** under `src/<feature>/`.
- **Controllers are thin**: HTTP mapping only — status codes, headers, DTO in/out. No business rules, no direct DB access.
- **Services hold business logic**. They are `@Injectable()` and receive dependencies via constructor injection.
- **Modules declare** `controllers`, `providers`, and `exports`. Export only providers other modules need.
- Do not create circular module imports. Extract shared pieces to `src/common/` or a dedicated shared module.
- Prefer Nest CLI-style file names: `archive-items.module.ts`, `archive-items.controller.ts`, `archive-items.service.ts`.

## DTOs & validation

- Every request body and non-trivial query/param shape gets a DTO class.
- Use `class-validator` decorators and enable a global `ValidationPipe` (`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`) in `main.ts` once validation is introduced.
- Separate **create**, **update** (often `PartialType`), and **response** DTOs when shapes diverge.
- Do not leak persistence entities as HTTP response types when they differ from the API contract.

## Errors & HTTP

- Use Nest built-in exceptions (`NotFoundException`, `BadRequestException`, `ConflictException`, etc.) from services/controllers.
- Prefer domain-meaningful messages; never expose stack traces or internal SQL in responses.
- Consistent status codes: `201` create, `200` update/get, `204` delete with no body, `404` missing resource, `400` validation.

## Async & errors

- Prefer `async`/`await` over raw Promise chains.
- Do not swallow errors. Catch only to translate or enrich, then rethrow.
- Log at boundaries (filters/interceptors), not deep inside pure domain helpers unless debugging.

## Testing

- Unit tests: `*.spec.ts` next to the unit under `src/` (Jest `rootDir: src`).
- E2E tests: `test/*.e2e-spec.ts` with Supertest against a Nest testing module.
- Test **behavior at seams** (controller HTTP contract, service public methods) — not private methods.
- Prefer real Nest testing utilities (`@nestjs/testing`) over hand-rolled DI mocks when practical.
- One logical behavior per test; name tests in domain language (`creates an archive item with tags`).

## Naming

| Kind | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `archive-items.service.ts` |
| Classes | PascalCase | `ArchiveItemsService` |
| Methods / vars | camelCase | `findById` |
| Constants | UPPER_SNAKE or const object | `DEFAULT_PAGE_SIZE` |
| DTOs | PascalCase + suffix | `CreateArchiveItemDto` |
| Modules | feature + Module | `ArchiveItemsModule` |

Use glossary terms from `CONTEXT.md`.

## Imports

- Prefer absolute paths only if the project configures path aliases; otherwise relative imports within a feature are fine.
- Keep import order readable: external packages, then Nest, then internal.
- Do not import from another feature's internal files — only through its module exports / public API.

## Config & secrets

- Configuration via env + Nest `ConfigModule` (when added). Validate env at bootstrap.
- Never commit secrets. Use `.env.example` for documented keys only.

## Dependencies

- Prefer first-party `@nestjs/*` packages and well-maintained peers.
- Justify every new dependency in the PR/commit message when non-obvious.
- Pin major versions thoughtfully; follow existing yarn.lock discipline.

## What not to do

- No business logic in controllers or middleware.
- No god services that own unrelated features — split modules.
- No speculative abstractions (generic repositories “for later”) without a second real use case.
- No changing public API shapes without updating `CONTEXT.md` / OpenAPI / frontend contract notes.
