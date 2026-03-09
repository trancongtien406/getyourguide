import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Converts monetary amounts between currencies using the latest exchange rate
 * stored in the `exchange_rates` table.
 *
 * Strategy:
 *  1. Try direct rate  base→target
 *  2. Try inverse rate  target→base  (1/rate)
 *  3. Try triangulation via USD  base→USD then USD→target
 *  4. Return original amount if no rate found
 */
@Injectable()
export class CurrencyConverterService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the latest exchange rate between two currencies.
   * Returns `null` if no rate found.
   */
  private async getRate(base: string, quote: string): Promise<number | null> {
    const row = await this.prisma.exchangeRate.findFirst({
      where: { baseCurrency: base, quoteCurrency: quote },
      orderBy: { effectiveAt: 'desc' },
    });
    return row ? Number(row.rate) : null;
  }

  /**
   * Convert a single amount from `fromCurrency` to `toCurrency`.
   * Returns `{ amount, currencyCode }`.
   */
  async convert(
    amount: number | Prisma.Decimal,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<{ amount: number; currencyCode: string }> {
    const numericAmount = typeof amount === 'number' ? amount : Number(amount);
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    if (from === to) {
      return { amount: numericAmount, currencyCode: to };
    }

    // Direct rate
    let rate = await this.getRate(from, to);
    if (rate !== null) {
      return { amount: round(numericAmount * rate, to), currencyCode: to };
    }

    // Inverse rate
    rate = await this.getRate(to, from);
    if (rate !== null && rate !== 0) {
      return { amount: round(numericAmount / rate, to), currencyCode: to };
    }

    // Triangulation via USD
    if (from !== 'USD' && to !== 'USD') {
      const toUsd = await this.getRate(from, 'USD') ?? (await this.getRate('USD', from).then(r => r ? 1 / r : null));
      const fromUsd = await this.getRate('USD', to) ?? (await this.getRate(to, 'USD').then(r => r ? 1 / r : null));
      if (toUsd !== null && fromUsd !== null) {
        return { amount: round(numericAmount * toUsd * fromUsd, to), currencyCode: to };
      }
    }

    // Fall back: return original
    return { amount: numericAmount, currencyCode: from };
  }

  /**
   * Convert a batch of pricing rules (each has `amount` + `currencyCode`).
   * Mutates and returns the same array for convenience.
   */
  async convertPricingRules<T extends { amount: Prisma.Decimal | number; currencyCode: string }>(
    rules: T[],
    targetCurrency: string,
  ): Promise<T[]> {
    if (!targetCurrency || rules.length === 0) return rules;

    for (const rule of rules) {
      const { amount, currencyCode } = await this.convert(
        rule.amount,
        rule.currencyCode,
        targetCurrency,
      );
      (rule as any).amount = amount;
      (rule as any).currencyCode = currencyCode;
    }
    return rules;
  }
}

function round(value: number, currency: string): number {
  // VND, JPY, KRW etc. have 0 decimals
  const zeroDec = ['VND', 'JPY', 'KRW', 'CLP', 'ISK', 'UGX'];
  const decimals = zeroDec.includes(currency.toUpperCase()) ? 0 : 2;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
