import type { Page } from './model'

export type Redirect = { from: string; to: string; status: 301 | 302 }
export type RedirectOffer = { from: string; to: string; reason: 'renamed' | 'deleted' }

const unsafe = /[\u0000-\u001f\u007f-\u009f\\]/
const encodedUnsafe = /%(?:0[0-9a-f]|1[0-9a-f]|7f|5c)/i

function address(value: unknown, source: boolean): string {
 if (typeof value !== 'string' || unsafe.test(value)) throw Error('Redirect addresses must be text without control characters or backslashes.')
 const text = value.trim()
 if (!text || /\s/.test(text) || encodedUnsafe.test(text)) throw Error('Redirect addresses cannot contain spaces or encoded control characters.')
 const local = /^\/site(?:\/|$|[?#])/.test(text)
 if (source && (!local || /[?#]/.test(text))) throw Error('A redirect source must be an exact /site path without a query or fragment.')
 if (!local && (source || !/^https?:\/\//i.test(text))) throw Error('A redirect target must be a /site path or a full HTTP or HTTPS URL.')
 let url: URL
 try { url = new URL(text, 'https://redirect.invalid') } catch { throw Error('Invalid redirect address.') }
 if (local) {
  const path = text.split(/[?#]/, 1)[0]
  if (url.origin !== 'https://redirect.invalid' || url.pathname !== path) throw Error('Redirect paths cannot contain dot segments or malformed paths.')
 } else if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password || /^https?:\/\/[^/?#]*@/i.test(text)) {
  throw Error('Redirect targets must use HTTP or HTTPS without credentials.')
 }
 return local ? text : url.href
}

/** Validate and copy the revision's exact path map. The caller owns custom home routing. */
export function normalizeRedirects(value: unknown, pages?: Page[]): Redirect[] {
 if (value === undefined) return []
 if (!Array.isArray(value)) throw Error('Redirects must be a list.')
 const sources = new Map<string, Redirect>()
 const active = new Set(pages?.filter(page => !page.hidden).map(page => `/site/${encodeURIComponent(page.slug)}`))
 const redirects = value.map((item: unknown) => {
  if (!item || typeof item !== 'object' || Array.isArray(item)) throw Error('Each redirect needs a source, target and 301 or 302 status.')
  const raw = item as Record<string, unknown>
  const from = address(raw.from, true), to = address(raw.to, false)
  if (raw.status !== 301 && raw.status !== 302) throw Error('Choose 301 (permanent) or 302 (temporary) for each redirect.')
  if (sources.has(from)) throw Error(`Duplicate redirect source: ${from}.`)
  if (active.has(from)) throw Error(`Redirect source ${from} belongs to an active page.`)
  const redirect: Redirect = { from, to, status: raw.status }
  sources.set(from, redirect)
  return redirect
 })
 // Match by pathname even when a target carries a query or fragment: those
 // still request the same source. Iteration also supports large import maps.
 const finished = new Set<string>()
 for (const { from } of redirects) {
  const visiting = new Set<string>()
  let path: string | undefined = from
  while (path && sources.has(path) && !finished.has(path)) {
   if (visiting.has(path)) throw Error(`Redirect cycle at ${path}. Choose a different target.`)
   visiting.add(path)
   const to: string = sources.get(path)!.to
   path = to.startsWith('/') ? new URL(to, 'https://redirect.invalid').pathname : undefined
  }
  for (const visited of visiting) finished.add(visited)
 }
 return redirects
}

/** RFC-style quoted fields, escaped quotes, CRLF and a final unterminated row. */
function csvRows(text: string): string[][] {
 const rows: string[][] = []
 let row: string[] = [], field = '', quoted = false, closed = false
 const cell = () => { row.push(field); field = ''; closed = false }
 const line = () => { cell(); if (row.some(value => value.trim())) rows.push(row); row = [] }
 text = text.replace(/^\uFEFF/, '')
 for (let i = 0; i < text.length; i++) {
  const character = text[i]
  if (quoted) {
   if (character !== '"') field += character
   else if (text[i + 1] === '"') { field += '"'; i++ }
   else { quoted = false; closed = true }
  } else if (character === ',') cell()
  else if (character === '\r' || character === '\n') { line(); if (character === '\r' && text[i + 1] === '\n') i++ }
  else if (closed) { if (character !== ' ' && character !== '\t') throw Error('CSV has text after a closing quote.') }
  else if (character === '"') {
   if (field) throw Error('CSV quotes must surround the entire field.')
   quoted = true
  } else field += character
 }
 if (quoted) throw Error('CSV has an unclosed quoted field.')
 line()
 return rows
}

export function parseRedirectCsv(text: string): Redirect[] {
 if (typeof text !== 'string') throw Error('Redirect CSV must contain text.')
 const rows = csvRows(text)
 if (!rows.length) return []
 const header = rows.shift()!
 if (header.length !== 3 || header.some((value, index) => value.trim().toLowerCase() !== ['from', 'to', 'status'][index])) throw Error('Redirect CSV must start with the header from,to,status.')
 return normalizeRedirects(rows.map((row, index) => {
  if (row.length !== 3) throw Error(`Redirect CSV row ${index + 2} needs exactly three columns.`)
  const status = row[2].trim()
  if (status !== '301' && status !== '302') throw Error(`Redirect CSV row ${index + 2}: choose status 301 or 302.`)
  return { from: row[0], to: row[1], status: Number(status) }
 }))
}

export function redirectCsv(redirects: readonly Redirect[]): string {
 const quote = (value: string) => /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
 return ['from,to,status', ...redirects.map(row => [row.from, row.to, String(row.status)].map(quote).join(','))].join('\n')
}
