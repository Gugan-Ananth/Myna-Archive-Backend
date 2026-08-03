---
name: domain-modeling
description: >
  Grow domain language and ADRs for the Myna Archive backend. Use when defining
  terms, resolving ambiguous product language, writing CONTEXT.md updates, or
  the user runs /domain-modeling.
---

# Domain Modeling

Keep code and conversation aligned with a single glossary.

## Sources of truth

- `CONTEXT.md` — glossary and core model
- `docs/adr/` — durable technical decisions
- `docs/agents/domain.md` — how skills consume domain docs

## When to run

- New concept appears (e.g. "album", "collection", "share link")
- Two synonyms fight in conversation
- API shape would invent fields not in the glossary
- Persistence/auth/media choice needs a durable record

## Process

1. **Inventory** — list candidate terms and how they appear in frontend (`ArchiveItem`, tags, rating) and any open tickets.
2. **Define** — for each term: definition, **avoid** synonyms, relationships.
3. **Update `CONTEXT.md`** — edit glossary tables; keep the core model block accurate.
4. **ADR if needed** — when the decision is technical and hard to reverse (DB, storage, auth, route prefix). Use `docs/adr/README.md` format. Next number after existing files.
5. **Propagate** — note which DTOs/routes/tests should adopt the term in the next implementation ticket (do not mass-rename unless asked).

## CONTEXT.md entry template

```markdown
| **Term** | Definition in one sentence. | "bad synonym", "other synonym" |
```

## ADR trigger examples

| Decision | ADR? |
|----------|------|
| Rename "rating" display to stars in UI only | No (UI) |
| Store tags normalized lowercase | Yes |
| Postgres + TypeORM | Yes |
| Route prefix `/api/v1` | Yes |
| Temporary in-memory repo | Short ADR or CONTEXT open decision |

## Rules

- Prefer fewer, sharper terms over a large thesaurus.
- Do not invent multi-context splits without pain (see single context in `CONTEXT.md`).
- Frontend contract breaks require an explicit note in the ADR consequences.
