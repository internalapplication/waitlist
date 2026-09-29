import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Shared limits (used by both the browser and the API). */
export const MIN_DESCRIPTION_LENGTH = 10
export const MAX_DESCRIPTION_LENGTH = 1000
export const PRICE_LABEL = '$0.99'
/** Total generations included in the one-time payment (first page + regenerations). */
export const MAX_GENERATIONS = 5

/** Lowercase, dash-separated, filesystem-safe slug. */
export function slugify(value: string, fallback = 'product'): string {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/g, '')
  return slug || fallback
}
