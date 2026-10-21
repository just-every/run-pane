import type { Site } from './model'
import { escape } from './ui/kit'
import { activePages, pagePath } from './pages'

type Warning = { field: 'title' | 'description' | 'noindex'; message: string }
const comparable = (value: string) => value.normalize('NFKC').replace(/\s+/g, ' ').trim().toLocaleLowerCase('en-US')

/** Check the effective metadata, including the same defaults as live output. */
export function searchChecks(site: Site): { slug: string; title: string; warnings: Warning[] }[] {
 const metadata = activePages(site).map(page => ({
  page, title: page.search?.title || site.name, description: page.search?.description || site.description,
 }))
 return metadata.map(({page, title, description}) => {
  const warnings: Warning[] = []
  for (const [field, value] of [['title', title], ['description', description]] as const) {
   if (!comparable(value)) warnings.push({field, message: `Missing search ${field}.`})
   else {
    const others = metadata.filter(other => other.page.slug !== page.slug && comparable(other[field]) === comparable(value))
    if (others.length) warnings.push({field, message: `Shares its search ${field} with ${others.map(other => pagePath(site,other.page.slug)).join(', ')}.`})
   }
  }
  if (page.search?.noindex) warnings.push({field: 'noindex', message: 'Excluded from search results. Review whether this is intentional.'})
  return {slug: page.slug, title: page.title, warnings}
 })
}

export function searchCheckView(site: Site): string {
 const pages = searchChecks(site).filter(page => page.warnings.length)
 return `<section class="card search-checks" aria-label="Search checks"><h2>Search checks</h2><p>Review this draft before publishing. These checks cover search titles, descriptions and pages excluded from indexing.</p>${pages.length ? pages.map(page => `<div><h3>${escape(page.title)} <small>${escape(pagePath(site,page.slug))}</small></h3><ul>${page.warnings.map(warning => `<li>${escape(warning.message)} <a href="/app/search#search-${encodeURIComponent(page.slug)}-${warning.field}">Review ${warning.field === 'noindex' ? 'indexing' : 'search ' + warning.field} for ${escape(page.title)}</a></li>`).join('')}</ul></div>`).join('') : '<p>No title, description or indexing warnings in this draft.</p>'}</section>`
}
