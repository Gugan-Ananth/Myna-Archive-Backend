---
name: diagnose-bugs
description: >
  Reproduce, isolate, and fix NestJS backend bugs with a structured loop. Use
  when debugging failing tests, 500s, validation issues, or the user runs
  /diagnose-bugs.
---

# Diagnose Bugs

## Loop

```text
Reproduce → Isolate → Hypothesize → Prove → Fix → Regress
```

### 1. Reproduce

- Capture exact request (method, path, headers, body) or test name.
- Run:

  ```bash
  yarn test -- <name>
  yarn test:e2e
  yarn start:dev
  ```

- Note expected vs actual (status code, body, stack).

### 2. Isolate

- Is it validation (pipe), guard, controller mapping, service logic, or persistence?
- Binary search with a focused unit test at the suspected seam.
- Read recent diffs: `git log -5 --oneline`, `git diff`.

### 3. Hypothesize

Write one falsifiable hypothesis:

> "ValidationPipe strips `tags` because the DTO lacks `@IsArray()`."

### 4. Prove

- Add a failing test that demonstrates the bug (preferred) **or** a minimal curl/httpie reproduction documented in the ticket.
- Confirm the hypothesis; if wrong, return to isolate.

### 5. Fix

- Smallest production change.
- Keep controllers thin; fix the layer that owns the bug.

### 6. Regress

- Leave the reproduction test green.
- Run broader suite: `yarn test` and e2e if HTTP-related.
- Check for related endpoints with the same mistake.

## Nest-specific footguns

| Symptom | Check |
|---------|-------|
| 400 on valid body | DTO decorators, global pipe options, `transform` |
| 200 empty / wrong shape | Serialization, service return, accidental `undefined` |
| DI error at boot | Module `providers` / `imports` / circular deps |
| e2e passes, prod fails | e2e missing `main.ts` global pipes/filters |
| Intermittent | shared in-memory state across tests; missing `afterEach` app.close |

## Output

```markdown
## Repro
## Root cause
## Fix
## Tests added
## Follow-ups
```
