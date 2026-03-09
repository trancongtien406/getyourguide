import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, PaymentStatus, Prisma, UserRole } from '@prisma/client';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentOptionsQueryDto } from './dto/payment-options-query.dto';
import { UpdatePaymentSettingsDto } from './dto/update-payment-settings.dto';
import { PAYMENT_GATEWAYS, type PaymentGateway } from './gateways';

export interface GatewayConfig {
  enabled: boolean;
  displayName: string;
  domesticOnly: boolean;
  countries: string[];
  currencies: string[];
  channels: string[];
}

export interface PaymentSettings {
  mode: 'sandbox' | 'live';
  gateways: Record<string, GatewayConfig>;
}

@Injectable()
export class PaymentsService {
  private readonly settingKey = 'payments.gateways';
  private readonly gatewayMap = new Map<string, PaymentGateway>();

  private readonly defaultSettings: PaymentSettings = {
    mode: 'sandbox',
    gateways: {
      vnpay: {
        enabled: true,
        displayName: 'VNPay',
        domesticOnly: true,
        countries: ['VN'],
        currencies: ['VND'],
        channels: ['atm', 'napas_card', 'qr'],
      },
      momo: {
        enabled: true,
        displayName: 'MoMo',
        domesticOnly: true,
        countries: ['VN'],
        currencies: ['VND'],
        channels: ['wallet', 'qr'],
      },
      stripe: {
        enabled: false,
        displayName: 'Stripe',
        domesticOnly: false,
        countries: ['*'],
        currencies: ['USD', 'EUR', 'GBP', 'SGD', 'VND'],
        channels: ['card', 'apple_pay', 'google_pay'],
      },
      paypal: {
        enabled: false,
        displayName: 'PayPal',
        domesticOnly: false,
        countries: ['*'],
        currencies: ['USD', 'EUR', 'GBP'],
        channels: ['paypal_balance', 'card'],
      },
    },
  };

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_GATEWAYS) gateways: PaymentGateway[],
  ) {
    for (const gw of gateways) {
      this.gatewayMap.set(gw.gatewayKey, gw);
    }
  }

  // ── Public: Create Payment ──────────────────────────────

  async initiatePayment(
    gatewayKey: string,
    actor: JwtPayload,
    dto: InitiatePaymentDto,
    extra?: { clientIp?: string },
  ) {
    await this.assertGatewayEnabled(gatewayKey);

    const gateway = this.getGateway(gatewayKey);
    const booking = await this.getPayableBooking(actor, dto.bookingId);

    const result = await gateway.initiatePayment(
      {
        id: booking.id,
        bookingRef: booking.bookingRef,
        totalAmount: booking.totalAmount,
        currencyCode: booking.currencyCode,
      },
      {
        returnUrl: dto.returnUrl,
        locale: dto.locale,
        clientIp: extra?.clientIp,
      },
    );

    const payment = await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.PENDING_PAYMENT },
      });

      const created = await tx.payment.create({
        data: {
          bookingId: booking.id,
          provider: gatewayKey,
          providerPaymentId: result.providerPaymentId,
          status: PaymentStatus.CREATED,
          currencyCode: booking.currencyCode,
          amount: booking.totalAmount,
          metadata: result.metadata as unknown as Prisma.JsonObject,
        },
      });

      await tx.bookingEvent.create({
        data: {
          bookingId: booking.id,
          eventType: 'PAYMENT_CREATED',
          payload: {
            provider: gatewayKey,
            providerPaymentId: result.providerPaymentId,
          },
          createdBy: actor.sub,
        },
      });

      return created;
    });

    return {
      provider: gatewayKey,
      bookingId: booking.id,
      paymentId: payment.id,
      providerPaymentId: result.providerPaymentId,
      redirectUrl: result.redirectUrl,
      payUrl: result.payUrl,
      deeplink: result.deeplink,
      qrCodeUrl: result.qrCodeUrl,
      expiresAt: result.expiresAt,
    };
  }

  // ── Public: Handle Webhook ──────────────────────────────

  async handleWebhook(gatewayKey: string, payload: Record<string, unknown>) {
    const gateway = this.getGateway(gatewayKey);
    const result = await gateway.verifyWebhook(payload);

    if (!result.valid || !result.providerPaymentId) {
      return result.gatewayResponse;
    }

    const payment = await this.prisma.payment.findFirst({
      where: { provider: gatewayKey, providerPaymentId: result.providerPaymentId },
    });

    if (!payment) {
      return result.gatewayResponse;
    }

    if (payment.status === PaymentStatus.CAPTURED) {
      return result.gatewayResponse;
    }

    // Validate amount if provided
    if (result.amount !== undefined) {
      const expectedAmount = payment.amount.toNumber();
      // VNPay returns amount in cents (already divided in gateway), MoMo returns raw
      if (expectedAmount !== result.amount) {
        return result.gatewayResponse;
      }
    }

    await this.saveWebhookEvent(
      gatewayKey,
      result.providerPaymentId,
      'ipn',
      result.rawPayload,
    );

    if (result.success) {
      await this.finalizeCapturedPayment(payment.id, result.rawPayload);
    } else {
      await this.finalizeFailedPayment(
        payment.id,
        result.failureCode ?? 'PAYMENT_FAILED',
        result.failureMessage ?? 'Payment failed',
        result.rawPayload,
      );
    }

    return result.gatewayResponse;
  }

  // ── Legacy convenience methods (keep controller backward-compatible) ──

  async initiateVnpayPayment(actor: JwtPayload, dto: InitiatePaymentDto, clientIp: string) {
    return this.initiatePayment('vnpay', actor, dto, { clientIp });
  }

  async initiateMomoPayment(actor: JwtPayload, dto: InitiatePaymentDto) {
    return this.initiatePayment('momo', actor, dto);
  }

  async handleVnpayIpn(query: Record<string, string>) {
    return this.handleWebhook('vnpay', query);
  }

  async handleMomoIpn(payload: Record<string, unknown>) {
    return this.handleWebhook('momo', payload);
  }

  // ── Settings / Options ──────────────────────────────────

  async getPaymentOptions(query: PaymentOptionsQueryDto) {
    const settings = await this.getMergedSettings();
    const countryCode = query.countryCode?.toUpperCase();
    const currencyCode = query.currencyCode?.toUpperCase();

    const available = Object.entries(settings.gateways)
      .filter(([, cfg]) => cfg.enabled)
      .filter(([, cfg]) => {
        if (!countryCode) return true;
        return cfg.countries.includes('*') || cfg.countries.includes(countryCode);
      })
      .filter(([, cfg]) => {
        if (!currencyCode) return true;
        return cfg.currencies.includes('*') || cfg.currencies.includes(currencyCode);
      })
      .map(([key, cfg]) => ({
        key,
        displayName: cfg.displayName,
        channels: cfg.channels,
        domesticOnly: cfg.domesticOnly,
      }));

    return {
      mode: settings.mode,
      countryCode,
      currencyCode,
      methods: available,
    };
  }

  async getAdminSettings() {
    return this.getMergedSettings();
  }

  async updateAdminSettings(dto: UpdatePaymentSettingsDto) {
    const normalized = this.normalizeSettings(dto);

    await this.prisma.systemSetting.upsert({
      where: { settingKey: this.settingKey },
      update: {
        settingValue: normalized as unknown as Prisma.JsonObject,
      },
      create: {
        settingKey: this.settingKey,
        settingValue: normalized as unknown as Prisma.JsonObject,
        valueType: 'json',
        isPublic: false,
        description: 'Payment gateway availability and mode',
      },
    });

    return normalized;
  }

  // ── Private Helpers ─────────────────────────────────────

  private getGateway(gatewayKey: string): PaymentGateway {
    const gw = this.gatewayMap.get(gatewayKey);
    if (!gw) {
      throw new BadRequestException(`Payment gateway '${gatewayKey}' is not available`);
    }
    return gw;
  }

  private async getMergedSettings(): Promise<PaymentSettings> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { settingKey: this.settingKey },
    });

    if (!setting || !setting.settingValue) {
      return this.defaultSettings;
    }

    const raw = setting.settingValue as Partial<PaymentSettings>;

    const merged: PaymentSettings = {
      mode: raw.mode === 'live' ? 'live' : 'sandbox',
      gateways: { ...this.defaultSettings.gateways },
    };

    if (raw.gateways) {
      for (const [key, value] of Object.entries(raw.gateways)) {
        const current = merged.gateways[key];
        if (!current) continue;

        const next = value as Partial<GatewayConfig>;
        merged.gateways[key] = {
          enabled: next.enabled ?? current.enabled,
          displayName: next.displayName ?? current.displayName,
          domesticOnly: next.domesticOnly ?? current.domesticOnly,
          countries: (next.countries ?? current.countries).map((c) => c.toUpperCase()),
          currencies: (next.currencies ?? current.currencies).map((c) => c.toUpperCase()),
          channels: next.channels ?? current.channels,
        };
      }
    }

    return merged;
  }

  private async assertGatewayEnabled(gatewayKey: string) {
    const settings = await this.getMergedSettings();
    const config = settings.gateways[gatewayKey];
    if (!config?.enabled) {
      throw new BadRequestException(`${gatewayKey} is not enabled`);
    }
  }

  private async getPayableBooking(actor: JwtPayload, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    this.ensureCanPay(actor, booking.userId);

    if (
      booking.status !== BookingStatus.PENDING_PAYMENT &&
      booking.status !== BookingStatus.INITIATED
    ) {
      throw new BadRequestException('Booking is not payable');
    }

    return booking;
  }

  private ensureCanPay(actor: JwtPayload, bookingUserId: string | null) {
    if (bookingUserId === actor.sub) return;

    const actorRoles = new Set(actor.roles);
    if (actorRoles.has(UserRole.ADMIN) || actorRoles.has(UserRole.OPERATOR)) return;

    throw new ForbiddenException('Insufficient permissions');
  }

  private async saveWebhookEvent(
    provider: string,
    providerEventId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ) {
    try {
      await this.prisma.paymentWebhookEvent.create({
        data: {
          provider,
          providerEventId,
          eventType,
          payload: payload as Prisma.JsonObject,
          status: 'RECEIVED',
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return;
      }
      throw error;
    }
  }

  private async finalizeCapturedPayment(paymentId: string, providerPayload: Record<string, unknown>) {
    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!payment || payment.status === PaymentStatus.CAPTURED) return;

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.CAPTURED,
          capturedAmount: payment.amount,
          capturedAt: new Date(),
          failureCode: null,
          failureMessage: null,
          failedAt: null,
          metadata: ({ callback: providerPayload } as unknown) as Prisma.JsonObject,
        },
      });

      await tx.booking.update({
        where: { id: payment.bookingId },
        data: {
          status: BookingStatus.CONFIRMED,
          confirmedAt: new Date(),
        },
      });

      await tx.bookingEvent.create({
        data: {
          bookingId: payment.bookingId,
          eventType: 'PAYMENT_CAPTURED',
          payload: providerPayload as Prisma.JsonObject,
        },
      });

      await tx.outboxEvent.create({
        data: {
          aggregateType: 'booking',
          aggregateId: payment.bookingId,
          eventType: 'PAYMENT_CAPTURED',
          payload: providerPayload as Prisma.JsonObject,
        },
      });
    });
  }

  private async finalizeFailedPayment(
    paymentId: string,
    failureCode: string,
    failureMessage: string,
    providerPayload: Record<string, unknown>,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!payment || payment.status === PaymentStatus.CAPTURED) return;

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failureCode,
          failureMessage,
          failedAt: new Date(),
          metadata: ({ callback: providerPayload } as unknown) as Prisma.JsonObject,
        },
      });

      const booking = await tx.booking.findUnique({ where: { id: payment.bookingId } });
      if (
        booking &&
        (booking.status === BookingStatus.PENDING_PAYMENT ||
          booking.status === BookingStatus.INITIATED)
      ) {
        await this.releaseInventory(tx, booking.id);
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: BookingStatus.FAILED },
        });
      }

      await tx.bookingEvent.create({
        data: {
          bookingId: payment.bookingId,
          eventType: 'PAYMENT_FAILED',
          payload: ({
            failureCode,
            failureMessage,
            callback: providerPayload,
          } as unknown) as Prisma.JsonObject,
        },
      });

      await tx.outboxEvent.create({
        data: {
          aggregateType: 'booking',
          aggregateId: payment.bookingId,
          eventType: 'PAYMENT_FAILED',
          payload: ({
            failureCode,
            failureMessage,
            callback: providerPayload,
          } as unknown) as Prisma.JsonObject,
        },
      });
    });
  }

  private async releaseInventory(tx: Prisma.TransactionClient, bookingId: string) {
    const items = await tx.bookingItem.findMany({ where: { bookingId } });
    for (const item of items) {
      if (!item.inventorySlotId) continue;

      await tx.inventorySlot.update({
        where: { id: item.inventorySlotId },
        data: {
          bookedCapacity: { decrement: item.quantity },
        },
      });
    }
  }

  private normalizeSettings(input: UpdatePaymentSettingsDto): PaymentSettings {
    const base = this.defaultSettings;

    const gateways: Record<string, GatewayConfig> = {};
    for (const [key, current] of Object.entries(base.gateways)) {
      const incoming = input.gateways[key] as Partial<GatewayConfig> | undefined;

      gateways[key] = {
        enabled: incoming?.enabled ?? current.enabled,
        displayName: incoming?.displayName ?? current.displayName,
        domesticOnly: incoming?.domesticOnly ?? current.domesticOnly,
        countries: (incoming?.countries ?? current.countries).map((item) =>
          item.toUpperCase(),
        ),
        currencies: (incoming?.currencies ?? current.currencies).map((item) =>
          item.toUpperCase(),
        ),
        channels: incoming?.channels ?? current.channels,
      };
    }

    return { mode: input.mode, gateways };
  }
}
