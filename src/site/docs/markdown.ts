import { posix } from 'node:path'
import { Marked, type Tokens } from 'marked'
import { commandGroups } from '../command'
import { docsHref, escapeHtml, type DocsPage, type Heading, type RenderedDoc } from './types'

// Markdown sources stay in the repository. Only manifest-listed documents are
// published. Raw HTML and embedded images are rejected rather than executed.
// Commands and paths wrap only at spaces, never inside a token (a hyphen or slash).
const keepTokens = (html: string) => html.replace(/[^\s]+/g, word => `<span class="docs-token">${word.replace(/,(?!$)/g, ',<wbr>')}</span>`)
// An inline command keeps together and wraps only before its repository or path argument.
const isCommand = (text: string) => text.includes(' ') && !/[(),]/.test(text)

/** A guide's summary: whole sentences up to about 200 characters, or whole words and an ellipsis. */
function summarize(text: string, limit = 200): string {
  const plain = text.replace(/\s+/g, ' ').trim()
  if (plain.length <= limit) return plain
  let summary = ''
  for (const sentence of plain.match(/[^.!?]+[.!?]+(?=\s|$)/g) ?? []) {
    if ((summary + sentence).length > limit) break
    summary += sentence
  }
  if (summary) return summary.trim()
  const cut = plain.slice(0, limit + 1)
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:·–-]+$/, '') + '…'
}

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
    paragraph({ tokens }: Tokens.Paragraph) {
      // The first paragraph with words describes the page; link labels and code are read as plain text.
      const plain = tokens.every(token => token.type === 'image' || !token.raw.trim()) ? '' : this.parser.parseInline(tokens, this.parser.textRenderer)
      if (!description && plain.trim()) description = summarize(plain)
      return `<p>${this.parser.parseInline(tokens)}</p>\n`
    },
    link({ href, title: label, tokens }: Tokens.Link) {
      return `<a href="${escapeHtml(link(href))}"${label ? ` title="${escapeHtml(label)}"` : ''}>${this.parser.parseInline(tokens)}</a>`
    },
    html() { throw new Error(`Raw HTML is not allowed in ${page.source}`) },
    // The only images are the published brand files (public/brand), served at /brand.
    image({ href, text }: Tokens.Image) {
      const resolved = posix.normalize(posix.join(posix.dirname(page.source), href))
      if (!/^public\/brand\/[a-z0-9-]+\.svg$/.test(resolved)) throw new Error(`Images need a declared asset pipeline: ${page.source}`)
      return `<img class="docs-inline-mark" src="/${resolved.slice('public/'.length)}" alt="${escapeHtml(text)}" width="54" height="40">`
    },
    codespan({ text }: Tokens.Codespan) {
      if (!isCommand(text)) return `<code>${keepTokens(text)}</code>`
      return `<code>${commandGroups(text.split(' ')).map(group => `<span class="docs-cmd">${keepTokens(group.join(' '))}</span>`).join(' ')}</code>`
    },
    code({ text, lang }: Tokens.Code) {
      return `<div class="docs-code"><pre tabindex="0" role="group" aria-label="${escapeHtml(lang ? `${lang} code` : 'Code')}"><code>${keepTokens(escapeHtml(text))}</code></pre><button class="docs-copy" type="button" hidden>Copy</button></div>\n`
    },
    table(token: Tokens.Table) {
      const head = token.header.map(cell => `<th scope="col">${this.parser.parseInline(cell.tokens)}</th>`).join('')
      const body = token.rows.map(row => `<tr>${row.map(cell => `<td>${this.parser.parseInline(cell.tokens)}</td>`).join('')}</tr>`).join('')
      return `<div class="docs-table" tabindex="0" role="region" aria-label="${escapeHtml(token.header.map(cell => cell.text).join(', '))}"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`
    },
  } })
  const html = markdown.parse(source) as string
  if (titleCount !== 1) throw new Error(`${page.source} needs exactly one level-one heading`)
  return { ...page, title, description: page.summary ?? description, html, headings }
}
