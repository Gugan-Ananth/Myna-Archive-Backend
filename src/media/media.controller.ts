import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import {
  UploadSignatureDto,
  type UploadSignatureResponse,
} from './dto/upload-signature.dto';

@Controller('media')
export class MediaController {
  constructor(private readonly cloudinary: CloudinaryService) {}

  @Post('upload-signature')
  @HttpCode(HttpStatus.OK)
  createUploadSignature(
    @Body() dto: UploadSignatureDto,
  ): UploadSignatureResponse {
    return this.cloudinary.createUploadSignature(dto);
  }
}
