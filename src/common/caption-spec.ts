export const CAPTION_TEMPLATES = [
  "side-by-side",
  "image-top",
  "image-bottom",
  "text-overlay",
  "polaroid",
] as const;

export type CaptionTemplate = (typeof CAPTION_TEMPLATES)[number];

export const CAPTION_FONTS = [
  "Inter",
  "Serif",
  "Playfair",
  "Georgia",
  "Times New Roman",
  "Arial",
  "Courier New",
] as const;
export type CaptionFont = (typeof CAPTION_FONTS)[number];

export function isCaptionFont(value: unknown): value is CaptionFont {
  return (
    typeof value === "string" &&
    (CAPTION_FONTS as readonly string[]).includes(value)
  );
}

/** Generated still is the only media asset. Source lives on Caption Spec. */
export const CAPTION_ASSET_COUNT = 1;

export const MAX_CAPTION_STORY_CHARS = 6_000;

export const CAPTION_BASE_WIDTH = 1200;
export const CAPTION_MIN_HEIGHT = 800;
export const CAPTION_MAX_HEIGHT = 2400;
export const CAPTION_MIN_FONT_SIZE = 16;
export const CAPTION_MAX_FONT_SIZE = 48;
export const CAPTION_DEFAULT_FONT_SIZE = 24;
export const CAPTION_DEFAULT_PADDING = 40;

export type CaptionSpec = {
  version: 1;
  template: CaptionTemplate;
  width: number;
  height: number;
  fontFamily: CaptionFont;
  fontSize: number;
  padding: number;
  background: string;
  textColor: string;
  panelColor: string;
  /** Bunny Storage path of the original photo used to regenerate the still. */
  sourcePublicId: string;
  /** Derived CDN URL for the original photo. Filled on write after verify. */
  sourceMediaUrl: string;
  sourceWidth: number | null;
  sourceHeight: number | null;
};

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RGBA =
  /^rgba?\(\s*\d+(\.\d+)?\s*,\s*\d+(\.\d+)?\s*,\s*\d+(\.\d+)?(\s*,\s*(0|1|0?\.\d+))?\s*\)$/;

export const DEFAULT_CAPTION_SPEC: CaptionSpec = {
  version: 1,
  template: "side-by-side",
  width: CAPTION_BASE_WIDTH,
  height: CAPTION_MIN_HEIGHT,
  fontFamily: "Inter",
  fontSize: CAPTION_DEFAULT_FONT_SIZE,
  padding: CAPTION_DEFAULT_PADDING,
  background: "#121018",
  textColor: "#f3eefc",
  panelColor: "rgba(18, 16, 24, 0.82)",
  sourcePublicId: "",
  sourceMediaUrl: "",
  sourceWidth: null,
  sourceHeight: null,
};

export function isCaptionTemplate(
  value: unknown,
): value is CaptionTemplate {
  return (
    typeof value === "string" &&
    (CAPTION_TEMPLATES as readonly string[]).includes(value)
  );
}

function isColor(value: unknown): value is string {
  return typeof value === "string" && (HEX.test(value) || RGBA.test(value));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseSourcePublicId(value: unknown): string {
  if (typeof value !== "string") return "";
  const id = value.trim();
  if (!id || id.includes("..") || id.length > 500) return "";
  return id;
}

function parseOptionalDim(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.min(n, 20_000);
}

export function captionSourcePublicId(
  spec: CaptionSpec | null | undefined,
): string {
  return spec?.sourcePublicId?.trim() ?? "";
}

/** Coerce a client payload into a stored Caption Spec. Throws on garbage. */
export function parseCaptionSpec(raw: unknown): CaptionSpec {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("captionSpec is required");
  }
  const input = raw as Record<string, unknown>;
  const template = isCaptionTemplate(input.template)
    ? input.template
    : DEFAULT_CAPTION_SPEC.template;
  const fontFamily = isCaptionFont(input.fontFamily)
    ? input.fontFamily
    : DEFAULT_CAPTION_SPEC.fontFamily;
  const width = clamp(
    Math.round(Number(input.width) || CAPTION_BASE_WIDTH),
    640,
    CAPTION_BASE_WIDTH,
  );
  const height = clamp(
    Math.round(Number(input.height) || CAPTION_MIN_HEIGHT),
    CAPTION_MIN_HEIGHT,
    CAPTION_MAX_HEIGHT,
  );
  const fontSize = clamp(
    Math.round(Number(input.fontSize) || CAPTION_DEFAULT_FONT_SIZE),
    CAPTION_MIN_FONT_SIZE,
    CAPTION_MAX_FONT_SIZE,
  );
  const padding = clamp(
    Math.round(Number(input.padding) || CAPTION_DEFAULT_PADDING),
    16,
    96,
  );

  return {
    version: 1,
    template,
    width,
    height,
    fontFamily,
    fontSize,
    padding,
    background: isColor(input.background)
      ? input.background
      : DEFAULT_CAPTION_SPEC.background,
    textColor: isColor(input.textColor)
      ? input.textColor
      : DEFAULT_CAPTION_SPEC.textColor,
    panelColor: isColor(input.panelColor)
      ? input.panelColor
      : DEFAULT_CAPTION_SPEC.panelColor,
    sourcePublicId: parseSourcePublicId(input.sourcePublicId),
    sourceMediaUrl:
      typeof input.sourceMediaUrl === "string" ? input.sourceMediaUrl : "",
    sourceWidth: parseOptionalDim(input.sourceWidth),
    sourceHeight: parseOptionalDim(input.sourceHeight),
  };
}

export function normalizeCaptionStory(raw: string | undefined): string {
  const text = (raw ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/\r\n/g, "\n")
    .trim();
  return text;
}
