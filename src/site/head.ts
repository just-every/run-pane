// The head every run-site page of Pane's own shares: icons, share card, fonts and tokens.
import { iconHead } from '../base/icon-head'
import { siteIdentity as identity } from './identity'

/** Head markup for the homepage and docs (Base's own pages render their head themselves). */
export function siteHead(title: string, description: string, styles: string[]): string {
  const esc = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  return `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(description)}">`
    + `<meta name="theme-color" content="#f5026f"><meta property="og:type" content="website"><meta property="og:site_name" content="Pane"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">`
    + `<meta property="og:image" content="${identity.runSite}/site/share.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image">`
    + iconHead
    + '<link rel="preload" href="/fonts/figtree/figtree-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>'
    + `<link rel="stylesheet" href="/fonts/fonts.css"><link rel="stylesheet" href="${identity.theme}">${styles.map(href => `<link rel="stylesheet" href="${href}">`).join('')}`
}

