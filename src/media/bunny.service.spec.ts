import { ConfigService } from "@nestjs/config";
import { BunnyService } from "./bunny.service";

describe("BunnyService", () => {
  it("builds an uncropped low-resolution WebP thumbnail for images", () => {
    const config = {
      getOrThrow: jest.fn((key: string) => {
        if (key === "bunny.cdn.hostname") return "images.example.b-cdn.net";
        throw new Error(`Unexpected config key: ${key}`);
      }),
      get: jest.fn(() => undefined),
    } as unknown as ConfigService;
    const service = new BunnyService(config);

    const result = service.buildUrls("myna-archive/portrait.jpg", "image");

    expect(result.mediaUrl).toBe(
      "https://images.example.b-cdn.net/myna-archive/portrait.jpg",
    );
    expect(result.thumbnailUrl).toBe(
      "https://images.example.b-cdn.net/myna-archive/portrait.jpg?width=480&quality=68&format=webp",
    );
  });

  it("preserves an explicitly configured thumbnail query", () => {
    const config = {
      getOrThrow: jest.fn(() => "images.example.b-cdn.net"),
      get: jest.fn((key: string) =>
        key === "bunny.cdn.imageThumbQuery"
          ? "width=320&quality=55&format=webp"
          : undefined,
      ),
    } as unknown as ConfigService;
    const service = new BunnyService(config);

    const result = service.buildUrls("myna-archive/landscape.png", "image");

    expect(result.thumbnailUrl).toBe(
      "https://images.example.b-cdn.net/myna-archive/landscape.png?width=320&quality=55&format=webp",
    );
  });
});
