import {
  isStoredPreviewUrl,
  previewPublicIdFor,
  stripMediaQuery,
} from "./preview-public-id";

describe("previewPublicIdFor", () => {
  it("appends -preview.webp to the original storage path", () => {
    expect(previewPublicIdFor("myna-archive/abc.png")).toBe(
      "myna-archive/abc-preview.webp",
    );
  });

  it("does not double-suffix an existing preview object", () => {
    expect(previewPublicIdFor("myna-archive/abc-preview.webp")).toBe(
      "myna-archive/abc-preview.webp",
    );
  });
});

describe("isStoredPreviewUrl", () => {
  it("treats optimizer query variants of the original as not a stored preview", () => {
    expect(
      isStoredPreviewUrl(
        "https://cdn.example/myna-archive/a.png?width=480",
        "https://cdn.example/myna-archive/a.png",
      ),
    ).toBe(false);
  });

  it("detects a distinct preview object", () => {
    expect(
      isStoredPreviewUrl(
        "https://cdn.example/myna-archive/a-preview.webp",
        "https://cdn.example/myna-archive/a.png",
      ),
    ).toBe(true);
  });
});

describe("stripMediaQuery", () => {
  it("drops optimizer params", () => {
    expect(
      stripMediaQuery("https://cdn.example/a.png?width=480&quality=68"),
    ).toBe("https://cdn.example/a.png");
  });
});
