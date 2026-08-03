---
name: to-tickets
description: >
  Break a spec/PRD into small tracer-bullet implementation tickets for the Nest
  backend. Use when slicing work, planning sprints for agents, or the user runs
  /to-tickets.
---

# To Tickets

Turn a spec into ordered, implementable slices.

## Preconditions

- Spec issue number or path (from `/to-spec` or user).
- Fetch with `gh issue view <n> --comments` when remote.

## Ticket qualities

Each ticket must be:

1. **Vertical** — delivers a thin user-visible or API-visible slice (not "all DTOs" then "all services").
2. **Testable** — clear acceptance criteria and seams.
3. **Sized for one agent session** — prefer hours, not days.
4. **Ordered** — dependencies explicit (`Part of #spec`, `Blocked by #n`).

## Suggested slice order (Nest archive)

1. Module + health/list empty path
2. Create item (DTO + validation + service + e2e)
3. Get by id
4. List + filter (tags/rating)
5. Update / patch rating/tags
6. Delete
7. Persistence swap (in-memory → real DB) if separate
8. Auth guard on write routes if required

## Ticket body template

```markdown
Part of #<spec>

## Goal
...

## Acceptance criteria
- [ ] ...
- [ ] yarn test / relevant e2e pass

## Implementation notes
- Module/path: `src/...`
- Skills: /nest-endpoint, /tdd, ...

## Out of scope
- ...
```

## Steps

1. Extract acceptance criteria from the spec.
2. Propose 3–8 tickets in order; adjust with the user.
3. Create issues:

   ```bash
   gh issue create --title "..." --body "..." --label "ready-for-agent"
   ```

4. Link each with `Part of #<spec>` at the top.
5. Summarize the graph (what unblocks what).

## Rules

- Do not create tickets for pure chore without a behavior change unless the user wants tooling tickets.
- Prefer `ready-for-agent` only when criteria are unambiguous; else `needs-info` / `ready-for-human`.
