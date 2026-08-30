import { signAccessToken, timingSafeStringEqual, verifyAccessToken } from "./token";

const SECRET = "test-secret-at-least-32-characters-long";

describe("access token", () => {
  it("signs a token that verifies with the same secret", () => {
    const token = signAccessToken(SECRET, 1_700_000_000);
    expect(verifyAccessToken(token, SECRET)).toBe(true);
  });

  it("does not expire based on age", () => {
    const token = signAccessToken(SECRET, 1);
    expect(verifyAccessToken(token, SECRET)).toBe(true);
  });

  it("rejects a token signed with a different secret", () => {
    const token = signAccessToken(SECRET);
    expect(verifyAccessToken(token, "other-secret-at-least-32-characters")).toBe(
      false,
    );
  });

  it("rejects a tampered payload", () => {
    const token = signAccessToken(SECRET);
    const [version, payload, signature] = token.split(".");
    const tampered = Buffer.from('{"sub":"owner","iat":1}').toString("base64url");
    expect(verifyAccessToken(`${version}.${tampered}.${signature}`, SECRET)).toBe(
      false,
    );
  });

  it("rejects malformed tokens", () => {
    expect(verifyAccessToken("", SECRET)).toBe(false);
    expect(verifyAccessToken("not-a-token", SECRET)).toBe(false);
    expect(verifyAccessToken("myna1.abc", SECRET)).toBe(false);
  });
});

describe("timingSafeStringEqual", () => {
  it("accepts identical strings", () => {
    expect(timingSafeStringEqual("secret", "secret")).toBe(true);
  });

  it("rejects different strings of the same length", () => {
    expect(timingSafeStringEqual("secret", "Secret")).toBe(false);
  });

  it("rejects different lengths", () => {
    expect(timingSafeStringEqual("ab", "abc")).toBe(false);
  });
});
