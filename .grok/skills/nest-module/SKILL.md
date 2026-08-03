---
name: nest-module
description: >
  Scaffold a NestJS feature module (module, controller, service, DTOs folder)
  following this repo's layout and domain language. Use when adding a new feature
  area, creating a module, or the user runs /nest-module.
---

# Nest Module Scaffold

Create a complete feature module under `src/<feature>/` aligned with `AGENTS.md` and `CODING_STANDARDS.md`.

## Preconditions

1. Read `CONTEXT.md` — use glossary terms for the feature name.
2. Confirm the feature name with the user if ambiguous (e.g. `archive-items` not `items` unless ADR says so).
3. Prefer kebab-case folder and file prefixes matching the feature.

## Steps

1. **Choose the feature slug**  
   Example: `archive-items` → class prefix `ArchiveItems`.

2. **Create files** (only what is needed for the first vertical slice):

   ```
   src/<feature>/
     <feature>.module.ts
     <feature>.controller.ts
     <feature>.service.ts
     dto/                    # empty or with first DTOs
     <feature>.controller.spec.ts
     <feature>.service.spec.ts
   ```

3. **Wire the module**

   - `@Module({ controllers, providers, exports })`
   - Export the service only if another module will inject it.
   - Import feature module into `AppModule` (or a parent module).

4. **Controller skeleton**

   - `@Controller('<route>')` — choose route from domain/ADR; default REST resource path.
   - Inject the service via constructor.
   - No business logic.

5. **Service skeleton**

   - `@Injectable()`
   - Methods named with domain verbs.
   - Throw Nest HTTP exceptions for not-found / conflict cases.

6. **Register tests**

   - Service unit test with `Test.createTestingModule`.
   - Controller unit test mocking the service, **or** defer HTTP checks to e2e — but create at least one failing/passing seam test if `/tdd` is in play.

7. **Verify**

   ```bash
   yarn build
   yarn test -- <feature>
   ```

## Conventions

- File names: kebab-case. Classes: PascalCase.
- Do not put persistence details in the controller.
- Do not create a generic "base CRUD module" unless a second feature truly shares the same shape.
- Prefer the Nest CLI only if it matches this layout; hand-written files are fine.

## Output

Summarize created paths, the public route prefix, and what the next ticket should add (endpoint, entity, etc.).
