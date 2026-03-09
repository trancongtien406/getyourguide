import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../common/services/mail.service';
import { createHash, randomInt } from 'crypto';

type OtpPurpose = 'RESET_PASSWORD' | 'VERIFY_EMAIL';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private generateOtpCode(): string {
    return randomInt(100000, 1000000).toString();
  }

  private getExpiryMinutes(purpose: OtpPurpose): number {
    switch (purpose) {
      case 'VERIFY_EMAIL':
        return 30;
      case 'RESET_PASSWORD':
      default:
        return 15;
    }
  }

  /**
   * Create and send an OTP for a given user & purpose.
   * Returns masked response; in non-production also returns the raw OTP for convenience.
   */
  async createAndSendOtpForUser(options: {
    userId: string;
    email: string;
    purpose: OtpPurpose;
  }) {
    const { userId, email, purpose } = options;

    const otpCode = this.generateOtpCode();
    const tokenKey =
      purpose === 'VERIFY_EMAIL'
        ? `verify:${email}:${otpCode}`
        : `${email}:${otpCode}`;
    const tokenHash = this.hashToken(tokenKey);
    const expiresAt = new Date(
      Date.now() + 1000 * 60 * this.getExpiryMinutes(purpose),
    );

    // Invalidate previous active tokens for this user & purpose
    await this.prisma.passwordResetToken.updateMany({
      where: {
        userId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });

    await this.prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    await this.sendOtpEmail({
      email,
      otpCode,
      purpose,
      expiresInMinutes: this.getExpiryMinutes(purpose),
    });

    const baseResponse = { message: 'OTP has been sent if the email exists.' };
    if (this.configService.get('NODE_ENV') !== 'production') {
      return { ...baseResponse, otp: otpCode };
    }
    return baseResponse;
  }

  /**
   * Validate an OTP for a given user & purpose.
   * Returns the token record if valid; throws otherwise.
   */
  async validateOtpForUser(options: {
    userId: string;
    email: string;
    otp: string;
    purpose: OtpPurpose;
  }) {
    const { userId, email, otp, purpose } = options;

    const tokenKey =
      purpose === 'VERIFY_EMAIL'
        ? `verify:${email}:${otp}`
        : `${email}:${otp}`;
    const tokenHash = this.hashToken(tokenKey);

    const token = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (
      !token ||
      token.userId !== userId ||
      token.usedAt ||
      token.expiresAt <= new Date()
    ) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    return token;
  }

  async markOtpAsUsed(tokenId: string) {
    await this.prisma.passwordResetToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    });
  }

  private async sendOtpEmail(options: {
    email: string;
    otpCode: string;
    purpose: OtpPurpose;
    expiresInMinutes: number;
  }) {
    const { email, otpCode, purpose, expiresInMinutes } = options;

    const subject =
      purpose === 'VERIFY_EMAIL'
        ? 'Verify your email address'
        : 'Your password reset OTP';

    await this.mailService.sendMail({
      to: email,
      subject,
      text: `Your OTP code is ${otpCode}. It expires in ${expiresInMinutes} minutes.`,
      html: `<p>Your OTP code is <b>${otpCode}</b>.</p><p>It expires in ${expiresInMinutes} minutes.</p>`,
    });

    if (this.configService.get('NODE_ENV') !== 'production') {
      this.logger.debug(`[DEV OTP] ${purpose} ${email}: ${otpCode}`);
    }
  }
}

