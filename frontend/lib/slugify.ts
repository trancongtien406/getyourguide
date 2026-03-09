import slugify from 'slugify';

/**
 * Generate a URL-friendly slug from a string
 * Supports Vietnamese characters and other diacritics
 */
export function generateSlug(text: string): string {
  return slugify(text, {
    lower: true,
    strict: true,
    locale: 'vi',
    trim: true,
  });
}
