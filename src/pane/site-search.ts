import type { Site } from './model'
import { escape } from './ui/kit'
import { sitePath } from './search-settings'

const comparable = (value: string) => value.normalize('NFKC').replace(/\s+/g, ' ').trim().toLocaleLowerCase('en-US')

/** Search only the immutable live snapshot supplied by publicResponse. */
export function siteSearch(site: Site, query: string): string {
 const term = comparable(query)
 const invalid = query.length > 200
 const results = !term || invalid ? [] : site.pages.filter(page => comparable(`${page.title} ${page.body}`).includes(term))
 const message = invalid ? 'Enter a search up to 200 characters.' : !term ? 'Enter a word or phrase to search this website.' : results.length ? `${results.length} ${results.length === 1 ? 'page' : 'pages'} found.` : 'No pages found. Try another word or phrase.'
 return `<div class="public-site"><div class="public-shell"><header class="public-header"><a class="public-brand" href="/site">${escape(site.name)}</a><nav aria-label="Website">${site.pages.map(page => `<a href="${escape(sitePath(page.slug))}">${escape(page.title)}</a>`).join('')}<a href="/site/search" aria-current="page">Search</a></nav></header><main class="public-main" id="main"><div class="public-copy"><h1>Search this website</h1><form method="get" action="/site/search" class="contact-form" role="search"><label>Search words<input type="search" name="q" value="${escape(query.slice(0, 200))}" maxlength="200"></label><button type="submit">Search</button></form><p role="status">${message}</p>${results.length ? `<ul aria-label="Search results">${results.map(page => `<li><h2><a href="${escape(sitePath(page.slug))}">${escape(page.title)}</a></h2><p>${escape(page.body.slice(0, 160))}${page.body.length > 160 ? '…' : ''}</p></li>`).join('')}</ul>` : ''}</div></main><footer class="public-footer"><span>${escape(site.name)}</span><span>${escape(site.description)}</span></footer></div></div>`
}
