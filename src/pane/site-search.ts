import { activePages, pagePath } from './pages'
import { renderNavigation, renderFooter } from './navigation'
import type { Site } from './model'
import { escape } from './ui/kit'

const comparable = (value: string) => value.normalize('NFKC').replace(/\s+/g, ' ').trim().toLocaleLowerCase('en-US')

/** Search only the immutable live snapshot supplied by publicResponse. */
export function siteSearch(site: Site, query: string): string {
 const term = comparable(query)
 const invalid = query.length > 200
 const results = !term || invalid ? [] : activePages(site).filter(page => !page.hidden && page.slug !== site.notFound && comparable(`${page.title} ${page.body}`).includes(term))
 const message = invalid ? 'Enter a search up to 200 characters.' : !term ? 'Enter a word or phrase to search this website.' : results.length ? `${results.length} ${results.length === 1 ? 'page' : 'pages'} found.` : 'No pages found. Try another word or phrase.'
 return `<div class="public-site"><div class="public-shell"><header class="public-header"><a class="public-brand" href="/site">${escape(site.name)}</a>${renderNavigation(site,'search',slug=>pagePath(site,slug))}</header><main class="public-main" id="main"><div class="public-copy"><h1>Search this website</h1><form method="get" action="/site/search" class="contact-form" role="search"><label>Search words<input type="search" name="q" value="${escape(query.slice(0, 200))}" maxlength="200"></label><button type="submit">Search</button></form><p role="status">${message}</p>${results.length ? `<ul aria-label="Search results">${results.map(page => `<li><h2><a href="${escape(pagePath(site,page.slug))}">${escape(page.title)}</a></h2><p>${escape(page.body.slice(0, 160))}${page.body.length > 160 ? '…' : ''}</p></li>`).join('')}</ul>` : ''}</div></main>${renderFooter(site,slug=>pagePath(site,slug))}</div></div>`
}
