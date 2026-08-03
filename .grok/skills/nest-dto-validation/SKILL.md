---
name: nest-dto-validation
description: >
  Create NestJS DTOs with class-validator / class-transformer and wire the global
  ValidationPipe. Use when adding request validation, query DTOs, or the user
  runs /nest-dto-validation.
---

# Nest DTO & Validation

## Goal

Type-safe, validated request surfaces that match domain rules in `CONTEXT.md` and `CODING_STANDARDS.md`.

## Dependencies

If not already present:

```bash
yarn add class-validator class-transformer
```

Do not add them if unused; only when introducing the first validated DTO.

## Global ValidationPipe

In `main.ts` (once):

```ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }),
);
```

- `whitelist` — strip unknown properties  
- `forbidNonWhitelisted` — 400 if clients send unknown keys  
- `transform` — plain objects → DTO class instances  

## DTO patterns

### Create body

```ts
// create-archive-item.dto.ts
import { IsString, IsNumber, IsArray, IsUrl, Max, Min, MaxLength } from 'class-validator';

export class CreateArchiveItemDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsString()
  description!: string;

  @IsArray()
  @IsString({ each: true })
  tags!: string[];

  @IsNumber()
  @Min(0)
  @Max(10)
  rating!: number;

  @IsUrl()
  thumbnailUrl!: string;

  @IsUrl()
  imageUrl!: string;
}
```

### Partial update

Prefer `@nestjs/mapped-types`:

```ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateArchiveItemDto } from './create-archive-item.dto';

export class UpdateArchiveItemDto extends PartialType(CreateArchiveItemDto) {}
```

Add `@nestjs/mapped-types` only if missing and needed.

### Query / filter DTO

```ts
export class ListArchiveItemsQueryDto {
  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  minRating?: number;
}
```

Use `@Type(() => Number)` from `class-transformer` for query strings.

## Domain rules to encode

From `CONTEXT.md` (update validators when glossary changes):

- Rating: **0.0–10.0**
- Tags: array of strings (normalization is an ADR decision — do not invent silently)
- URLs: valid URL strings until a media-upload flow replaces them

## Response DTOs

Use response classes when you need serialization control (`@Exclude` / `@Expose` with `ClassSerializerInterceptor`). Until then, plain typed return shapes or interfaces are fine — do not over-engineer.

## Tests

- Unit-test DTO validation only if custom validators exist; otherwise rely on e2e `400` cases with bad payloads.
- Always include at least one invalid-body e2e (or controller-level) example for new write endpoints.

## Checklist

- [ ] DTO lives under `src/<feature>/dto/`
- [ ] Global pipe enabled (or module-scoped pipe with same options)
- [ ] Domain constraints expressed as validators
- [ ] Update DTO uses PartialType when appropriate
- [ ] Forbidden unknown properties behavior verified
