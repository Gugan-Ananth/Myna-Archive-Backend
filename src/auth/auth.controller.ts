import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { Public } from "../common/public.decorator";
import { AuthService } from "./auth.service";
import { LoginDto, type LoginResponse } from "./dto/login.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): LoginResponse {
    return this.auth.login(dto.email, dto.password);
  }
}
