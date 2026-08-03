---
name: grill-with-docs
description: >
  Sharpen a plan by grilling requirements and growing domain docs (CONTEXT.md,
  ADRs) before implementation. Use when starting a feature, clarifying product
  scope, or the user runs /grill-with-docs.
---

# Grill With Docs

Socratic design pass that **produces better tickets and durable domain language**, not code.

## Goals

1. Expose hidden assumptions about the archive product and API.
2. Update `CONTEXT.md` / ADRs when terms or decisions solidify.
3. Leave a crisp plan ready for `/to-spec` or `/to-tickets`.

## Process

### 1. Load

- `CONTEXT.md`, `docs/adr/*`, relevant existing modules under `src/`
- Companion frontend contract if API-facing (`ArchiveItem` fields)
- User's rough idea or issue text

### 2. Grill (ask, don't assume)

Cover at least:

| Area | Example questions |
|------|-------------------|
| Actor | Single user? Local-only? |
| Resource | What is created/listed/updated? |
| Fields | Required vs optional? Defaults? |
| Invariants | Rating bounds? Unique names? |
| Media | URLs only or upload binary? |
| Search | Tag filter? Full-text? Sort by rating? |
| Errors | What 404/409 cases exist? |
| Non-goals | What are we explicitly not building? |

Ask **one cluster at a time**. Prefer concrete examples over abstract architecture.

### 3. Capture decisions

- Glossary changes → edit `CONTEXT.md` (via `/domain-modeling` patterns)
- Technical choices → `docs/adr/NNNN-....md`
- Open questions → list under "Fog" / open decisions — do not invent answers

### 4. Output a plan

```markdown
## Intent
...

## Domain changes
- CONTEXT.md: ...
- ADRs: ...

## API sketch
| Method | Path | Notes |
|--------|------|-------|

## Vertical slices (tracer bullets)
1. ...
2. ...

## Non-goals
...

## Risks
...
```

### 5. Next step

Recommend `/to-spec` (publish PRD) or `/to-tickets` (if already specified) or `/implement` for a tiny spike.

## Rules

- Do not implement production code in this skill.
- Do not expand scope into frontend UI work unless the user wants a full-stack contract discussion.
- Prefer reversible defaults when the user is unsure; mark them as provisional in CONTEXT open decisions.
