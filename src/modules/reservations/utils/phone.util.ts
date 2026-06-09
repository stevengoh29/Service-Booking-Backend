export function normalizePhone(phone: string): string {
  let normalized = phone.trim();
  if (normalized.startsWith('+')) {
    normalized = normalized.substring(1);
  }
  normalized = normalized.replace(/\D/g, '');
  if (normalized.startsWith('0')) {
    normalized = '62' + normalized.substring(1);
  }
  return normalized;
}
