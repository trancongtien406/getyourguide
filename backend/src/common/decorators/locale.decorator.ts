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
    const request = ctx.switchToHttp().getRequest();
    const acceptLanguage: string | undefined = request.headers['accept-language'];
    const xCurrency: string | undefined = request.headers['x-currency'];

    // Parse Accept-Language: take the first language tag (e.g. "vi,en;q=0.9" → "vi")
    let language: string | null = null;
    if (acceptLanguage) {
      const primary = acceptLanguage.split(',')[0]?.trim().split(';')[0]?.trim();
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
