import { normalizeTags } from './normalize-tags';

describe('normalizeTags', () => {
  it('trims, strips leading #, lowercases, and de-dupes', () => {
    expect(normalizeTags([' #Fog ', 'FOG', 'water', 'Water'])).toEqual([
      'fog',
      'water',
    ]);
  });

  it('drops empty strings after normalize', () => {
    expect(normalizeTags(['', '  ', '#', 'ok'])).toEqual(['ok']);
  });
});
