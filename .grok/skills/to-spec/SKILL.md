---
name: to-spec
description: >
  Turn a grilled plan or conversation into a PRD/spec published as a GitHub
  issue. Use when writing a product/API spec, or the user runs /to-spec.
---

# To Spec

Publish a durable specification for the archive backend feature.

## Preconditions

- Prefer running after `/grill-with-docs` so domain language is stable.
- Issue tracker workflow: `docs/agents/issue-tracker.md` (`gh`).

## Spec body template

```markdown
## Summary
One paragraph: problem + outcome.

## Background
Why now; links to CONTEXT/ADR if relevant.

## Goals
- ...

## Non-goals
- ...

## Domain
Terms used (must match CONTEXT.md): ...

## API contract
### Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|

### Request / response examples
```json
// ...
```

### Error cases
| Status | When |
|--------|------|

## Data & persistence
What is stored; ID strategy; media handling.

## Acceptance criteria
- [ ] ...
- [ ] ...

## Test plan
Seams: service / e2e. Key scenarios.

## Open questions
- ...
```

## Steps

1. Draft the spec in chat using the template and domain terms.
2. Confirm critical acceptance criteria with the user if any are ambiguous.
3. Publish:

   ```bash
   gh issue create --title "[Spec] <short name>" --body "$(cat <<'EOF'
   ...
   EOF
   )" --label "needs-triage"
   ```

   Adjust labels per `docs/agents/triage-labels.md` (e.g. `ready-for-agent` when fully crisp).

4. Return the issue URL and number.

## Rules

- Specs describe **observable behavior**, not Nest class diagrams.
- Keep API examples aligned with `ArchiveItem` unless the spec deliberately changes the contract (call that out).
- If `gh` is unavailable, write the spec to `docs/specs/<slug>.md` and tell the user.
