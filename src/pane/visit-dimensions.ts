import { parse } from 'tldts'

export type VisitSource = 'Direct' | 'Search' | 'AI assistants' | 'Social' | 'Local and review' | 'Email' | 'Other website' | 'Unknown'
export type VisitDevice = 'phone' | 'tablet' | 'desktop' | 'unknown'
export type VisitDimensions = {
  source: VisitSource
  referrer: string
  medium: string
  campaignSource: string
  device: VisitDevice
  country: string
  region: string
  campaign: string
}

const sources: readonly [string, VisitSource, readonly string[]][] = [
  ['Google', 'Search', ['google.com', 'google.co.uk', 'google.com.au', 'google.ca', 'google.de', 'google.fr']],
  ['Bing', 'Search', ['bing.com']], ['DuckDuckGo', 'Search', ['duckduckgo.com']],
  ['Yahoo', 'Search', ['yahoo.com']], ['Baidu', 'Search', ['baidu.com']], ['Yandex', 'Search', ['yandex.com', 'yandex.ru']],
  ['ChatGPT', 'AI assistants', ['chatgpt.com', 'chat.openai.com', 'openai.com']],
  ['Perplexity', 'AI assistants', ['perplexity.ai']], ['Claude', 'AI assistants', ['claude.ai']],
  ['Gemini', 'AI assistants', ['gemini.google.com']], ['Copilot', 'AI assistants', ['copilot.microsoft.com']],
  ['Facebook', 'Social', ['facebook.com', 'fb.com']], ['Instagram', 'Social', ['instagram.com']],
  ['LinkedIn', 'Social', ['linkedin.com']], ['X', 'Social', ['x.com', 'twitter.com']],
  ['TikTok', 'Social', ['tiktok.com']], ['Pinterest', 'Social', ['pinterest.com']],
  ['Reddit', 'Social', ['reddit.com']], ['YouTube', 'Social', ['youtube.com', 'youtu.be']],
  ['Yelp', 'Local and review', ['yelp.com']], ['Nextdoor', 'Local and review', ['nextdoor.com']],
  ['Tripadvisor', 'Local and review', ['tripadvisor.com']], ['Trustpilot', 'Local and review', ['trustpilot.com']],
  ['Google Maps', 'Local and review', ['maps.google.com']],
  ['Gmail', 'Email', ['mail.google.com', 'gmail.com']],
  ['Outlook', 'Email', ['outlook.live.com', 'outlook.office.com', 'outlook.com']],
  ['Yahoo Mail', 'Email', ['mail.yahoo.com']],
]

// The tracker receives only this public list and the published approved labels.
export const knownVisitSources = Object.fromEntries(sources.flatMap(([label, , hosts]) => [label, ...hosts].map(alias => [alias.toLowerCase(), label])))
export const visitMediums: Readonly<Record<string, string>> = {
  email: 'email', social: 'social', 'paid search': 'paid search', paid_search: 'paid search', paidsearch: 'paid search', cpc: 'paid search', ppc: 'paid search',
  display: 'display', referral: 'referral', affiliate: 'affiliate', other: 'other',
}

function referrer(value: unknown): {host: string; domain: string} | null {
  if (typeof value !== 'string' || value.length > 4096) return null
  try {
    const url = new URL(value.includes('://') ? value : `https://${value}`)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    const host = url.hostname.toLowerCase().replace(/\.$/, '')
    // Include the PSL's private suffixes: a tenant is not its hosting provider.
    const result = parse(host, {allowPrivateDomains: true})
    if (result.isIp || !result.domain || !(result.isIcann || result.isPrivate)
      || /(?:^|\.)(?:localhost|local|internal|intranet|lan|home|arpa)$/.test(host)) return null
    return {host, domain: result.domain}
  } catch { return null }
}

function sourceFor(host: string): VisitSource {
  // Match the most specific known host before its registrable parent (mail/maps).
  const match = sources.flatMap(([, channel, hosts]) => hosts.map(domain => ({channel, domain})))
    .filter(({domain}) => host === domain || host.endsWith(`.${domain}`))
    .sort((a, b) => b.domain.length - a.domain.length)[0]
  return match?.channel ?? 'Other website'
}

