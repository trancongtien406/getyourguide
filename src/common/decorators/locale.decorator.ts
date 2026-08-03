import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extract locale info from request headers.
 *
 * Usage:
 *   @Locale() locale: RequestLocale
 *
 * Frontend sends:
 *   Accept-Language: vi | en | …
 *   X-Currency: VND | USD | EUR | …
 */
export interface RequestLocale {
  language: string | null;
  currency: string | null;
}

export const Locale = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestLocale => {
    const rawRequest: unknown = ctx.switchToHttp().getRequest();
    const rawHeaders =
      rawRequest &&
      typeof rawRequest === 'object' &&
      'headers' in rawRequest &&
      (rawRequest as { headers?: unknown }).headers &&
      typeof (rawRequest as { headers?: unknown }).headers === 'object'
        ? (rawRequest as { headers: Record<string, unknown> }).headers
        : {};

    const acceptLanguage = toSingleHeaderValue(rawHeaders['accept-language']);
    const xCurrency = toSingleHeaderValue(rawHeaders['x-currency']);

    // Parse Accept-Language: take the first language tag (e.g. "vi,en;q=0.9" → "vi")
    let language: string | null = null;
    if (acceptLanguage) {
      const primary = acceptLanguage
        .split(',')[0]
        ?.trim()
        .split(';')[0]
        ?.trim();
      if (primary && primary !== '*') {
        language = primary.toLowerCase();
      }
    }

    return {
      language,
      currency: xCurrency?.toUpperCase() || null,
    };
  },
);

function toSingleHeaderValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    const values = value as unknown[];
    const first = values[0];
    if (typeof first === 'string') {
      return first;
    }
  }

  return undefined;
}
