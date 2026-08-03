---
name: nest-testing
description: >
  Write NestJS unit and e2e tests with Jest, @nestjs/testing, and Supertest.
  Use when adding tests, setting up testing modules, or the user runs /nest-testing.
---

# Nest Testing

Align with `/tdd` and `CODING_STANDARDS.md`. Prefer behavior at public seams.

## Layout

| Kind | Location | Runner |
|------|----------|--------|
| Unit | `src/**/*.spec.ts` | `yarn test` |
| E2E | `test/**/*.e2e-spec.ts` | `yarn test:e2e` |

## Unit: service

```ts
describe('ArchiveItemsService', () => {
  let service: ArchiveItemsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ArchiveItemsService,
        { provide: ARCHIVE_ITEMS_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    service = module.get(ArchiveItemsService);
  });

  it('creates an archive item with tags', async () => {
    // arrange → act → assert
  });
});
```

- Mock **ports** (repositories, external HTTP), not every private collaborator.
- Assert domain outcomes and thrown Nest exceptions (`NotFoundException`).

## Unit: controller

```ts
const module = await Test.createTestingModule({
  controllers: [ArchiveItemsController],
  providers: [{ provide: ArchiveItemsService, useValue: mockService }],
}).compile();
```

- Verify the controller delegates and returns the service result.
- Prefer e2e for full HTTP validation pipe behavior.

## E2E

```ts
describe('ArchiveItems (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule], // or a focused test module
    }).compile();

    app = moduleFixture.createNestApplication();
    // Apply the same global pipes/filters as main.ts
    app.useGlobalPipes(new ValidationPipe({ /* same as prod */ }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /archive-items creates an item', () => {
    return request(app.getHttpServer())
      .post('/archive-items')
      .send({ /* valid body */ })
      .expect(201);
  });
});
```

**Critical:** e2e setup must mirror `main.ts` globals (ValidationPipe, prefix, CORS is optional). Drift here causes false confidence.

## Naming

Use domain language:

- `creates an archive item with tags`
- `returns 404 when archive item is missing`
- `rejects rating above 10`

## Anti-patterns

- Testing private methods
- Snapshotting entire Nest modules
- Asserting mock call order instead of observable behavior
- e2e without the production ValidationPipe options

## Commands

```bash
yarn test
yarn test -- archive-items.service
yarn test:watch
yarn test:cov
yarn test:e2e
```

## Checklist for a new endpoint

- [ ] Service unit test for happy path + primary failure
- [ ] E2E happy path
- [ ] E2E validation failure (`400`) when DTO validation exists
- [ ] Tests pass under `yarn test` / `yarn test:e2e`
