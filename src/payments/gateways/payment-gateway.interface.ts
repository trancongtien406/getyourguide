import type { Prisma } from '@prisma/client';

/**
 * Result of a gateway payment initiation.
 */
export interface PaymentInitiationResult {
  providerPaymentId: string;
  redirectUrl?: string;
  payUrl?: string;
  deeplink?: string;
  qrCodeUrl?: string;
  expiresAt?: string;
  metadata: Record<string, unknown>;
}

/**
 * Result of verifying a webhook/IPN callback.
 */
export interface WebhookVerificationResult {
  valid: boolean;
  providerPaymentId: string | null;
  success: boolean;
  amount?: number;
  failureCode?: string;
  failureMessage?: string;
  rawPayload: Record<string, unknown>;
  /** Gateway-specific response to return to the provider */
  gatewayResponse: Record<string, unknown>;
}

/**
 * Booking data needed by gateways.
 */
export interface PayableBooking {
  id: string;
  bookingRef: string;
  totalAmount: Prisma.Decimal;
  currencyCode: string;
}

/**
 * Strategy interface for payment gateways.
 * Each gateway (VNPay, MoMo, Stripe, etc.) implements this interface.
 */
export interface PaymentGateway {
  /** Unique gateway key, e.g. 'vnpay', 'momo' */
  readonly gatewayKey: string;

  /**
   * Create a payment with the provider and return redirect/pay URLs.
   */
  initiatePayment(
    booking: PayableBooking,
    options: { returnUrl?: string; locale?: string; clientIp?: string },
  ): Promise<PaymentInitiationResult>;

  /**
   * Verify and parse an incoming webhook/IPN payload.
   * Returns structured result without side effects on the database.
   */
  verifyWebhook(
    payload: Record<string, unknown>,
  ): Promise<WebhookVerificationResult>;
}
