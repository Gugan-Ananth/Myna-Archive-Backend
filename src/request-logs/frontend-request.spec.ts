import { isApiPath, isFrontendRequest } from "./frontend-request";

describe("isApiPath", () => {
  it("accepts versioned API paths", () => {
    expect(isApiPath("/api/v1/archive-items")).toBe(true);
    expect(isApiPath("/api/v1")).toBe(true);
  });

  it("rejects scanner and health paths", () => {
    expect(isApiPath("/robots.txt")).toBe(false);
    expect(isApiPath("/favicon.ico")).toBe(false);
    expect(isApiPath("/health")).toBe(false);
    expect(isApiPath("/")).toBe(false);
  });
});

describe("isFrontendRequest", () => {
  const corsOrigin = "https://archive.example";

  it("matches Origin against CORS_ORIGIN", () => {
    expect(
      isFrontendRequest({ origin: "https://archive.example" }, corsOrigin),
    ).toBe(true);
  });

  it("matches Referer origin against CORS_ORIGIN", () => {
    expect(
      isFrontendRequest(
        { referer: "https://archive.example/item/abc" },
        corsOrigin,
      ),
    ).toBe(true);
  });

  it("rejects missing Origin and Referer", () => {
    expect(isFrontendRequest({}, corsOrigin)).toBe(false);
  });

  it("rejects a different origin", () => {
    expect(
      isFrontendRequest({ origin: "https://evil.example" }, corsOrigin),
    ).toBe(false);
  });

  it("rejects a host that only prefixes the frontend origin", () => {
    expect(
      isFrontendRequest(
        { origin: "https://archive.example.attacker.com" },
        corsOrigin,
      ),
    ).toBe(false);
  });
});
