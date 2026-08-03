---
name: nest-auth
description: >
  Add NestJS authentication and authorization (guards, strategies, protected
  routes) for the archive API. Use when securing endpoints, adding JWT/API keys,
  or the user runs /nest-auth.
---

# Nest Auth

## Stop and decide first

Auth model must be intentional. If no ADR exists, draft one with `/grill-with-docs` covering:

- Single-user local vs multi-user
- Mechanism: JWT bearer, session cookie, API key, or "open local dev only"
- Which routes are public (e.g. health) vs protected

Do **not** paste a full Passport stack "just in case."

## Nest building blocks

| Piece | Role |
|-------|------|
| `Guard` | Allow/deny request (`CanActivate`) |
| `Strategy` | Passport strategy (JWT, local, etc.) when using `@nestjs/passport` |
| `@Public()` / custom decorator | Mark routes that skip auth when global guard is on |
| `@CurrentUser()` | Param decorator to inject user principal |

## Recommended early pattern (API key or single JWT)

1. `AuthModule` with a strategy or simple API-key guard.
2. Global `APP_GUARD` registration **or** explicit `@UseGuards` on controllers.
3. `@Public()` decorator for health/docs.
4. Config via env: `API_KEY` or `JWT_SECRET` — document in `.env.example`, never commit secrets.

## Guard sketch

```ts
@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const key = req.header('x-api-key');
    if (!key || key !== process.env.API_KEY) {
      throw new UnauthorizedException();
    }
    return true;
  }
}
```

## Authorization (later)

- Prefer role/permission checks in dedicated guards once multi-user exists.
- Keep ownership rules (e.g. "user can only edit own items") in the service layer with the principal passed from the controller.

## Testing

- Unit-test guards with mock `ExecutionContext`.
- E2E: missing credentials → `401`; valid credentials → success.
- Never hardcode production secrets in tests; use test module overrides.

## Checklist

- [ ] ADR or explicit product decision recorded
- [ ] Env vars documented in `.env.example`
- [ ] Public routes explicitly marked if guard is global
- [ ] Controllers stay free of credential parsing (guard/strategy only)
- [ ] e2e covers 401 and happy path
