# 0012. Comics as a first-class Archive Item kind

Date: 2026-08-29

## Status

Accepted

## Context

Image groups (ADR 0009) cap at **10** images and use a carousel. Users also keep **comics** (ordered pages, often dozens) and should not dump those into Photos as oversized groups. Alternates of a single pin stay on the image-group card; they are not this decision.

## Decision

1. Add `mediaType: "comic"` on Archive Item. Pages are ordered `mediaAssets` (cover = index 0), same storage path as image groups.
2. Cap **1–80** pages (`MAX_COMIC_ASSETS`). Image groups stay **1–10**.
3. List/filter with `mediaType=comic` so comics are not mixed into Photos.
4. Upload still uses image signatures (Bunny Storage PUT); finalize sends `mediaType: "comic"` and `assets[]`.
5. Media replace / reordering after create stays out of scope (same as image groups).

Rejected: raising the image-group cap to cover both jobs; folding comics into Stories (written HTML + chapters).

## Consequences

- Companion frontend: own Add card, `/create/comic`, vertical reader, Comics home section.
- Nested per-page alternates are a later model; do not flatten them into the page list.
