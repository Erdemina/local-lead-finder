import crypto from 'crypto'

const TR_CHAR_MAP: Record<string, string> = {
  ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', I: 'i', İ: 'i',
  ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u',
}

export function slugify(input: string): string {
  const ascii = input
    .split('')
    .map((ch) => TR_CHAR_MAP[ch] ?? ch)
    .join('')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
  const slug = ascii
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return slug || 'kayit'
}

export function randomSuffix(length = 4): string {
  return crypto
    .randomBytes(8)
    .toString('base64url')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
    .slice(0, length)
}

export function uniqueSlug(name: string): string {
  return `${slugify(name)}-${randomSuffix()}`
}
