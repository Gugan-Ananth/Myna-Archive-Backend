import sharp from "sharp";
import { encodeImagePreview, MAX_PREVIEW_BYTES } from "./preview-encode";

describe("encodeImagePreview", () => {
  it("produces a WebP smaller than 1 MB from a large PNG", async () => {
    const input = await sharp({
      create: {
        width: 2400,
        height: 3200,
        channels: 3,
        background: { r: 180, g: 40, b: 90 },
      },
    })
      .png()
      .toBuffer();

    const preview = await encodeImagePreview(input);

    expect(preview.bytes).toBeLessThanOrEqual(MAX_PREVIEW_BYTES);
    expect(preview.width).toBeLessThanOrEqual(1280);
    expect(preview.height).toBeGreaterThan(0);
    const info = await sharp(preview.buffer).metadata();
    expect(info.format).toBe("webp");
  });
});
