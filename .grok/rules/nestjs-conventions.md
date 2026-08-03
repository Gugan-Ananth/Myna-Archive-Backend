# NestJS conventions (project rules)

- Feature modules under `src/<feature>/` with kebab-case file names.
- Controllers: HTTP only. Services: business rules. DTOs: validation.
- Constructor injection only; no manual `new` of providers.
- Prefer Nest exceptions (`NotFoundException`, etc.) over ad-hoc error objects for HTTP paths.
- Register cross-cutting pipes/filters/guards in `main.ts` or via `APP_*` providers — keep e2e in sync.
- Export only what other modules need from `@Module({ exports })`.
