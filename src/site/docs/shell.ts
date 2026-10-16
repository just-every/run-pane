import run from '../run.json'
import css from './style.css?raw'
import { docsHref, escapeHtml as escape, type DocsSection, type RenderedDoc } from './types'

function navigation(sections: DocsSection[], current: string): string {
  return sections.map(section => `<section class="docs-nav-group"><h2>${escape(section.title)}</h2><ul>${section.pages.map(page =>
    `<li><a href="${docsHref(page.slug)}"${page.slug === current ? ' aria-current="page"' : ''}>${escape(page.label)}</a></li>`
  ).join('')}</ul></section>`).join('')
}

export function docsDocument(page: RenderedDoc, sections: DocsSection[], previous?: RenderedDoc, next?: RenderedDoc): string {
  const nav = navigation(sections, page.slug)
  const mark = '<img src="/brand/mark.svg" width="28" height="28" alt="">'
  const toc = page.headings.length ? `<aside class="docs-toc"><nav aria-label="On this page"><h2>On this page</h2><ul>${page.headings.map(heading =>
    `<li class="depth-${heading.depth}"><a href="#${escape(heading.id)}">${escape(heading.title)}</a></li>`
  ).join('')}</ul></nav></aside>` : ''
  const pager = (doc: RenderedDoc | undefined, label: string) => doc ? `<a href="${docsHref(doc.slug)}"><span>${label}</span><strong>${escape(doc.label)}</strong></a>` : '<span></span>'
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">`
    + `<title>${escape(page.title)} · Pane docs</title><meta name="description" content="${escape(page.description)}">`
    + `<link rel="icon" href="/brand/mark.svg"><link rel="stylesheet" href="/fonts/fonts.css"><link rel="stylesheet" href="/rer-theme.css"><style>${css}</style></head>`
    + `<body class="pane-docs"><a class="docs-skip" href="#main">Skip to content</a><div class="docs-wrap">`
    + `<header class="docs-header"><a class="docs-brand" href="/">${mark}<span>Pane</span></a><nav aria-label="Site"><a href="/docs" aria-current="true">Docs</a><a href="${escape(run.repository)}">Source</a></nav></header>`
    + `<details class="docs-mobile-menu"><summary>Documentation · ${escape(page.label)}</summary><nav aria-label="Documentation">${nav}</nav></details>`
    + `<div class="docs-layout"><aside class="docs-sidebar"><nav aria-label="Documentation">${nav}</nav></aside>`
    + `<main id="main" class="docs-article"><div class="docs-eyebrow">Pane documentation</div><article>${page.html}</article>`
    + `<div class="docs-source"><a href="${escape(run.repository)}/blob/main/${escape(page.source)}">View this guide on Source ↗</a></div>`
    + `<nav class="docs-pager" aria-label="More guides">${pager(previous, 'Previous')}${pager(next, 'Next')}</nav></main>${toc}</div>`
    + `<footer class="docs-footer"><a href="/" class="docs-footer-brand">${mark}<span>Pane</span></a><span>· MIT licence ·</span><a href="${escape(run.repository)}">Source</a></footer>`
    + `</div></body></html>`
}
