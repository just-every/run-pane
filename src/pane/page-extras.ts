import {pageReference,referenceUrl} from './page-link-references'
import {activePages,pageId} from './pages'
import type { Site, Page } from './model'
import { escape } from './ui/kit'

export function normalizePageLinks(value: unknown): NonNullable<Page['links']> {
 if (!Array.isArray(value)) throw Error('Provide page links as a list.')
 return value.map(link => {
  if (!link || typeof link.label !== 'string' || !link.label.trim() || link.label.length > 120 || typeof link.url !== 'string' || /[\u0000-\u0020\\]/.test(link.url)) throw Error('Each page link needs a label and a safe destination.')
  // A phone number or email address is a link the visitor taps; goals can count it.
  if (/^(?:tel:\+?[0-9][0-9().-]{5,29}|mailto:[^\s@?#]+@[^\s@?#]+\.[^\s@?#]+)$/i.test(link.url)) return {label: link.label.normalize('NFC').trim(), url: link.url}
  if(pageReference(link.url)!==undefined)return {label:link.label.normalize('NFC').trim(),url:link.url}
  const url = new URL(link.url,'https://site.invalid')
  if ((!/^\/site(?:[/?#]|$)/.test(link.url) && !/^https?:\/\//.test(link.url)) || url.username || url.password || !['http:','https:'].includes(url.protocol)) throw Error('Page links use /site paths, full HTTP or HTTPS URLs, tel: numbers or mailto: addresses.')
  return {label: link.label.normalize('NFC').trim(), url: link.url}
 })
}
export function pageExtras(page: Page, enabled: boolean,site:Site): string {
 return `${page.searchBox ? `<form method="get" action="/site/search" role="search" class="contact-form"><label>Search words<input type="search" name="q" maxlength="200"></label><button type="submit"${enabled ? '' : ' disabled'}>Search</button></form>` : ''}${page.links?.length ? `<ul>${page.links.map(link => {const url=referenceUrl(site,link.url);return `<li>${url?`<a href="${escape(url)}">${escape(link.label)}</a>`:`<span>${escape(link.label)} (page unavailable)</span>`}</li>`}).join('')}</ul>` : ''}`
}
export function pageExtraFields(page: Page,site:Site): string {
 return `<details><summary>Search box and links</summary><label for="page-search-box">Show a search box</label><select id="page-search-box" name="page.${page.slug}.searchBox"><option value="no"${page.searchBox ? '' : ' selected'}>No</option><option value="yes"${page.searchBox ? ' selected' : ''}>Yes</option></select><div data-page-link-picker><label>Link label<input data-page-link-label maxlength="120"></label><label for="page-link-target">Link to page</label><select id="page-link-target" data-page-link-target>${activePages(site).map(target=>`<option value="page:${escape(encodeURIComponent(pageId(target)))}">${escape(target.title)}</option>`).join('')}</select><button type="button" class="secondary" data-add-page-link>Add page link</button></div><label for="page-links">Page links</label><textarea id="page-links" name="page.${page.slug}.links" rows="3">${escape(page.links?.map(link => `${link.label} | ${link.url}`).join('\n') ?? '')}</textarea><p class="help">Page links added with the picker follow URL changes. Other links use one line each: Label | /site/page, Label | https://example.com, Label | tel:+13035550100 or Label | mailto:hello@example.com.</p></details><script type="module" src="/pane-page-links.mjs"></script>`
}
export function pageLinksFromText(text: string) {
 return normalizePageLinks(text.split(/\r?\n/).filter(line => line.trim()).map(line => {const [label,url,...extra] = line.split('|').map(part => part.trim()); if(extra.length) throw Error('Use one label and one URL per line.'); return {label,url}}))
}
