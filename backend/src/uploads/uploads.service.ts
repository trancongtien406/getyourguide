import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreatePresignedUploadDto } from './dto/create-presigned-upload.dto';

@Injectable()
export class UploadsService {
  private readonly allowedContentTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/gif',
    'video/mp4',
    'application/pdf',
  ]);
  private readonly bucket = process.env.OBJECT_STORAGE_BUCKET;
  private readonly region = process.env.OBJECT_STORAGE_REGION ?? 'us-east-1';
  private readonly endpoint = process.env.OBJECT_STORAGE_ENDPOINT;
  private readonly accessKeyId = process.env.OBJECT_STORAGE_ACCESS_KEY;
  private readonly secretAccessKey = process.env.OBJECT_STORAGE_SECRET_KEY;
  private readonly forcePathStyle =
    process.env.OBJECT_STORAGE_FORCE_PATH_STYLE === 'true';
  private readonly cdnBaseUrl = process.env.CDN_BASE_URL;

  async createPresignedUpload(
    actor: JwtPayload,
    dto: CreatePresignedUploadDto,
  ) {
    if (!this.bucket || !this.accessKeyId || !this.secretAccessKey) {
      throw new InternalServerErrorException(
        'Object storage is not configured',
      );
    }

    if (!this.allowedContentTypes.has(dto.contentType.toLowerCase())) {
      throw new BadRequestException('Unsupported content type');
    }

    const s3Client = new S3Client({
      region: this.region,
      endpoint: this.endpoint,
      forcePathStyle: this.forcePathStyle,
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
      },
    });

    const folder = dto.folder ?? 'tour-media';
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const safeName = this.sanitizeFileName(dto.fileName);
    const key = `${folder}/${year}/${month}/${actor.sub}/${randomUUID()}-${safeName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: dto.contentType,
    });

    const expiresIn = 60 * 10;
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });

    return {
      uploadUrl,
      expiresIn,
      key,
      cdnUrl: this.buildPublicFileUrl(key),
    };
  }

  private sanitizeFileName(fileName: string) {
    return fileName
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9._-]/g, '');
  }

  private buildPublicFileUrl(key: string) {
    if (this.cdnBaseUrl) {
      return `${this.cdnBaseUrl.replace(/\/$/, '')}/${key}`;
    }

    if (this.endpoint) {
      return `${this.endpoint.replace(/\/$/, '')}/${this.bucket}/${key}`;
    }

    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}
