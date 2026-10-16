import { posix } from 'node:path'
import { Marked, type Tokens } from 'marked'
import { docsHref, escapeHtml, type DocsPage, type Heading, type RenderedDoc } from './types'

// Markdown sources stay in the repository. Only manifest-listed documents are
// published. Raw HTML and embedded images are rejected rather than executed.
export function renderMarkdown(page: DocsPage, source: string, pages: DocsPage[], repository: string): RenderedDoc {
  const published = new Map(pages.map(value => [value.source, docsHref(value.slug)]))
  const headings: Heading[] = []
  const usedIds = new Set<string>()
  let title = '', titleCount = 0, description = ''
  const link = (href: string): string => {
    if (/^(https?:|mailto:)/i.test(href)) return href
    if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) throw new Error(`Unsafe docs link: ${href}`)
    if (href.startsWith('#')) return href
    if (href.startsWith('/')) throw new Error(`Use repository-relative links in ${page.source}: ${href}`)
    const hashAt = href.indexOf('#')
    const path = hashAt < 0 ? href : href.slice(0, hashAt)
    const hash = hashAt < 0 ? '' : href.slice(hashAt)
    const resolved = posix.normalize(posix.join(posix.dirname(page.source), decodeURIComponent(path)))
    if (resolved === '..' || resolved.startsWith('../')) throw new Error(`Docs link leaves the repository: ${href}`)
    return (published.get(resolved) ?? `${repository}/blob/main/${resolved}`) + hash
  }
  const markdown = new Marked({ gfm: true, async: false, renderer: {
    heading({ tokens, depth, text }: Tokens.Heading) {
      const plain = text.replace(/[`*_]/g, '')
      const base = plain.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-') || 'section'
      let id = base, counter = 1
      while (usedIds.has(id)) id = `${base}-${counter++}`
      usedIds.add(id)
      if (depth === 1) { title = plain; titleCount++ }
      else if (depth <= 3) headings.push({ id, title: plain, depth })
      return `<h${depth} id="${escapeHtml(id)}">${this.parser.parseInline(tokens)}</h${depth}>\n`
    },
    paragraph({ tokens, text }: Tokens.Paragraph) {
      if (!description) description = text.replace(/[`*_]/g, '').replace(/\s+/g, ' ').slice(0, 180)
      return `<p>${this.parser.parseInline(tokens)}</p>\n`
    },
    link({ href, title: label, tokens }: Tokens.Link) {
      return `<a href="${escapeHtml(link(href))}"${label ? ` title="${escapeHtml(label)}"` : ''}>${this.parser.parseInline(tokens)}</a>`
    },
    html() { throw new Error(`Raw HTML is not allowed in ${page.source}`) },
    image() { throw new Error(`Images need a declared asset pipeline: ${page.source}`) },
    code({ text, lang }: Tokens.Code) {
      return `<pre tabindex="0" role="group" aria-label="${escapeHtml(lang ? `${lang} code` : 'Code')}"><code>${escapeHtml(text)}</code></pre>\n`
    },
    table(token: Tokens.Table) {
      const head = token.header.map(cell => `<th scope="col">${this.parser.parseInline(cell.tokens)}</th>`).join('')
      const body = token.rows.map(row => `<tr>${row.map(cell => `<td>${this.parser.parseInline(cell.tokens)}</td>`).join('')}</tr>`).join('')
      return `<div class="docs-table" tabindex="0" role="region" aria-label="${escapeHtml(token.header.map(cell => cell.text).join(', '))}"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`
    },
  } })
  const html = markdown.parse(source) as string
  if (titleCount !== 1) throw new Error(`${page.source} needs exactly one level-one heading`)
  return { ...page, title, description, html, headings }
}
