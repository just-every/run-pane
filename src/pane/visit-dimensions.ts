export type VisitSource = 'Direct' | 'Google' | 'Bing' | 'DuckDuckGo' | 'Facebook' | 'Instagram' | 'LinkedIn' | 'Other website' | 'Unknown'
export type VisitDevice = 'phone' | 'tablet' | 'desktop' | 'unknown'
export type VisitDimensions = {
  source: VisitSource
  device: VisitDevice
  country: string
  region: string
  campaign: string
}

const sourceHosts: readonly [VisitSource, readonly string[]][] = [
  ['Google', ['google.com', 'google.co.uk', 'google.com.au', 'google.ca', 'google.de', 'google.fr']],
  ['Bing', ['bing.com']],
  ['DuckDuckGo', ['duckduckgo.com']],
  ['Facebook', ['facebook.com', 'fb.com']],
  ['Instagram', ['instagram.com']],
  ['LinkedIn', ['linkedin.com']],
]

function visitSource(value: unknown): VisitSource {
  if (value === undefined || value === '') return 'Direct'
  // Accept only a hostname. Invalid inputs and unknown domains are never retained.
  if (typeof value !== 'string' || value.length > 253) return 'Unknown'
  const host = value.toLowerCase()
  if (!host.includes('.') || !host.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) return 'Unknown'
  for (const [source, hosts] of sourceHosts) {
    if (hosts.some(domain => host === domain || host.endsWith(`.${domain}`))) return source
  }
  return 'Other website'
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
  return [...new Set(campaigns)]
}

export function visitDimensions(request: Request, input: unknown, approvedCampaigns: readonly string[] = []): VisitDimensions {
  const body = input !== null && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {}
  const metadata = (request as Request & { cf?: unknown }).cf
  const cf = metadata !== null && typeof metadata === 'object' ? metadata as Record<string, unknown> : {}
  const country = twoLetters(cf.country)
  // This list comes from owner-approved site configuration, never from a visitor.
  // Syntax alone cannot distinguish a campaign label from a personal identifier.
  const campaign = typeof body.campaign === 'string' && body.campaign.length > 0 && body.campaign.length <= 80
    && !/[\u0000-\u001f\u007f-\u009f]/.test(body.campaign) && approvedCampaigns.includes(body.campaign)
    ? body.campaign : ''
  return {
    source: body.referrerHost === new URL(request.url).hostname ? 'Direct' : visitSource(body.referrerHost),
    device: visitDevice(request),
    country,
    region: country === 'US' ? twoLetters(cf.regionCode) : '',
    campaign,
  }
}
