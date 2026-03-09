import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

const DEFAULT_LOCALE = 'vi';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = cookieStore.get('locale')?.value || DEFAULT_LOCALE;

  let messages;
  try {
    messages = (await import(`../messages/${locale}.json`)).default;
  } catch {
    // Locale messages file not found — fall back to default
    messages = (await import(`../messages/${DEFAULT_LOCALE}.json`)).default;
  }

  return {
    locale,
    messages,
  };
});
