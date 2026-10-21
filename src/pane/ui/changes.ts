// What a draft changes against the live site, page by page and paragraph by
// paragraph (by position), so the editor marks exactly what publishing changes.
import type { Page, Site } from '../model'
import { paragraphs } from '../public-view'
import { normalizeSearch } from '../search-settings'

export type Mark = 'same' | 'changed' | 'new'
export type PageChange = { changed: boolean; title: boolean; search: boolean; embed: boolean; acknowledgment: boolean; analytics: boolean; marks: Mark[]; removed: number }

export function pageChange(draft: Page, live: Page | undefined): PageChange {
  const after = paragraphs(draft.body)
  if (!live) return { changed: false, title: false, search: false, embed: false, acknowledgment: false, analytics: false, marks: after.map(() => 'same'), removed: 0 }
  const before = paragraphs(live.body)
  const marks: Mark[] = after.map((text, index) => index >= before.length ? 'new' : text === before[index] ? 'same' : 'changed')
  const removed = Math.max(0, before.length - after.length), title = draft.title !== live.title
  const search = JSON.stringify(normalizeSearch(draft.search ?? {})) !== JSON.stringify(normalizeSearch(live.search ?? {}))
  const embed = JSON.stringify(draft.embed) !== JSON.stringify(live.embed)
  const acknowledgment = JSON.stringify(draft.acknowledgment) !== JSON.stringify(live.acknowledgment)
  return { search, embed, acknowledgment, analytics: false, changed: acknowledgment || embed || search || title || removed > 0 || marks.some(mark => mark !== 'same'), title, marks, removed }
}

/** Every page's change, keyed by slug; all unchanged when the draft is the live site. */
export function siteChanges(draft: Site | undefined, live: Site | undefined, same: boolean): Record<string, PageChange> {
  return Object.fromEntries((draft?.pages ?? []).map(page => [page.slug, {...pageChange(page, same ? page : live?.pages.find(candidate => candidate.slug === page.slug)), ...(page.slug === 'home' && JSON.stringify(draft?.analyticsCampaigns ?? []) !== JSON.stringify(live?.analyticsCampaigns ?? []) ? {analytics: true, changed: true} : {})}]))
}

/** "the title and 2 paragraphs": what one page's change touches, for a sentence. */
export function changeSummary(change: PageChange): string {
  const count = change.marks.filter(mark => mark !== 'same').length + change.removed, parts = []
  if (change.analytics) parts.push('the campaign labels')
  if (change.acknowledgment) parts.push('the acknowledgment email')
  if (change.embed) parts.push('the external embed')
  if (change.search) parts.push('search settings')
  if (change.title) parts.push('the title')
  if (count) parts.push(`${count} paragraph${count === 1 ? '' : 's'}`)
  return parts.join(' and ')
}
