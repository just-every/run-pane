// Shared pieces of the run-site homepage: eyebrows, two-line headings, ticks,
// the logo lockup and responsive pictures. Every string the page draws is HTML.

export const esc = (value: string): string => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]!))

/** Keep a token (a time, a date, a path) on one line. */
export const nb = (value: string): string => `<span class="pn-nb">${value}</span>`

export type Chip = 'lemon' | 'sky' | 'leaf' | 'blush' | 'lilac' | 'fuchsia' | 'mint' | 'teal' | 'violet'

/** The page's one eyebrow: a small brick chip, then tracked caps. */
export const eyebrow = (chip: Chip, parts: string[]): string =>
  `<p class="pn-eyebrow"><span class="pn-chip pn-chip-${chip}" aria-hidden="true"></span>${parts.map(part => `<span class="pn-nb">${part}</span>`).join('<span class="pn-dot" aria-hidden="true"> · </span>')}</p>`

/** Two-line display heading: plum ink, then fuchsia. */
export const heading = (id: string, first: string, second: string, level = 2): string =>
  `<h${level} class="pn-h" id="${id}"><span class="pn-h1">${first}</span> <span class="pn-h2">${second}</span></h${level}>`

/** The fuchsia check disc. */
export const tick = (extra = ''): string => `<span class="pn-tick${extra ? ' ' + extra : ''}" aria-hidden="true"></span>`

/** A plain ink check mark after a fact. */
export const ok = '<span class="pn-ok" aria-label="done">✓</span>'

export const arrow = '<span class="pn-arrow" aria-hidden="true">→</span>'

/** The mark and the "Pane" wordmark. `disc` sets the mark on a white disc for the fuchsia field. */
export const lockup = (disc = false): string =>
  `<a class="pn-brand${disc ? ' pn-brand-disc' : ''}" href="/" aria-label="Pane home"><span class="pn-brand-mark"><img src="/brand/mark.svg" width="54" height="40" alt=""></span><span class="pn-brand-word">Pane</span></a>`

/** An AVIF/WebP picture of one of the site's art files in public/site. */
export function picture(name: string, alt: string, width: number, height: number, options: { widths?: number[]; sizes?: string; className?: string; eager?: boolean } = {}): string {
  const { widths, sizes = '100vw', className = '', eager = false } = options
  const set = (type: string) => widths ? widths.map(w => `/site/${name}-${w}.${type} ${w}w`).join(', ') : `/site/${name}.${type}`
  const src = widths ? `/site/${name}-${widths[widths.length - 1]}.webp` : `/site/${name}.webp`
  const sizeAttr = widths ? ` sizes="${sizes}"` : ''
  return `<picture${className ? ` class="${className}"` : ''}><source type="image/avif" srcset="${set('avif')}"${sizeAttr}><source type="image/webp" srcset="${set('webp')}"${sizeAttr}>`
    + `<img src="${src}" width="${width}" height="${height}" alt="${esc(alt)}"${eager ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"'}></picture>`
}

export const actions = (onField: boolean): string =>
  `<div class="pn-actions${onField ? ' pn-actions-field' : ''}"><a class="pn-run" href="/run">Run Pane <span aria-hidden="true">→</span></a>`
  + `${onField ? '<a class="pn-link" href="https://demo.run-pane.com/">Try the demo</a>' : ''}<a class="pn-link" href="/docs">Read the docs</a></div>`
