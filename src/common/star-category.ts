/** Dashboard categories that have independent star limits. */
export const STAR_CATEGORIES = [
  "images",
  "cute-things",
  "collections",
  "comics",
  "captions",
  "videos",
  "stories",
  "oc",
] as const;

export type StarCategory = (typeof STAR_CATEGORIES)[number];

export const MAX_STARS_PER_CATEGORY = 10;
