export { MomoGateway } from './momo.gateway';
export type {
  PayableBooking,
  PaymentGateway,
  PaymentInitiationResult,
  WebhookVerificationResult,
} from './payment-gateway.interface';
export { VnpayGateway } from './vnpay.gateway';

/** Injection token for the array of PaymentGateway implementations */
export const PAYMENT_GATEWAYS = 'PAYMENT_GATEWAYS';
