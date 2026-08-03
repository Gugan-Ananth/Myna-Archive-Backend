# Tests — examples

## Service behavior

```ts
it('creates an archive item with tags', async () => {
  const created = await service.create({
    name: 'Sunset',
    description: 'Beach at dusk',
    tags: ['travel', 'orange'],
    rating: 8.5,
    thumbnailUrl: 'https://cdn.example/t.jpg',
    imageUrl: 'https://cdn.example/f.jpg',
  });

  expect(created.id).toEqual(expect.any(String));
  expect(created.tags).toEqual(['travel', 'orange']);
  expect(created.rating).toBe(8.5);
});

it('throws NotFoundException when archive item is missing', async () => {
  await expect(service.findById('missing')).rejects.toBeInstanceOf(NotFoundException);
});
```

## E2E HTTP contract

```ts
it('rejects rating above 10', () => {
  return request(app.getHttpServer())
    .post('/archive-items')
    .send({ name: 'x', description: '', tags: [], rating: 11, thumbnailUrl: 'https://a.com/t', imageUrl: 'https://a.com/i' })
    .expect(400);
});
```

## Prefer

- Domain-language names
- Independent expected values (literals from the spec)
- One behavior per `it`

## Avoid

- `expect(service['privateMethod'])`
- Asserting exact log messages as the primary signal
- Mega-tests that create, update, list, and delete in one case (split unless testing a true workflow)
