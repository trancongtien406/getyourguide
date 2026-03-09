import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import type {
    PayableBooking,
    PaymentGateway,
    PaymentInitiationResult,
    WebhookVerificationResult,
} from './payment-gateway.interface';

@Injectable()
export class VnpayGateway implements PaymentGateway {
  readonly gatewayKey = 'vnpay';

  constructor(private readonly configService: ConfigService) {}

  async initiatePayment(
    booking: PayableBooking,
    options: { returnUrl?: string; locale?: string; clientIp?: string },
  ): Promise<PaymentInitiationResult> {
    const tmnCode = this.configService.get('VNPAY_TMN_CODE');
    const hashSecret = this.configService.get('VNPAY_HASH_SECRET');
    const paymentUrl =
      this.configService.get('VNPAY_PAYMENT_URL') ?? 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    const returnUrl = options.returnUrl ?? this.configService.get('VNPAY_RETURN_URL');

    if (!tmnCode || !hashSecret || !returnUrl) {
      throw new InternalServerErrorException('VNPay configuration is missing');
    }

    const now = new Date();
    const createDate = this.formatDate(now);
    const expireDate = this.formatDate(new Date(now.getTime() + 15 * 60 * 1000));
    const txnRef = `VNP-${booking.bookingRef}-${Date.now().toString(36).toUpperCase()}`;
    const amount = Math.round(booking.totalAmount.toNumber() * 100);

    const params: Record<string, string> = {
      vnp_Version: this.configService.get('VNPAY_VERSION') ?? '2.1.0',
      vnp_Command: this.configService.get('VNPAY_COMMAND') ?? 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Amount: String(amount),
      vnp_CurrCode: this.configService.get('VNPAY_CURRENCY') ?? booking.currencyCode,
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: `Thanh toan don ${booking.bookingRef}`,
      vnp_OrderType: 'other',
      vnp_Locale: options.locale ?? this.configService.get('VNPAY_LOCALE') ?? 'vn',
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: options.clientIp ?? '127.0.0.1',
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate,
    };

    const signData = this.buildSortedQuery(params, false);
    const signature = createHmac('sha512', hashSecret)
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');

    const redirectUrl = `${paymentUrl}?${this.buildSortedQuery(
      { ...params, vnp_SecureHash: signature },
      true,
    )}`;

    return {
      providerPaymentId: txnRef,
      redirectUrl,
      expiresAt: expireDate,
      metadata: { params },
    };
  }

  async verifyWebhook(payload: Record<string, unknown>): Promise<WebhookVerificationResult> {
    const query = payload as Record<string, string>;
    const hashSecret = this.configService.get('VNPAY_HASH_SECRET');

    if (!hashSecret) {
      return {
        valid: false,
        providerPaymentId: null,
        success: false,
        rawPayload: payload,
        gatewayResponse: { RspCode: '99', Message: 'Config error' },
      };
    }

    const secureHash = query.vnp_SecureHash;
    if (!secureHash) {
      return {
        valid: false,
        providerPaymentId: null,
        success: false,
        rawPayload: payload,
        gatewayResponse: { RspCode: '97', Message: 'Invalid signature' },
      };
    }

    const signedPayload = { ...query };
    delete signedPayload.vnp_SecureHash;
    delete signedPayload.vnp_SecureHashType;

    const signData = this.buildSortedQuery(signedPayload, false);
    const expectedHash = createHmac('sha512', hashSecret)
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');

    if (expectedHash !== secureHash) {
      return {
        valid: false,
        providerPaymentId: null,
        success: false,
        rawPayload: payload,
        gatewayResponse: { RspCode: '97', Message: 'Invalid signature' },
      };
    }

    const providerPaymentId = query.vnp_TxnRef ?? null;
    const amount = query.vnp_Amount ? Number(query.vnp_Amount) / 100 : undefined;
    const success =
      query.vnp_ResponseCode === '00' &&
      (query.vnp_TransactionStatus === '00' || !query.vnp_TransactionStatus);

    return {
      valid: true,
      providerPaymentId,
      success,
      amount,
      failureCode: success ? undefined : query.vnp_ResponseCode,
      failureMessage: success ? undefined : query.vnp_OrderInfo ?? 'VNPay payment failed',
      rawPayload: payload,
      gatewayResponse: { RspCode: '00', Message: 'Confirm Success' },
    };
  }

  // ─── Helpers ─────────────────────────────────────────────

  private formatDate(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = `${date.getMonth() + 1}`.padStart(2, '0');
    const dd = `${date.getDate()}`.padStart(2, '0');
    const hh = `${date.getHours()}`.padStart(2, '0');
    const min = `${date.getMinutes()}`.padStart(2, '0');
    const ss = `${date.getSeconds()}`.padStart(2, '0');
    return `${yyyy}${mm}${dd}${hh}${min}${ss}`;
  }

  private buildSortedQuery(params: Record<string, string>, uriEncode: boolean): string {
    const sortedKeys = Object.keys(params).sort();
    const pairs = sortedKeys.map((key) => {
      const encodedKey = encodeURIComponent(key);
      const encodedValue = uriEncode
        ? encodeURIComponent(params[key])
        : encodeURIComponent(params[key]).replace(/%20/g, '+');
      return `${encodedKey}=${encodedValue}`;
    });
    return pairs.join('&');
  }
}
