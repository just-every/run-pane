// What a draft changes against the live site, page by page and paragraph by
// paragraph (by position), so the editor marks exactly what publishing changes.
import type { Page, Site } from '../model'
import { paragraphs } from '../public-view'

export type Mark = 'same' | 'changed' | 'new'
export type PageChange = { changed: boolean; title: boolean; marks: Mark[]; removed: number }

export function pageChange(draft: Page, live: Page | undefined): PageChange {
  const after = paragraphs(draft.body)
  if (!live) return { changed: false, title: false, marks: after.map(() => 'same'), removed: 0 }
  const before = paragraphs(live.body)
  const marks: Mark[] = after.map((text, index) => index >= before.length ? 'new' : text === before[index] ? 'same' : 'changed')
  const removed = Math.max(0, before.length - after.length), title = draft.title !== live.title
  return { changed: title || removed > 0 || marks.some(mark => mark !== 'same'), title, marks, removed }
}

/** Every page's change, keyed by slug; all unchanged when the draft is the live site. */
export function siteChanges(draft: Site | undefined, live: Site | undefined, same: boolean): Record<string, PageChange> {
  return Object.fromEntries((draft?.pages ?? []).map(page => [page.slug, pageChange(page, same ? page : live?.pages.find(candidate => candidate.slug === page.slug))]))
}

/** "the title and 2 paragraphs": what one page's change touches, for a sentence. */
export function changeSummary(change: PageChange): string {
  const count = change.marks.filter(mark => mark !== 'same').length + change.removed, parts = []
  if (change.title) parts.push('the title')
  if (count) parts.push(`${count} paragraph${count === 1 ? '' : 's'}`)
  return parts.join(' and ')
}
