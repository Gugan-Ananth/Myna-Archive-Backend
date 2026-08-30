import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { LoginResponse } from "./dto/login.dto";
import { signAccessToken, timingSafeStringEqual, verifyAccessToken } from "./token";

@Injectable()
export class AuthService {
  constructor(private readonly config: ConfigService) {}

  login(email: string, password: string): LoginResponse {
    const expectedEmail = this.config.getOrThrow<string>("auth.email");
    const expectedPassword = this.config.getOrThrow<string>("auth.password");
    const secret = this.config.getOrThrow<string>("auth.tokenSecret");

    const emailOk = timingSafeStringEqual(
      normalizeEmail(email),
      normalizeEmail(expectedEmail),
    );
    const passwordOk = timingSafeStringEqual(password, expectedPassword);

    if (!emailOk || !passwordOk) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    return { accessToken: signAccessToken(secret) };
  }

  isAccessTokenValid(token: string): boolean {
    const secret = this.config.getOrThrow<string>("auth.tokenSecret");
    return verifyAccessToken(token, secret);
  }
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}
