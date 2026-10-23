import { escape } from './ui/kit'

/** Vane is the owner's own cookie-free installation; GA4 is Google's tag and waits for the visitor's choice. */
export type Analytics = { vane?: { origin: string; site: string }; ga4?: string }

const siteId = /^[A-Za-z0-9_-]{1,64}$/
const measurementId = /^G-[A-Z0-9]{4,12}$/

export function normalizeAnalytics(value: unknown): Analytics | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'object' || Array.isArray(value)) throw Error('Connect Vane by address and site ID, or Google Analytics 4 by measurement ID.')
  const input = value as Record<string, unknown>, result: Analytics = {}
  if (input.vane !== undefined) {
    const vane = input.vane as Record<string, unknown> | null
    if (!vane || typeof vane !== 'object' || typeof vane.origin !== 'string' || typeof vane.site !== 'string') throw Error('Enter both the Vane address and the Vane site ID.')
    let url: URL
    try { url = new URL(vane.origin.trim()) } catch { throw Error('Enter the Vane address as an HTTPS web address, such as https://vane.example.com.') }
    const host = url.hostname
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash || !['/', '/vane.js'].includes(url.pathname) || !host.includes('.') || /^\[|^[\d.]+$/.test(host) || host === 'localhost' || host.endsWith('.localhost')) throw Error('Enter the Vane address as an HTTPS web address, such as https://vane.example.com.')
    if (!siteId.test(vane.site.trim())) throw Error('The Vane site ID uses letters, numbers, hyphens and underscores (up to 64).')
    result.vane = {origin: url.origin, site: vane.site.trim()}
  }
  if (input.ga4 !== undefined) {
    const id = typeof input.ga4 === 'string' ? input.ga4.trim().toUpperCase() : ''
    if (!measurementId.test(id)) throw Error('Enter a Google Analytics 4 measurement ID such as G-ABC123XYZ4.')
    result.ga4 = id
  }
  return result.vane || result.ga4 ? result : undefined
}

/** Blank fields remove a connection; untouched forms keep the saved one. */
export function analyticsFromForm(input: Record<string, unknown>, saved?: Analytics): unknown {
  const text = (name: string) => typeof input[name] === 'string' ? String(input[name]).trim() : undefined
  const url = text('analytics.vane.url'), site = text('analytics.vane.site'), ga4 = text('analytics.ga4')
  if (url === undefined && site === undefined && ga4 === undefined) return saved
  return {
    ...((url || site) ? {vane: {origin: url ?? '', site: site ?? ''}} : {}),
    ...(ga4 ? {ga4} : {}),
  }
}

const googleScripts = ['https://www.googletagmanager.com']
const googleConnections = ['https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://*.googletagmanager.com']
const googleImages = ['https://*.google-analytics.com', 'https://*.googletagmanager.com']

/** Extra content-security-policy sources for a published page that loads these tags. */
export function analyticsSources(analytics?: Analytics) {
  const vane = analytics?.vane ? [analytics.vane.origin] : []
  return {
    script: [...vane, ...(analytics?.ga4 ? googleScripts : [])],
    connect: [...vane, ...(analytics?.ga4 ? googleConnections : [])],
    image: analytics?.ga4 ? googleImages : [],
  }
}

/**
 * Markup for a published page. Nothing renders for visitors who send Global
 * Privacy Control or Do Not Track, and the GA4 banner starts hidden: the loader
 * script shows it and loads Google's tag only after the visitor allows it.
 */
export function analyticsMarkup(analytics: Analytics | undefined, quiet: boolean): string {
  if (!analytics || quiet) return ''
  const vane = analytics.vane ? `<script defer src="${escape(analytics.vane.origin)}/vane.js" data-site="${escape(analytics.vane.site)}"></script>` : ''
  const banner = analytics.ga4 ? `<section class="analytics-consent" data-analytics-consent aria-label="Analytics choices" hidden><p data-analytics-status role="status">This website would like to use Google Analytics to count visits and goals. Google may set cookies and receive your IP address. Nothing loads until you choose.</p><div class="form-actions"><button type="button" data-analytics-allow>Allow analytics</button><button type="button" class="secondary" data-analytics-deny>No thanks</button></div></section>` : ''
  return `${banner}${vane}<script src="/pane-analytics.js"${analytics.ga4 ? ` data-ga4="${escape(analytics.ga4)}"` : ''} defer></script>`
}
