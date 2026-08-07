/**
 * Normalize free text into a storage-safe slug.
 * Colons are stripped so encoded `category:tag` pairs stay unambiguous.
 */
export function slugify(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[:#]/g, " ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/** Title-case a slug when no explicit label is provided. */
export function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
