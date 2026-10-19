import { siteHead } from '../head'
import run from '../run.json'
import css from './style.css?raw'
import { docsHref, escapeHtml as escape, type DocsSection, type RenderedDoc } from './types'

// Code cards get their Copy button only when script runs; without it the command is still there to select.
const COPY = "document.querySelectorAll('.docs-copy').forEach(b=>{b.hidden=false;b.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(b.closest('.docs-code').querySelector('code').textContent);b.textContent='Copied';setTimeout(()=>{b.textContent='Copy'},1600)}catch{}})})"
const CHIPS = ['lemon', 'sky', 'leaf', 'blush', 'lilac']

function navigation(sections: DocsSection[], current: string): string {
  return sections.map(section => `<section class="docs-nav-group"><h2>${escape(section.title)}</h2><ul>${section.pages.map(page =>
    `<li><a href="${docsHref(page.slug)}"${page.slug === current ? ' aria-current="page"' : ''}>${escape(page.label)}</a></li>`
  ).join('')}</ul></section>`).join('')
}

const lockup = '<a class="docs-brand" href="/"><img src="/brand/mark.svg" width="54" height="40" alt=""><span>Pane</span></a>'

/** The guide index on /docs: one card per guide, in manifest order. */
function guideCards(sections: DocsSection[], pages: RenderedDoc[]): string {
  const bySlug = new Map(pages.map(page => [page.slug, page]))
  return `<nav class="docs-cards" aria-label="Guides">${sections.map((section, index) => `<section class="docs-card-group"><h2><span class="docs-chip docs-chip-${CHIPS[index % CHIPS.length]}" aria-hidden="true"></span>${escape(section.title)}</h2><ul>`
    + section.pages.filter(page => page.slug).map(page => `<li><a href="${docsHref(page.slug)}"><strong>${escape(page.label)}</strong><span>${escape(bySlug.get(page.slug)?.description ?? '')}</span></a></li>`).join('')
    + '</ul></section>').join('')}</nav>`
}

/** /docs opens with the overview's title and first paragraphs, then the guide cards; the rest of the README follows them. */
function indexBody(page: RenderedDoc, sections: DocsSection[], pages: RenderedDoc[]): string {
  const split = page.html.indexOf('<h2')
  const intro = split < 0 ? page.html : page.html.slice(0, split)
  const rest = split < 0 ? '' : page.html.slice(split)
  return `<article>${intro}</article>${guideCards(sections, pages)}`
    + (rest ? `<article class="docs-readme"><div class="docs-eyebrow docs-readme-label">From the README</div>${rest}</article>` : '')
}

export function docsDocument(page: RenderedDoc, sections: DocsSection[], pages: RenderedDoc[], previous?: RenderedDoc, next?: RenderedDoc): string {
  const nav = navigation(sections, page.slug)
  const section = sections.find(group => group.pages.some(entry => entry.slug === page.slug))
  const chip = CHIPS[Math.max(0, sections.indexOf(section!)) % CHIPS.length]
  const toc = page.headings.length ? `<aside class="docs-toc"><nav aria-label="On this page"><h2>On this page</h2><ul>${page.headings.map(heading =>
    `<li class="depth-${heading.depth}"><a href="#${escape(heading.id)}">${escape(heading.title)}</a></li>`
  ).join('')}</ul></nav></aside>` : ''
  const pager = (doc: RenderedDoc | undefined, label: string) => doc ? `<a href="${docsHref(doc.slug)}"><span>${label}</span><strong>${escape(doc.label)}</strong></a>` : '<span></span>'
  const body = page.slug === '' ? indexBody(page, sections, pages) : `<article>${page.html}</article>`
  return `<!doctype html><html lang="en"><head>${siteHead(`${page.title} · Pane docs`, page.description, [])}<style>${css}</style></head>`
    + `<body class="pane-docs"><a class="docs-skip" href="#main">Skip to content</a>`
    + `<header class="docs-header"><div class="docs-wrap docs-header-row">${lockup}<nav aria-label="Site"><a href="/docs" aria-current="true">Docs</a><a href="/contract">Contract</a><a href="${escape(run.repository)}">Source</a></nav></div></header>`
    + `<div class="docs-wrap"><details class="docs-mobile-menu"><summary>Documentation · ${escape(page.label)}</summary><nav aria-label="Documentation">${nav}</nav></details>`
    + `<div class="docs-layout"><aside class="docs-sidebar"><nav aria-label="Documentation">${nav}</nav></aside>`
    + `<main id="main" class="docs-article"><p class="docs-eyebrow"><span class="docs-chip docs-chip-${chip}" aria-hidden="true"></span>${escape(section?.title ?? 'Pane documentation')}</p>${body}`
    + `<div class="docs-source"><a href="${escape(run.repository)}/blob/main/${escape(page.source)}">View this guide on Source ↗</a></div>`
    + `<nav class="docs-pager" aria-label="More guides">${pager(previous, 'Previous')}${pager(next, 'Next')}</nav></main>${toc}</div></div>`
    + `<footer class="docs-footer"><div class="docs-wrap docs-footer-row">${lockup}<p>Free, open source website builder</p><nav aria-label="Footer"><a href="/docs">Docs</a><a href="${escape(run.repository)}">Source</a><a href="${escape(run.repository)}/blob/main/LICENSE">MIT licensed</a></nav></div></footer>`
    + `<script>${COPY}</script></body></html>`
}
