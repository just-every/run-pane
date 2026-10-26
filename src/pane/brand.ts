import type { Site } from './model'
import { normalizeImage, type ImageContent } from './images'
import { normalizeSocials } from './navigation'
import { escape } from './ui/kit'

/** Prepared branding is explicitly public; private originals never enter this object. */
type BrandImage = Pick<ImageContent, 'src' | 'width' | 'height'>
export type Brand = { logo?: BrandImage; favicon?: BrandImage; social?: BrandImage }
type BrandSite = Site & { brand?: Brand }
const imageNames = { logo: 'Logo', favicon: 'Favicon', social: 'Social image' } as const

export function normalizeBrand(value: unknown): Brand | undefined {
 if (value === undefined) return undefined
 if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Provide brand images.')
 const input = value as Record<string, unknown>, result: Brand = {}
 if (Object.keys(input).some(key => !Object.hasOwn(imageNames, key))) throw Error('Unsupported brand image.')
 for (const key of Object.keys(imageNames) as (keyof Brand)[]) {
  if (input[key] === undefined) continue
  const candidate = input[key]
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) throw Error('Choose a prepared brand image.')
  // BrandImage omits reading descriptions: the business name labels the logo.
  const image = normalizeImage({...candidate, decorative: true, alt: ''})
  result[key] = {src: image.src, width: image.width, height: image.height}
 }
 return Object.keys(result).length ? result : undefined
}

export function brandFromForm(input: Record<string, unknown>, site: BrandSite): { brand?: Brand } {
 if (input.brand === undefined) return {brand: site.brand}
 if (typeof input.brand !== 'string' || input.brand.length > 1100000) throw Error('Brand images are too large.')
 let value: unknown
 try { value = JSON.parse(input.brand) } catch { throw Error('Provide valid brand image settings.') }
 return {brand: normalizeBrand(value)}
}

export function brandHeader(site: BrandSite): string {
 const logo = normalizeBrand(site.brand)?.logo
 if (!logo) return escape(site.name)
 const scale = Math.min(1, 180 / logo.width, 56 / logo.height)
 return `<img class="public-brand-logo" src="${escape(logo.src)}" alt="${escape(site.name)}" width="${Math.max(1, Math.round(logo.width * scale))}" height="${Math.max(1, Math.round(logo.height * scale))}">`
}

export function brandSettings(site: BrandSite): string {
 const brand = normalizeBrand(site.brand) ?? {}
 return `<details class="brand-settings" data-brand-settings><summary>Brand images</summary><p>These prepared images become public when you publish. Original uploads are discarded from brand settings.</p><textarea name="brand" data-brand-state hidden>${escape(JSON.stringify(brand))}</textarea>${(Object.keys(imageNames) as (keyof Brand)[]).map(key => {
  const image = brand[key]
  return `<fieldset><legend>${imageNames[key]}</legend><label>${imageNames[key]} file<input type="file" accept="image/png,image/jpeg,image/webp" data-brand-upload="${key}"></label><div data-brand-preview="${key}">${image ? `<img src="${escape(image.src)}" alt="${imageNames[key]} preview" width="${key === 'favicon' ? 48 : 180}"${key === 'favicon' ? ' height="48"' : ''}>` : '<p>No image selected.</p>'}</div><button type="button" class="secondary small" data-brand-remove="${key}"${image ? '' : ' hidden'}>Remove ${imageNames[key].toLowerCase()}</button></fieldset>`
 }).join('')}<section aria-label="Social card preview"><h3>Social card preview</h3><div data-brand-card-image>${brand.social ? `<img src="${escape(brand.social.src)}" alt="Social card image" width="280">` : ''}</div><strong>${escape(site.name)}</strong><p>${escape(site.description)}</p></section><p data-brand-status role="status"></p></details><script type="module" src="/pane-brand.mjs"></script>`
}

export function brandHead(site: BrandSite, origin: string, pageTitle: string, description: string, canonical: string): string {
 const brand = normalizeBrand(site.brand) ?? {}, socials = Object.values(normalizeSocials(site.socials))
 const meta = (attribute: 'name' | 'property', name: string, value: string) => `<meta ${attribute}="${name}" content="${escape(value)}">`
 const asset=(key:keyof Brand)=>new URL('/site?pane-brand='+key,origin).href
 const business = {'@context': 'https://schema.org', '@type': 'LocalBusiness', name: site.name, description: site.description, url: new URL('/site', origin).href, ...(brand.logo ? {logo: asset('logo')} : {}), ...(socials.length ? {sameAs: socials} : {})}
 const json = JSON.stringify(business).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
 return (brand.favicon ? `<link rel="icon" type="image/png" href="${escape(asset('favicon'))}"><link rel="apple-touch-icon" href="${escape(asset('favicon'))}">` : '')
  + meta('property', 'og:type', 'website') + meta('property', 'og:site_name', site.name) + meta('property', 'og:title', pageTitle) + meta('property', 'og:description', description) + meta('property', 'og:url', canonical)
  + meta('name', 'twitter:card', brand.social ? 'summary_large_image' : 'summary') + meta('name', 'twitter:title', pageTitle) + meta('name', 'twitter:description', description)
  + (brand.social ? meta('property', 'og:image', asset('social')) + meta('property', 'og:image:width', String(brand.social.width)) + meta('property', 'og:image:height', String(brand.social.height)) + meta('property', 'og:image:alt', site.name) + meta('name', 'twitter:image', asset('social')) + meta('name', 'twitter:image:alt', site.name) : '')
  + `<script type="application/ld+json">${json}</script>`
}
