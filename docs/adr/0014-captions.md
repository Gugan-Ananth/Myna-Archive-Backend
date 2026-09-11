# 0014. Bondage captions as their own Archive Item kind

Date: 2026-09-11

## Status

Accepted

## Context

Photos are a single still. Stories are long-form HTML. Captions are a third job: a source image plus a short story, composed into one still with a layout template. The composed PNG is what grids show; the story and template must stay editable so the still can be regenerated.

## Decision

- Add `mediaType: "caption"`. List with `mediaType=caption` so captions never mix into Photos.
- `mediaAssets[0]` is the generated still (the only gallery asset).
- `bodyHtml` stores the story as plain text. `captionSpec` (JSONB) stores template, canvas, font, colors, and `sourcePublicId` of the original photo.
- PATCH may replace the generated still and spec so Edit caption can regenerate. The previous still is destroyed. A replaced source photo is destroyed too.
- Companion frontend composes the still with Satori + Sharp; Nest only stores the result.

Rejected: storing captions as tagged images; treating the generated PNG as the only source of truth; storing the original photo as a second gallery asset.

## Consequences

- Star category `captions` is independent (max 10).
- Search on the Captions board includes the story body.
