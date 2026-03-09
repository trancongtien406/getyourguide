import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes } from 'crypto';
import type {
    PayableBooking,
    PaymentGateway,
    PaymentInitiationResult,
    WebhookVerificationResult,
} from './payment-gateway.interface';

@Injectable()
export class MomoGateway implements PaymentGateway {
  readonly gatewayKey = 'momo';

  constructor(private readonly configService: ConfigService) {}

  async initiatePayment(
    booking: PayableBooking,
    options: { returnUrl?: string; locale?: string },
  ): Promise<PaymentInitiationResult> {
    const endpoint =
      this.configService.get('MOMO_ENDPOINT') ?? 'https://test-payment.momo.vn/v2/gateway/api/create';
    const partnerCode = this.configService.get('MOMO_PARTNER_CODE');
    const accessKey = this.configService.get('MOMO_ACCESS_KEY');
    const secretKey = this.configService.get('MOMO_SECRET_KEY');
    const redirectUrl = options.returnUrl ?? this.configService.get('MOMO_REDIRECT_URL');
    const ipnUrl = this.configService.get('MOMO_IPN_URL');
    const requestType = this.configService.get('MOMO_REQUEST_TYPE') ?? 'captureWallet';

    if (!partnerCode || !accessKey || !secretKey || !redirectUrl || !ipnUrl) {
      throw new InternalServerErrorException('MoMo configuration is missing');
    }

    const amount = Math.round(booking.totalAmount.toNumber());
    const requestId = `MOMO-${Date.now()}-${randomBytes(3).toString('hex')}`;
    const orderId = `MM-${booking.bookingRef}-${Date.now().toString(36).toUpperCase()}`;
    const orderInfo = `Thanh toan don ${booking.bookingRef}`;
    const extraData = '';

    const rawSignature =
      `accessKey=${accessKey}` +
      `&amount=${amount}` +
      `&extraData=${extraData}` +
      `&ipnUrl=${ipnUrl}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&partnerCode=${partnerCode}` +
      `&redirectUrl=${redirectUrl}` +
      `&requestId=${requestId}` +
      `&requestType=${requestType}`;

    const signature = createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

    const payload = {
      partnerCode,
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      lang: options.locale ?? 'vi',
      requestType,
      autoCapture: true,
      extraData,
      signature,
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const momoResult = (await response.json()) as {
      resultCode?: number;
      message?: string;
      payUrl?: string;
      deeplink?: string;
      qrCodeUrl?: string;
      transId?: number;
      requestId?: string;
    };

    if (!response.ok || momoResult.resultCode !== 0 || !momoResult.payUrl) {
      throw new BadRequestException(
        `MoMo create payment failed: ${momoResult.message ?? 'unknown error'}`,
      );
    }

    return {
      providerPaymentId: orderId,
      payUrl: momoResult.payUrl,
      deeplink: momoResult.deeplink,
      qrCodeUrl: momoResult.qrCodeUrl,
      metadata: { requestId, requestType, response: momoResult },
    };
  }

  async verifyWebhook(payload: Record<string, unknown>): Promise<WebhookVerificationResult> {
    const accessKey = this.configService.get('MOMO_ACCESS_KEY');
    const secretKey = this.configService.get('MOMO_SECRET_KEY');

    if (!accessKey || !secretKey) {
      return {
        valid: false,
        providerPaymentId: null,
        success: false,
        rawPayload: payload,
        gatewayResponse: { resultCode: 99, message: 'Config error' },
      };
    }

    const providedSignature = this.str(payload, 'signature');
    if (!providedSignature) {
      return {
        valid: false,
        providerPaymentId: null,
        success: false,
        rawPayload: payload,
        gatewayResponse: { resultCode: 98, message: 'Invalid signature' },
      };
    }

    const rawSignature =
      `accessKey=${accessKey}` +
      `&amount=${this.str(payload, 'amount')}` +
      `&extraData=${this.str(payload, 'extraData')}` +
      `&message=${this.str(payload, 'message')}` +
      `&orderId=${this.str(payload, 'orderId')}` +
      `&orderInfo=${this.str(payload, 'orderInfo')}` +
      `&orderType=${this.str(payload, 'orderType')}` +
      `&partnerCode=${this.str(payload, 'partnerCode')}` +
      `&payType=${this.str(payload, 'payType')}` +
      `&requestId=${this.str(payload, 'requestId')}` +
      `&responseTime=${this.str(payload, 'responseTime')}` +
      `&resultCode=${this.str(payload, 'resultCode')}` +
      `&transId=${this.str(payload, 'transId')}`;

    const expectedSignature = createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

    if (expectedSignature !== providedSignature) {
      return {
        valid: false,
        providerPaymentId: null,
        success: false,
        rawPayload: payload,
        gatewayResponse: { resultCode: 98, message: 'Invalid signature' },
      };
    }

    const providerPaymentId = this.str(payload, 'orderId') || null;
    const resultCode = Number(this.str(payload, 'resultCode'));
    const success = resultCode === 0;
    const receivedAmount = Number(this.str(payload, 'amount'));
    const amount = Number.isNaN(receivedAmount) ? undefined : receivedAmount;

    return {
      valid: true,
      providerPaymentId,
      success,
      amount,
      failureCode: success ? undefined : String(resultCode),
      failureMessage: success ? undefined : this.str(payload, 'message') || 'MoMo payment failed',
      rawPayload: payload,
      gatewayResponse: { resultCode: 0, message: 'success' },
    };
  }

  private str(payload: Record<string, unknown>, key: string): string {
    const value = payload[key];
    if (value === null || value === undefined) return '';
    return String(value);
  }
}
