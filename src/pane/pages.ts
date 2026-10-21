import type { Page, Site } from './model'
import type { MenuItem } from './navigation'

export const pageId = (page: Page) => page.id ?? page.slug
export const activePages = (site: Site) => site.pages.filter(page => !page.deleted)
export const homeSlug = (site: Site) => site.home ?? activePages(site).find(page => page.slug === 'home')?.slug ?? activePages(site)[0]?.slug
export const pagePath = (site: Site, slug: string) => slug === homeSlug(site) ? '/site' : '/site/' + slug.split('/').map(encodeURIComponent).join('/')
export function cleanSlug(value: unknown): string {
 if (typeof value !== 'string' || value.length > 240 || !/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(value) || ['search','visit'].includes(value.split('/')[0])) throw Error('Use a clean lowercase URL with letters, numbers, hyphens and optional folders; search and visit are reserved.')
 return value
}
export function folderName(value: unknown): string {
 if (typeof value !== 'string' || value.length > 120 || /[\u0000-\u001f]/.test(value)) throw Error('Folder names need text up to 120 characters.')
 return value.normalize('NFC').trim()
}
export function normalizePageOrganization(input: Site, pages: Page[]): Partial<Site> {
 const ids = pages.map(pageId)
 if (new Set(ids).size !== ids.length) throw Error('Every page needs a unique identity.')
 const active = pages.filter(page => !page.deleted)
 if (!active.length) throw Error('Keep at least one page in the site.')
 if (new Set(active.map(page => page.slug)).size !== active.length) throw Error('Each live page needs a unique URL.')
 for (const name of ['home','notFound'] as const) if (input[name] !== undefined && !active.some(page => page.slug === input[name])) throw Error(`Choose an existing page for ${name}.`)
 if (input.home && input.home === input.notFound) throw Error('Choose different home and not-found pages.')
 if (input.folders !== undefined && (!Array.isArray(input.folders) || input.folders.some(value => typeof value !== 'string'))) throw Error('Provide a list of folders.')
 const folders = [...new Set([...(input.folders ?? []).map(folderName), ...pages.map(page => page.folder ?? '')].filter(Boolean))]
 return {...(input.home ? {home: input.home} : {}), ...(input.notFound ? {notFound: input.notFound} : {}), ...(folders.length ? {folders} : {})}
}
/** The organizer edits stable IDs while URLs, order and folder membership change. */
export function structureFromForm(base: Site, raw: unknown): Site {
 if (raw === undefined) return base
 if (typeof raw !== 'string') throw Error('Page organization must be text.')
 const structure = JSON.parse(raw)
 if (!structure || !Array.isArray(structure.pages) || !Array.isArray(structure.folders)) throw Error('Provide pages and folders.')
 const original = new Map(base.pages.map(page => [pageId(page), page]))
 const pages: Page[] = structure.pages.map((entry: any) => {
  if (!entry || typeof entry.id !== 'string' || !entry.id || entry.id.length > 240 || typeof entry.title !== 'string' || !entry.title.trim()) throw Error('Each page needs a title and identity.')
  const old = original.get(entry.id)
  return {...(old ?? {body: entry.title}), id: entry.id, slug: cleanSlug(entry.slug), title: entry.title, folder: folderName(entry.folder ?? ''), hidden: entry.hidden === true, deleted: entry.deleted === true, ...(old?.slug === 'contact' ? {kind: 'contact' as const} : {})}
 })
 // Undoing an already-saved addition removes it from the organizer without
 // losing its body: the immutable draft keeps a recoverable deleted entry.
 for (const [id,page] of original) if (!pages.some(candidate=>pageId(candidate)===id)) pages.push({...page,deleted:true})
 const selected = (id: unknown) => id ? pages.find(page => pageId(page) === id && !page.deleted)?.slug : undefined
 const home = selected(structure.home), notFound = selected(structure.notFound)
 if (!home || (structure.notFound && !notFound)) throw Error('Choose existing active home and not-found pages.')
 const remap = new Map(base.pages.map(old => [old.slug, pages.find(page => pageId(page) === pageId(old))]))
 const menu = (items: MenuItem[]): MenuItem[] => items.flatMap(item => {
  const page = item.page ? remap.get(item.page) : undefined
  if (item.page && (!page || page.deleted)) return []
  const children = item.children ? menu(item.children) : undefined
  if (!item.page && !item.url && !children?.length) return []
  return [{...item, ...(page ? {page: page.slug} : {}), ...(children ? {children} : {})}]
 })
 return {...base, pages, home, notFound, folders: structure.folders.map(folderName), ...(base.navigation ? {navigation: {...base.navigation, main: menu(base.navigation.main), footer: menu(base.navigation.footer)}} : {})}
}

/** Offers compare the draft's identities with the current published routes. */
export function redirectOffers(site: Site, live: Site | null): NonNullable<Site['redirectOffers']> {
 if (!live) return []
 const routes = new Set(activePages(site).map(page => pagePath(site,page.slug)))
 return activePages(live).flatMap(old => {
  const page = site.pages.find(page => pageId(page) === pageId(old)), from = pagePath(live,old.slug)
  if (routes.has(from) || site.redirects?.some(redirect => redirect.from === from)) return []
  return [{from, to: page && !page.deleted ? pagePath(site,page.slug) : '/site', reason: page && !page.deleted ? 'renamed' as const : 'deleted' as const}]
 })
}