function approvedLabel(value: unknown, approved: readonly string[]): string {
  if (typeof value !== 'string' || value.length > 80) return ''
  return approved.find(label => label.toLowerCase() === value.normalize('NFC').toLowerCase()) ?? ''
}

function visitDevice(request: Request): VisitDevice {
  const agent = request.headers.get('User-Agent') ?? ''
  if (/bot|crawler|spider/i.test(agent)) return 'unknown'
  if (/ipad|tablet|kindle|silk|playbook/i.test(agent) || (/android/i.test(agent) && !/mobile/i.test(agent))) return 'tablet'
  if (/iphone|ipod|windows phone|mobile/i.test(agent)) return 'phone'
  if (/windows nt|macintosh|x11|cros/i.test(agent)) return 'desktop'
  return 'unknown'
}

function twoLetters(value: unknown): string {
  return typeof value === 'string' && /^[a-z]{2}$/i.test(value) ? value.toUpperCase() : ''
}

export function normalizeCampaigns(value: unknown): string[] {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.length > 32) throw new Error('Use up to 32 approved business campaign names.')
  const campaigns = value.map(item => {
    if (typeof item !== 'string' || /[\u0000-\u001f\u007f-\u009f]/.test(item)) throw new Error('Campaign names must be human-readable business labels without personal data.')
    const label = item.trim().normalize('NFC')
    // Narrow owner-authored labels exclude URLs, addresses, phone numbers and
    // common identifier formats. Owner approval supplies their business meaning.
    if (label.length === 0 || label.length > 80 || !/^\p{L}[\p{L}\p{M}\p{N} _-]*$/u.test(label)
      || /\d{7}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i.test(label)
      || (label.match(/\d[\d _()-]*\d/g) ?? []).some(number => number.replace(/\D/g, '').length >= 7)
      || label.split(/[ _-]+/u).some(word => word.length > 24)
      || /\b\d+\s+\p{L}+(?:\s+\p{L}+){0,3}\s+(?:st|street|rd|road|ave|avenue|dr|drive|ln|lane|blvd|boulevard)\b/iu.test(label)) {
      throw new Error('Campaign names must be human-readable business labels without personal data.')
    }
    return label
  })
  return campaigns.filter((label, index) => campaigns.findIndex(other => other.toLowerCase() === label.toLowerCase()) === index)
}

export function visitDimensions(request: Request, input: unknown, approvedCampaigns: readonly string[] = []): VisitDimensions {
  const body = input !== null && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {}
  const metadata = (request as Request & { cf?: unknown }).cf
  const cf = metadata !== null && typeof metadata === 'object' ? metadata as Record<string, unknown> : {}
  const country = twoLetters(cf.country)
  const tagged = body.campaignTagged === true || (typeof body.campaign === 'string' && body.campaign.length > 0)
  const campaign = approvedLabel(body.campaign, approvedCampaigns) || (tagged ? 'Unapproved campaign tag' : '')
  const rawSource = typeof body.utm_source === 'string' ? body.utm_source.toLowerCase() : ''
  const campaignSource = approvedLabel(body.utm_source, approvedCampaigns)
    || (Object.hasOwn(knownVisitSources, rawSource) ? knownVisitSources[rawSource] : '')
  const rawMedium = typeof body.utm_medium === 'string' ? body.utm_medium.toLowerCase() : ''
  const medium = rawMedium ? (Object.hasOwn(visitMediums, rawMedium) ? visitMediums[rawMedium] : 'other') : ''
  const referred = referrer(body.referrerHost)
  const direct = body.referrerHost === undefined || body.referrerHost === '' || referred?.host === new URL(request.url).hostname
  let source: VisitSource = direct ? 'Direct' : referred ? sourceFor(referred.host) : 'Unknown'
  if (campaignSource) source = sources.find(([label]) => label === campaignSource)?.[1] ?? source
  if (medium) source = ({email: 'Email', social: 'Social', 'paid search': 'Search', display: 'Other website', referral: 'Other website', affiliate: 'Other website', other: 'Other website'} as Record<string, VisitSource>)[medium] ?? source
  return {
    source,
    referrer: direct ? '' : referred?.domain ?? 'Unknown',
    medium,
    campaignSource,
    device: visitDevice(request),
    country,
    region: country === 'US' ? twoLetters(cf.regionCode) : '',
    campaign,
  }
}
