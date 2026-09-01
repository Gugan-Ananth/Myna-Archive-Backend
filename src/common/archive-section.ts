/** Top-level archive section for image posts. */
export const ARCHIVE_SECTIONS = ["images", "cute-things"] as const;

export type ArchiveSection = (typeof ARCHIVE_SECTIONS)[number];
