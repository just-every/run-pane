import type { Page } from './model'
import { escape } from './ui/kit'

export function normalizePageLinks(value: unknown): NonNullable<Page['links']> {
 if (!Array.isArray(value)) throw Error('Provide page links as a list.')
 return value.map(link => {
  if (!link || typeof link.label !== 'string' || !link.label.trim() || link.label.length > 120 || typeof link.url !== 'string' || /[\u0000-\u0020\\]/.test(link.url)) throw Error('Each page link needs a label and a safe destination.')
  // A phone number or email address is a link the visitor taps; goals can count it.
  if (/^(?:tel:\+?[0-9][0-9().-]{5,29}|mailto:[^\s@?#]+@[^\s@?#]+\.[^\s@?#]+)$/i.test(link.url)) return {label: link.label.normalize('NFC').trim(), url: link.url}
  const url = new URL(link.url,'https://site.invalid')
  if ((!/^\/site(?:[/?#]|$)/.test(link.url) && !/^https?:\/\//.test(link.url)) || url.username || url.password || !['http:','https:'].includes(url.protocol)) throw Error('Page links use /site paths, full HTTP or HTTPS URLs, tel: numbers or mailto: addresses.')
  return {label: link.label.normalize('NFC').trim(), url: link.url}
 })
}
export function pageExtras(page: Page, enabled: boolean): string {
 return `${page.searchBox ? `<form method="get" action="/site/search" role="search" class="contact-form"><label>Search words<input type="search" name="q" maxlength="200"></label><button type="submit"${enabled ? '' : ' disabled'}>Search</button></form>` : ''}${page.links?.length ? `<ul>${page.links.map(link => `<li><a href="${escape(link.url)}">${escape(link.label)}</a></li>`).join('')}</ul>` : ''}`
}
export function pageExtraFields(page: Page): string {
 return `<details><summary>Search box and links</summary><label for="page-search-box">Show a search box</label><select id="page-search-box" name="page.${page.slug}.searchBox"><option value="no"${page.searchBox ? '' : ' selected'}>No</option><option value="yes"${page.searchBox ? ' selected' : ''}>Yes</option></select><label for="page-links">Page links</label><textarea id="page-links" name="page.${page.slug}.links" rows="3">${escape(page.links?.map(link => `${link.label} | ${link.url}`).join('\n') ?? '')}</textarea><p class="help">One link per line: Label | /site/page, Label | https://example.com, Label | tel:+13035550100 or Label | mailto:hello@example.com.</p></details>`
}
export function pageLinksFromText(text: string) {
 return normalizePageLinks(text.split(/\r?\n/).filter(line => line.trim()).map(line => {const [label,url,...extra] = line.split('|').map(part => part.trim()); if(extra.length) throw Error('Use one label and one URL per line.'); return {label,url}}))
}
