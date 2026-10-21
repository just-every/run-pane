import type { SearchSettings } from './model'

/** Search settings live in the immutable revision alongside the page content. */
export function normalizeSearch(input: SearchSettings): SearchSettings {
 if (!input || typeof input !== 'object') throw new Error('Invalid search settings.')
 const result: SearchSettings = {}
 for (const [field, limit] of [['title', 120], ['description', 500], ['canonical', 2048]] as const) {
  const value = input[field]
  if (value === undefined || value === '') continue
  if (typeof value !== 'string' || value.length > limit) throw new Error(`Invalid search ${field}.`)
  const normalized = value.normalize('NFC').trim()
  if (normalized) result[field] = normalized
 }
 if (result.canonical) {
  let url: URL
  try { url = new URL(result.canonical) } catch { throw new Error('Canonical URL must be an absolute HTTP or HTTPS URL.') }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.hash) throw new Error('Canonical URL must be HTTP or HTTPS, without credentials or a fragment.')
  result.canonical = url.href
 }
 if (input.noindex !== undefined) {
  if (typeof input.noindex !== 'boolean') throw new Error('Invalid indexing setting.')
  if (input.noindex) result.noindex = true
 }
 return result
}
export function normalizeRobots(value: unknown): string {
 if (typeof value !== 'string' || value.length > 10000 || /\0/.test(value)) throw new Error('Robots rules must be text up to 10,000 characters.')
 return value.replace(/\r\n/g, '\n')
}
export const sitePath = (slug: string) => slug === 'home' ? '/site' : `/site/${encodeURIComponent(slug)}`
