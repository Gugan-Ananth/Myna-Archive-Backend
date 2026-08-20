import { clientIpFromRequest } from "./client-ip";

describe("clientIpFromRequest", () => {
  it("uses the first X-Forwarded-For hop", () => {
    expect(
      clientIpFromRequest({
        headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" },
        socket: { remoteAddress: "127.0.0.1" },
      }),
    ).toBe("203.0.113.10");
  });

  it("falls back to X-Real-IP", () => {
    expect(
      clientIpFromRequest({
        headers: { "x-real-ip": "198.51.100.20" },
        socket: { remoteAddress: "127.0.0.1" },
      }),
    ).toBe("198.51.100.20");
  });

  it("strips IPv4-mapped IPv6 prefixes", () => {
    expect(
      clientIpFromRequest({
        headers: {},
        ip: "::ffff:192.0.2.1",
      }),
    ).toBe("192.0.2.1");
  });

  it("returns null when nothing is present", () => {
    expect(clientIpFromRequest({ headers: {} })).toBeNull();
  });
});
