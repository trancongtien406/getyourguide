import { ForbiddenException, Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

interface GuestBookingTokenPayload {
  bookingId: string;
  purpose: 'guest-booking';
  exp: number;
}

@Injectable()
export class GuestBookingTokenService {
  private readonly secret: string;
  private readonly ttlSeconds = 7 * 24 * 60 * 60;

  constructor() {
    this.secret =
      process.env.GUEST_BOOKING_TOKEN_SECRET ||
      process.env.JWT_ACCESS_SECRET ||
      '';

    if (!this.secret) {
      throw new Error('Guest booking token secret is not configured');
    }
  }

  createToken(bookingId: string): string {
    const payload: GuestBookingTokenPayload = {
      bookingId,
      purpose: 'guest-booking',
      exp: Math.floor(Date.now() / 1000) + this.ttlSeconds,
    };

    const encodedPayload = this.encodePayload(payload);
    const signature = this.sign(encodedPayload);

    return `${encodedPayload}.${signature}`;
  }

  assertValidForBooking(token: string | undefined, bookingId: string): void {
    if (!token) {
      throw new ForbiddenException('Missing guest booking token');
    }

    const [encodedPayload, signature] = token.split('.');
    if (!encodedPayload || !signature) {
      throw new ForbiddenException('Invalid guest booking token');
    }

    const expectedSignature = this.sign(encodedPayload);
    if (!this.isSignatureValid(signature, expectedSignature)) {
      throw new ForbiddenException('Invalid guest booking token');
    }

    const payload = this.decodePayload(encodedPayload);
    if (!payload || payload.purpose !== 'guest-booking') {
      throw new ForbiddenException('Invalid guest booking token');
    }

    if (payload.bookingId !== bookingId) {
      throw new ForbiddenException(
        'Guest booking token does not match booking',
      );
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) {
      throw new ForbiddenException('Guest booking token has expired');
    }
  }

  private encodePayload(payload: GuestBookingTokenPayload): string {
    return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  }

  private decodePayload(
    encodedPayload: string,
  ): GuestBookingTokenPayload | null {
    try {
      const json = Buffer.from(encodedPayload, 'base64url').toString('utf8');
      return JSON.parse(json) as GuestBookingTokenPayload;
    } catch {
      return null;
    }
  }

  private sign(encodedPayload: string): string {
    return createHmac('sha256', this.secret)
      .update(encodedPayload)
      .digest('base64url');
  }

  private isSignatureValid(
    signature: string,
    expectedSignature: string,
  ): boolean {
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(signatureBuffer, expectedBuffer);
  }
}
