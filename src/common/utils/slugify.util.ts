// src/common/utils/slugify.util.ts

export function slugify(value: string): string {
  if (!value) {
    return '';
  }

  return value
    .toString()
    .normalize('NFD') // Separate accents from letters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ') // Better readability for business names
    .replace(/[^a-z0-9\s-]/g, '') // Remove invalid chars
    .replace(/\s+/g, '-') // Spaces -> hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-+|-+$/g, ''); // Trim hyphens from ends
}
