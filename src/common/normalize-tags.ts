/**
 * Normalize freeform tags to match frontend create-form behavior:
 * trim, strip a single leading #, lowercase, de-dupe (order preserved).
 */
export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of tags) {
    const cleaned = raw.trim().replace(/^#/, "").toLowerCase();
    if (!cleaned || seen.has(cleaned)) {
      continue;
    }
    seen.add(cleaned);
    result.push(cleaned);
  }

  return result;
}
