/// <reference types="vite/client" />
import manifest from '../../../docs/site.json'
import run from '../run.json'
import { renderMarkdown } from './markdown'
import { docsDocument } from './shell'
import type { DocsSection } from './types'

const sources = import.meta.glob<string>(['../../../README.md', '../../../docs/*.md'], {
  query: '?raw', import: 'default', eager: true,
})

export function docsPages(): { path: string; html: string }[] {
  const sections: DocsSection[] = manifest.sections
  const entries = sections.flatMap(section => section.pages)
  const slugs = new Set<string>(), paths = new Set<string>()
  for (const page of entries) {
    if (!/^(?:[a-z0-9]+(?:-[a-z0-9]+)*)?$/.test(page.slug) || slugs.has(page.slug) || paths.has(page.source)) {
      throw new Error(`Invalid or repeated docs manifest entry: ${page.source}`)
    }
    if (page.source !== 'README.md' && !/^docs\/[A-Za-z0-9_-]+\.md$/.test(page.source)) {
      throw new Error(`Public docs source is outside the allowed guide directory: ${page.source}`)
    }
    slugs.add(page.slug); paths.add(page.source)
  }
  if (!slugs.has('')) throw new Error('The docs manifest needs a /docs page')
  const pages = entries.map(page => {
    const source = sources[`../../../${page.source}`]
    if (typeof source !== 'string') throw new Error(`Missing docs source: ${page.source}`)
    return renderMarkdown(page, source, entries, run.repository)
  })
  return pages.map((page, index) => ({
    path: page.slug ? `/docs/${page.slug}` : '/docs',
    html: docsDocument(page, sections, pages, pages[index - 1], pages[index + 1]),
  }))
}
