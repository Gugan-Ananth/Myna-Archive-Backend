# Architecture Decision Records

Lightweight ADRs for irreversible or cross-cutting choices (persistence, media storage, auth, API versioning, tag semantics).

## Format

Files: `NNNN-short-kebab-title.md` starting at `0001`.

```markdown
# NNNN. Title

Date: YYYY-MM-DD

## Status

Proposed | Accepted | Superseded by NNNN | Deprecated

## Context

What forces the decision?

## Decision

What we will do.

## Consequences

What becomes easier, harder, or constrained. Note impact on frontend contract if any.
```

## Process

1. Prefer writing an ADR during `/grill-with-docs` or `/domain-modeling` when a durable choice is made.
2. Link ADRs from `CONTEXT.md` open decisions when closed.
3. Do not silently contradict an accepted ADR — reopen or supersede explicitly.
