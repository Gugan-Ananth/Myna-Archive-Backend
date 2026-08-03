# Mocking guidelines

## Mock at the edge

Mock **I/O boundaries**: repositories, HTTP clients, queues, clocks (when time matters).

Do **not** mock:

- The class under test
- Pure mappers/helpers in the same unit (prefer real ones)
- Nest's DI container itself — use `Test.createTestingModule`

## Nest provider override

```ts
const module = await Test.createTestingModule({
  providers: [
    ArchiveItemsService,
    { provide: ARCHIVE_ITEMS_REPOSITORY, useValue: {
      create: jest.fn(),
      findById: jest.fn(),
    }},
  ],
}).compile();
```

Or override an imported module provider:

```ts
.overrideProvider(ArchiveItemsService)
.useValue(mockService)
```

## Fakes vs mocks

- **Fake** — in-memory repository with real behavior; great for service tests and early e2e.
- **Mock** — `jest.fn()` with programmed responses; great for asserting a single interaction.

Prefer fakes when the persistence port is simple; prefer mocks when the dependency is wide or slow.

## Assertions

Prefer state/behavior outcomes:

```ts
expect(result.rating).toBe(9);
await expect(service.findById('nope')).rejects.toBeInstanceOf(NotFoundException);
```

Use `toHaveBeenCalledWith` sparingly — when the outbound call **is** the behavior (e.g. publishing an event).
