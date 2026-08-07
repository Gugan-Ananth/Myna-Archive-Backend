import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { BunnyService } from "./bunny.service";
import {
  UploadSignatureDto,
  type UploadSignatureResponse,
} from "./dto/upload-signature.dto";

@Controller("media")
export class MediaController {
  constructor(private readonly bunny: BunnyService) {}

  @Post("upload-signature")
  @HttpCode(HttpStatus.OK)
  createUploadSignature(
    @Body() dto: UploadSignatureDto,
  ): Promise<UploadSignatureResponse> {
    return this.bunny.createUploadSignature(dto);
  }
}
