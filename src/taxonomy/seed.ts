export type SeedTag = { slug: string; label: string; sortOrder: number };
export type SeedCategory = {
  slug: string;
  label: string;
  sortOrder: number;
  tags: SeedTag[];
};

/** Built-in category → tag vocabulary (seeded on boot). */
export const TAXONOMY_SEED: SeedCategory[] = [
  {
    slug: "bondage",
    label: "Bondage",
    sortOrder: 10,
    tags: [
      { slug: "hogtie", label: "Hogtie", sortOrder: 10 },
      {
        slug: "suspension-hogtie",
        label: "Suspension hogtie",
        sortOrder: 20,
      },
      { slug: "strappado", label: "Strappado", sortOrder: 30 },
      { slug: "ball-tie", label: "Ball tie", sortOrder: 40 },
      { slug: "box-tie", label: "Box tie", sortOrder: 50 },
      { slug: "reverse-prayer", label: "Reverse prayer", sortOrder: 60 },
      { slug: "armbinder", label: "Armbinder", sortOrder: 70 },
    ],
  },
  {
    slug: "artists",
    label: "Artists",
    sortOrder: 20,
    tags: [
      { slug: "yuy", label: "Yuy", sortOrder: 10 },
      { slug: "bagel-bomb", label: "Bagel bomb", sortOrder: 20 },
      { slug: "harris", label: "Harris", sortOrder: 30 },
      { slug: "plusout", label: "Plusout", sortOrder: 40 },
    ],
  },
];
