// 13 · Closing: "Every site, its own." over an ink-line map of the lower 48
// (public/site/us-map.svg: us-atlas states with Natural Earth's Great Lakes,
// Albers projection, 1200 x 760) with five pins at the real cities, then the footer.
import { actions, esc, lockup, nb, ok, tick } from './parts'

// Pin positions in the map's 1200 x 760 projection (San Antonio, Albuquerque,
// Asheville, Chicago, Portsmouth NH), and each card's offset from its pin.
const pins: [key: string, name: string, line: string, x: number, y: number][] = [
  ['hollis', 'Hollis &amp; Pine Florist', `${nb('Mon Nov 2')} · Squarespace closed ${ok}`, 1125.7, 181.1],
  ['kim', 'Kim Law', `October · 38 requests · 0 unanswered`, 787.7, 275.9],
  ['delgado', 'Delgado Plumbing', `October · 87 quote requests · 0 unanswered`, 368.7, 464],
  ['brightside', 'Brightside Yoga', `${nb('Sat Nov 7')} · ${nb('9:00 AM')} · 16 of 16 booked`, 918.5, 441.4],
  ['ortega', 'Ortega Bakery', `${nb('Thu Nov 26')} · closed for Thanksgiving · hours updated ${ok}`, 551.3, 637.8],
]

export function closing(): string {
  const pct = (value: number, of: number) => `${(value / of * 100).toFixed(2)}%`
  return `<section class="pn-close" aria-labelledby="pn-close-title">
  <div class="pn-wrap pn-center">
    <h2 class="pn-h pn-h-close" id="pn-close-title"><span class="pn-h1">Every site</span> <span class="pn-h2">its own.</span></h2>
    <p class="pn-close-sub">100% free and open source. MIT licensed.</p>
    ${actions(false)}
  </div>
  <div class="pn-map">
    <img class="pn-map-art" src="/site/us-map.svg" width="1200" height="760" alt="Map of the United States with the five businesses' towns pinned." loading="lazy" decoding="async">
    ${pins.map(([key, name, line, x, y]) => `<div class="pn-pin pn-pin-${key}" style="--x:${pct(x, 1200)};--y:${pct(y, 760)}"><span class="pn-pin-dot" aria-hidden="true"></span><div class="pn-pin-card"><p class="pn-pin-head">${tick('pn-tick-sm')}${name}</p><p>${line}</p></div></div>`).join('')}
    <img class="pn-map-mark" src="/brand/mark.svg" width="136" height="100" alt="" loading="lazy">
  </div>
  <ul class="pn-map-legend" aria-label="The five businesses in November">${pins.map(([key, name, line]) => `<li class="pn-pin-${key}"><div class="pn-pin-card"><p class="pn-pin-head">${tick('pn-tick-sm')}${name}</p><p>${line}</p></div></li>`).join('')}</ul>
</section>`
}

export function footer(source: string): string {
  return `<footer class="pn-footer"><div class="pn-wrap pn-footer-row">${lockup()}<p class="pn-footer-tag">Free, open source website builder</p><nav aria-label="Footer"><a href="/docs">Docs</a><a href="${esc(source)}">Source</a><a href="${esc(source)}/blob/main/LICENSE">MIT licensed</a></nav></div></footer>`
}
