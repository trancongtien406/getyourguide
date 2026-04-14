const DEFAULT_SITE_URL = 'https://www.getyourguide.com';
const DEFAULT_LOCAL_API_URL = 'http://localhost:3000';

function normalizeUrl(value: string | undefined, fallback: string): string {
  if (!value) return fallback;

  try {
    const url = new URL(value);
    return url.toString().replace(/\/$/, '');
  } catch {
    return fallback;
  }
}

export const SITE_NAME = 'GetYourGuide';
export const SITE_URL = normalizeUrl(process.env.NEXT_PUBLIC_APP_URL, DEFAULT_SITE_URL);

const defaultApiFallback =
  process.env.NODE_ENV === 'development' ? DEFAULT_LOCAL_API_URL : SITE_URL;

export const API_URL = normalizeUrl(process.env.NEXT_PUBLIC_API_URL, defaultApiFallback);
