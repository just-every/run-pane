import type { Page, Site } from './model'
import { escape, icon } from './ui/kit'

export type MenuItem = { label: string; page?: string; url?: string; children?: MenuItem[]; cta?: boolean }
export type Navigation = { main: MenuItem[]; footer: MenuItem[]; details: string; headerSocials: boolean; footerSocials: boolean }
export type SocialNetwork = 'facebook' | 'instagram' | 'linkedin' | 'x' | 'youtube' | 'tiktok' | 'yelp' | 'google'
export type Socials = Partial<Record<SocialNetwork, string>>
export const socialNetworks: SocialNetwork[] = ['facebook', 'instagram', 'linkedin', 'x', 'youtube', 'tiktok', 'yelp', 'google']
export const socialNames: Record<SocialNetwork, string> = { facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn', x: 'X', youtube: 'YouTube', tiktok: 'TikTok', yelp: 'Yelp', google: 'Google Business Profile' }
type NavigationPage = Page & { hidden?: boolean }
export type NavigationSite = Pick<Site, 'name' | 'description'> & { pages: NavigationPage[]; navigation?: Navigation; socials?: Socials }

function record(value: unknown, message: string): Record<string, unknown> {
 if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(message)
 return value as Record<string, unknown>
}
function externalUrl(value: unknown): string {
 if(typeof value==='string'&&value.startsWith('/site')&&value.length<=4000&&!/[\u0000-\u001f\u007f]/.test(value)){
  const internal=new URL(value,'https://pane.invalid')
  if(internal.origin==='https://pane.invalid'&&/^\/site(?:\/|$)/.test(internal.pathname))return internal.pathname+internal.search+internal.hash
 }
 if (typeof value !== 'string' || value.length > 4000 || !/^https?:\/\//i.test(value.trim()) || /[\u0000-\u001f\u007f]/.test(value)) throw Error('Use a full HTTP or HTTPS link.')
 let url: URL
 try { url = new URL(value.trim()) } catch { throw Error('Use a full HTTP or HTTPS link.') }
 if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw Error('Use a full HTTP or HTTPS link without a username or password.')
 return url.href
}

/** Validate links at the content boundary; hidden pages never enter either menu. */
export function normalizeNavigation(value: unknown, pages: readonly NavigationPage[], filterHidden = false): Navigation {
 const input = value === undefined ? {} : record(value, 'Provide navigation menus and footer details.')
 const pageMap = new Map(pages.map(page => [page.slug, page]))
 const menu = (value: unknown, depth = 0): MenuItem[] => {
  if (!Array.isArray(value) || depth > 8) throw Error('Use a list of menu items with at most eight child levels.')
  return value.flatMap((value): MenuItem[] => {
   const item = record(value, 'Each menu item needs a label and a page, link or child menu.')
   if (typeof item.label !== 'string' || !item.label.trim() || item.label.length > 120 || /[\r\n|]/.test(item.label)) throw Error('Menu labels need 1–120 characters without line breaks or |.')
   const label = item.label.normalize('NFC').trim()
   if (item.page !== undefined && item.url !== undefined) throw Error(`Choose either a page or external link for ${label}.`)
   if (item.cta !== undefined && typeof item.cta !== 'boolean') throw Error('Menu button settings must be on or off.')
   let page: string | undefined, url: string | undefined
   if (item.page !== undefined) {
    if (typeof item.page !== 'string' || !pageMap.has(item.page)) throw Error(`Choose an existing page for ${label}.`)
    if (pageMap.get(item.page)!.deleted || (filterHidden && pageMap.get(item.page)!.hidden)) return []
    page = item.page
   }
   if (item.url !== undefined) url = externalUrl(item.url)
   const children = item.children === undefined ? [] : menu(item.children, depth + 1)
   // A group whose pages have all been hidden has no public destination.
   if (!page && !url && !children.length) {
    if (item.children !== undefined) return []
    throw Error(`Add a page, external link or child menu for ${label}.`)
   }
   if (item.cta && !page && !url) throw Error(`A menu button needs a destination: ${label}.`)
   return [{ label, ...(page ? { page } : {}), ...(url ? { url } : {}), ...(children.length ? { children } : {}), ...(item.cta ? { cta: true } : {}) }]
  })
 }
 const boolean = (name: string) => {
  if (input[name] !== undefined && typeof input[name] !== 'boolean') throw Error('Social visibility must be on or off.')
  return input[name] === true
 }
 if (input.details !== undefined && (typeof input.details !== 'string' || input.details.length > 5000)) throw Error('Footer details can contain up to 5,000 characters.')
 return {
  main: input.main === undefined ? pages.filter(page => !page.hidden && !page.deleted).map(page => ({ label: page.title, page: page.slug })) : menu(input.main),
  footer: input.footer === undefined ? [] : menu(input.footer),
  details: typeof input.details === 'string' ? input.details.normalize('NFC').trim() : '',
  headerSocials: boolean('headerSocials'), footerSocials: boolean('footerSocials'),
 }
}

export function normalizeSocials(value: unknown): Socials {
 if (value === undefined) return {}
 const input = record(value, 'Provide social profile links.')
 const result: Socials = {}
 for (const network of socialNetworks) {
  if (input[network] === undefined || input[network] === '') continue
  if (typeof input[network] === 'string' && !input[network].trim()) continue
  result[network] = externalUrl(input[network])
 }
 return result
}

const socialPaths: Record<SocialNetwork, string> = {
 facebook: '<path d="M14 21v-8h3l.5-4H14V7c0-1 .3-2 2-2h2V1.5C17 1.2 16 1 15 1c-3 0-5 2-5 5v3H7v4h3v8z"/>',
 instagram: '<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1"/>',
 linkedin: '<path d="M4 8h4v13H4zm6 0h4v2c1-2 6-3 6 3v8h-4v-7c0-3-2-3-2 0v7h-4z"/><circle cx="6" cy="4" r="2"/>',
 x: '<path d="M3 3h5l13 18h-5L3 3zm1 18L20 3" fill="none" stroke="currentColor" stroke-width="2"/>',
 youtube: '<rect x="2" y="5" width="20" height="14" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="m10 8 6 4-6 4z"/>',
 tiktok: '<path d="M13 2h4c0 3 2 5 5 5v4c-2 0-4-1-5-2v7a7 7 0 1 1-7-7v4a3 3 0 1 0 3 3z"/>',
 yelp: '<path d="m10 2 4-1v8l-2 1zm6 7 5-2 1 4-6 1zm0 5 6 1-2 4-5-3zm-4 2 2 1-1 6-4-1zm-3-4v3l-7 1v-4z"/>',
 google: '<path d="M21 12h-9m8.3-5.2A9 9 0 1 0 21 12v-1h-9" fill="none" stroke="currentColor" stroke-width="3"/>',
}
export function socialLinks(site: NavigationSite): string {
 const socials = normalizeSocials(site.socials)
 const links = socialNetworks.filter(network => socials[network]).map(network => `<a href="${escape(socials[network])}" aria-label="${socialNames[network]}" data-tip="${socialNames[network]} profile" rel="me"><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true" focusable="false">${socialPaths[network]}</svg></a>`).join('')
 return links ? `<div class="public-socials" role="group" aria-label="Social profiles">${links}</div>` : ''
}
function menuMarkup(items: MenuItem[], pageUrl: (slug: string) => string, slug?: string): string {
 if (!items.length) return ''
 const link = (item: MenuItem) => `<a href="${escape(item.page ? pageUrl(item.page) : item.url)}"${item.page && item.page === slug ? ' aria-current="page"' : ''}${item.cta ? ' class="public-menu-cta"' : ''}>${escape(item.label)}</a>`
 return `<ul class="public-menu">${items.map(item => {
  if (!item.children?.length) return `<li>${link(item)}</li>`
  const destination = item.page || item.url ? `<li>${link(item)}</li>` : ''
  const children = menuMarkup(item.children, pageUrl, slug)
  // Keep the destination separate from the summary's native toggle interaction.
  return `<li><details class="public-dropdown"><summary>${escape(item.label)}${icon('chevron')}</summary>${destination ? `<ul class="public-menu">${destination}</ul>` : ''}${children}</details></li>`
 }).join('')}</ul>`
}

/** CSS switches between desktop and native mobile details at the pane's container width. */
export function renderNavigation(site: NavigationSite, slug: string, pageUrl: (slug: string) => string): string {
 const navigation = normalizeNavigation(site.navigation, site.pages,true)
 const menu = menuMarkup([...navigation.main, {label: 'Search', url: '/site/search'}], pageUrl, slug)
 const socials = navigation.headerSocials ? socialLinks(site) : ''
 return `<div class="public-navigation"><nav class="public-menu-desktop" aria-label="Website">${menu}${socials}</nav><details class="public-menu-mobile"><summary>${icon('menu')}<span>Menu</span></summary><nav aria-label="Website">${menu}${socials}</nav></details></div>`
}

export function renderFooter(site: NavigationSite, pageUrl: (slug: string) => string): string {
 const navigation = normalizeNavigation(site.navigation, site.pages,true)
 const details = site.navigation ? navigation.details : site.description
 const menu = menuMarkup(navigation.footer, pageUrl)
 return `<footer class="public-footer"><div class="public-footer-copy"><span>${escape(site.name)}</span>${details ? `<p>${escape(details).replace(/\n/g, '<br>')}</p>` : ''}</div>${menu ? `<nav class="public-footer-menu" aria-label="Footer">${menu}</nav>` : ''}${navigation.footerSocials ? socialLinks(site) : ''}</footer>`
}
