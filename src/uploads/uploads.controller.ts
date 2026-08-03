import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreatePresignedUploadDto } from './dto/create-presigned-upload.dto';
import { UploadsService } from './uploads.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('presign')
  createPresignedUpload(
    @CurrentUser() actor: JwtPayload,
    @Body() dto: CreatePresignedUploadDto,
  ) {
    return this.uploadsService.createPresignedUpload(actor, dto);
  }
}
