import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { verifyAccessToken } from "./token";

const EMAIL = "admin@myna.archive";
const PASSWORD = "Test@123";
const SECRET = "test-secret-at-least-32-characters-long";

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              switch (key) {
                case "auth.email":
                  return EMAIL;
                case "auth.password":
                  return PASSWORD;
                case "auth.tokenSecret":
                  return SECRET;
                default:
                  throw new Error(`unexpected config key ${key}`);
              }
            },
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it("returns a never-expiring access token for the hardcoded account", () => {
    const { accessToken } = service.login(EMAIL, PASSWORD);
    expect(verifyAccessToken(accessToken, SECRET)).toBe(true);
    expect(service.isAccessTokenValid(accessToken)).toBe(true);
  });

  it("accepts the email case-insensitively", () => {
    const { accessToken } = service.login("  Admin@Myna.Archive  ", PASSWORD);
    expect(accessToken).toBeTruthy();
  });

  it("rejects the wrong password", () => {
    expect(() => service.login(EMAIL, "nope")).toThrow(UnauthorizedException);
  });

  it("rejects an unknown email", () => {
    expect(() => service.login("other@example.com", PASSWORD)).toThrow(
      UnauthorizedException,
    );
  });
});
